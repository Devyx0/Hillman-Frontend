/** Paramètres → Import Logicia (PDF item 12, admin only): import status, errors, re-run. */
import { useState } from 'react'
import { CircleCheck, DatabaseZap, FileText, LoaderCircle, RefreshCw, TriangleAlert, Users, X } from 'lucide-react'
import { Badge, Card, Empty, Stat } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { confirmAction } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { num, pct } from '../../../lib/utils'
import { locale, t } from '../../../i18n'
import { LOGICIA_IMPORT, dismissImportError, logChange, rerunImport, type ImportError } from './data'

const KIND_LABEL: Record<ImportError['kind'], string> = { client: 'Client', soumission: 'Soumission', pdf: 'PDF' }

export function LogiciaTab() {
  useStore()
  const { user } = useAuth()
  const [kind, setKind] = useState<'all' | ImportError['kind']>('all')
  const imp = LOGICIA_IMPORT
  const running = imp.status === 'en_cours'
  const errors = imp.errors.filter((e) => kind === 'all' || e.kind === kind)
  const when = new Date(imp.lastRun.replace(' ', 'T')).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' })

  const run = async () => {
    const ok = await confirmAction({ title: t("Relancer l'import Logicia?"), body: t("Les fiches déjà importées ne sont pas dupliquées : seules les nouvelles et celles en erreur sont retraitées. Comptez quelques minutes.") })
    if (!ok) return
    logChange(user?.name ?? '—', 'parametres', "A relancé l'import Logicia", {})
    rerunImport(() => toast(t('Import Logicia terminé')))
  }

  const stats = [
    { key: 'clients', label: 'Clients', icon: Users },
    { key: 'quotes', label: 'Soumissions', icon: FileText },
    { key: 'pdfs', label: 'PDF', icon: FileText },
  ] as const

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="w-10 h-10 rounded-lg bg-sand flex items-center justify-center shrink-0">
            <DatabaseZap className="w-5 h-5 text-ink-mute" />
          </span>
          <div className="flex-1 min-w-[12rem]">
            <p className="text-sm font-semibold text-ink flex items-center gap-2">
              {t('Import depuis Logicia')}
              {running ? (
                <Badge tone="info" dot>
                  {t('En cours')}
                </Badge>
              ) : imp.errors.length ? (
                <Badge tone="warn" dot>
                  {t('Terminé avec erreurs')}
                </Badge>
              ) : (
                <Badge tone="good" dot>
                  {t('Terminé')}
                </Badge>
              )}
            </p>
            <p className="text-xs text-ink-mute">{t('Dernière exécution : {d}', { d: when })}</p>
          </div>
          <button className="btn btn-sm btn-primary" disabled={running} onClick={run}>
            {running ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t("Relancer l'import")}
          </button>
        </div>
        {running && (
          <div className="mt-4" role="progressbar" aria-valuenow={imp.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 rounded-full bg-sand overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${imp.progress}%` }} />
            </div>
            <p className="text-xs text-ink-mute mt-1 tnum">{t('{n} traité', { n: pct(imp.progress) })}</p>
          </div>
        )}
      </Card>
      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Stat key={s.key} label={t(s.label)} icon={s.icon} value={num(imp.counts[s.key])} sub={t('sur {n} dans Logicia · {p}', { n: num(imp.totals[s.key]), p: pct((imp.counts[s.key] / imp.totals[s.key]) * 100, 1) })} />
        ))}
      </div>
      <Card
        title={t('Erreurs ({n})', { n: imp.errors.length })}
        icon={TriangleAlert}
        pad={false}
        actions={
          <Select<'all' | ImportError['kind']>
            value={kind}
            onChange={setKind}
            searchable={false}
            className="w-36"
            options={[{ value: 'all', label: t('Tous les types') }, ...(Object.keys(KIND_LABEL) as ImportError['kind'][]).map((k) => ({ value: k, label: t(KIND_LABEL[k]) }))]}
          />
        }
      >
        {errors.length === 0 ? (
          <Empty icon={CircleCheck} title={t('Aucune erreur')}>
            {t('Toutes les fiches de ce type ont été importées.')}
          </Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {errors.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <Badge tone={e.kind === 'pdf' ? 'neutral' : 'warn'}>{t(KIND_LABEL[e.kind])}</Badge>
                <span className="font-semibold text-ink tnum">{e.record}</span>
                <span className="text-ink-mute flex-1 min-w-[12rem]">{t(e.reason)}</span>
                <button
                  className="p-1.5 rounded-md hover:bg-stone"
                  aria-label={t('Ignorer cette erreur')}
                  title={t('Ignorer cette erreur')}
                  onClick={async () => {
                    if (await confirmAction({ title: t('Ignorer cette erreur?'), body: t('{r} ne sera pas importé.', { r: e.record }), confirmLabel: t('Ignorer') })) dismissImportError(e.id)
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
