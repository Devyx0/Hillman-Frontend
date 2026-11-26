/**
 * Paramètres → Numérotation with the backend. One quote number sequence for the whole group
 * (GET / PUT /settings/quote-numbering; changing it: admin of every company, above the highest number used); each
 * company prints its prefix before the number (quote_prefix, PATCH /companies/:id/settings; admin of that company).
 */
import { useEffect, useState } from 'react'
import { Hash, ListOrdered, LoaderCircle } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { ApiError, errorMessage } from '../../../api/http'
import type { QuoteNumbering } from '../../../api/types'
import { Card, Field } from '../../../components/ui'
import { ErrorState, Loading, Notice } from '../../../components/states'
import { REF, applyCompanySettings, companyUuid, roleIn } from '../../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { t } from '../../../i18n'
import { Intro } from './shared'

/** Same bounds as the API (quoteNumberingBody). */
const MAX_NUMBER = 2_000_000_000

type Load = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; numbering: QuoteNumbering }

export function ApiNumberingTab() {
  useStore()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const mine = COMPANIES.filter((c) => roleIn(c.id) && companyUuid(c.id))
  // The server checks every active company; the app knows the user's companies (the ones they can see).
  const groupAdmin = REF.companies.length > 0 && REF.companies.every((c) => roleIn(c.slug) === 'admin')

  useEffect(() => {
    let live = true
    api.getQuoteNumbering().then(
      (numbering) => live && setLoad({ status: 'ready', numbering }),
      (e) => live && setLoad({ status: 'error', error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [attempt])

  return (
    <div className="space-y-4">
      <Intro>{t('Une seule série de numéros pour le groupe : chaque compagnie imprime son préfixe devant le numéro (H64320, G64321). Le prochain numéro doit être supérieur au plus haut numéro déjà utilisé.')}</Intro>
      {load.status === 'loading' && <Loading />}
      {load.status === 'error' && <ErrorState onRetry={() => (setLoad({ status: 'loading' }), setAttempt((n) => n + 1))}>{load.error}</ErrorState>}
      {load.status === 'ready' && (
        <>
          <NextNumberCard key={load.numbering.next_number} numbering={load.numbering} canEdit={groupAdmin} onSaved={(numbering) => setLoad({ status: 'ready', numbering })} />
          <div className="grid md:grid-cols-3 gap-4">
            {mine.map((c) => (
              <PrefixCard key={c.id} company={c.id} next={load.numbering.next_number} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NextNumberCard({ numbering, canEdit, onSaved }: { numbering: QuoteNumbering; canEdit: boolean; onSaved: (n: QuoteNumbering) => void }) {
  const [next, setNext] = useState(String(numbering.next_number))
  const [saving, setSaving] = useState(false)
  const highest = numbering.highest_used ?? 0
  const n = Number(next)
  const error = !next || !Number.isInteger(n) || n < 1 || n > MAX_NUMBER ? t('Nombre entier positif') : n <= highest ? t('Doit être supérieur à {n} (déjà utilisé)', { n: highest }) : ''
  const dirty = n !== numbering.next_number

  const save = async () => {
    setSaving(true)
    try {
      onSaved(await api.setQuoteNumbering(n))
      toast(t('Numérotation enregistrée'))
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        // Another quote took a number meanwhile: reload the highest used and say which one.
        try {
          const fresh = await api.getQuoteNumbering()
          toast(t('Doit être supérieur à {n} (déjà utilisé)', { n: fresh.highest_used ?? 0 }))
          onSaved(fresh)
        } catch {
          toast(errorMessage(e))
        }
      } else toast(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title={t('Prochain numéro de soumission')} icon={ListOrdered}>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('Prochain numéro')} className="w-48">
          <input className="form-input tnum" inputMode="numeric" value={next} onChange={(e) => setNext(e.target.value.replace(/\D/g, ''))} disabled={!canEdit} aria-invalid={canEdit && !!error} />
        </Field>
        <p className="text-sm text-ink-mute pb-2">{numbering.highest_used === null ? t('Aucun numéro utilisé pour l’instant.') : t('Plus haut numéro utilisé : {n}', { n: numbering.highest_used })}</p>
        {canEdit && (
          <button className="btn btn-sm btn-primary ml-auto" disabled={!dirty || !!error || saving} onClick={() => void save()}>
            {saving && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {t('Enregistrer')}
          </button>
        )}
      </div>
      {canEdit && error && (
        <div className="mt-3">
          <Notice tone="critical">{error}</Notice>
        </div>
      )}
      {!canEdit && <p className="text-2xs text-ink-mute mt-2">{t('La numérotation est partagée par les compagnies : réservée aux administrateurs de toutes les compagnies.')}</p>}
    </Card>
  )
}

function PrefixCard({ company, next }: { company: CompanyId; next: number }) {
  const current = REF.companies.find((c) => c.slug === company)?.quote_prefix ?? ''
  const [prefix, setPrefix] = useState(current)
  const [saving, setSaving] = useState(false)
  const canEdit = roleIn(company) === 'admin'
  const p = prefix.trim().toUpperCase()
  // Same rule as the API: 1 to 3 letters, or none.
  const error = p && !/^[A-Z]{1,3}$/.test(p) ? t('Préfixe : 1 à 3 lettres.') : ''
  const dirty = p !== current
  const name = COMPANIES.find((c) => c.id === company)!.name

  const save = async () => {
    setSaving(true)
    try {
      const s = await api.updateCompanySettings(companyUuid(company)!, { quote_prefix: p || null })
      applyCompanySettings(s)
      setPrefix(s.quote_prefix ?? '')
      toast(t('Numérotation enregistrée'))
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card title={name} icon={Hash}>
      <div className="space-y-3">
        <Field label={t('Préfixe')}>
          <input className="form-input uppercase w-24" maxLength={3} value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} disabled={!canEdit} aria-invalid={!!error} />
        </Field>
        <div className="rounded-lg bg-sand/70 px-3 py-2.5">
          <p className="label-caps">{t('Aperçu')}</p>
          <p className="text-xl font-semibold tnum text-ink mt-0.5">{error ? '—' : `${p}${next}`}</p>
          <p className="text-2xs text-ink-mute">{t('Le numéro suit la série du groupe.')}</p>
        </div>
        {error && <Notice tone="critical">{error}</Notice>}
        {canEdit ? (
          <button className="btn btn-sm btn-primary w-full" disabled={!dirty || !!error || saving} onClick={() => void save()}>
            {saving && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {t('Enregistrer')}
          </button>
        ) : (
          <p className="text-2xs text-ink-mute">{t('Seul un administrateur de la compagnie peut modifier ses paramètres.')}</p>
        )}
      </div>
    </Card>
  )
}
