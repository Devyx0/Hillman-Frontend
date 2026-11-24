/**
 * Quote editor sections in API mode. Each section edits one part of the quote through its endpoint and shows
 * the server's answer: Infos (PATCH /quotes/:id), Obligations (PUT /obligations), Travaux (scope items),
 * Expertises, Garanties, Coûtants (cost lines), Prix (base price, discount, "=", add-ons) and Notes.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Equal, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import * as api from '../../../api/endpoints'
import { toNum } from '../../../api/mappers'
import type { ApiQuote, CatalogueScopeItem, ExpertiseStatus, ObligationForm } from '../../../api/types'
import { BuilderSection } from '../../../components/quote-shared'
import { Field } from '../../../components/ui'
import { REF, repsOf } from '../../../data/api-sync'
import { t } from '../../../i18n'
import { toast } from '../../../lib/toast'
import { cn, money, pct } from '../../../lib/utils'
import { editable, htmlToText, parseMoney, parseQty, textToHtml, type ApiQuoteState } from './useApiQuote'

type S = ApiQuoteState & { quote: ApiQuote }

/**
 * Form state that follows the server: while the user has not changed anything, a new server value replaces it;
 * once edited, it is kept until saved or reset.
 */
function useSynced<T>(source: T) {
  const key = JSON.stringify(source)
  const [base, setBase] = useState<{ key: string; value: T }>({ key, value: source })
  const [value, setValue] = useState<T>(source)
  if (base.key !== key) {
    if (JSON.stringify(value) === base.key) setValue(source)
    setBase({ key, value: source })
  }
  const dirty = JSON.stringify(value) !== base.key
  return { value, setValue, dirty, reset: () => setValue(base.value) }
}

function SaveBar({ dirty, busy, onSave, onReset }: { dirty: boolean; busy?: boolean; onSave: () => void; onReset: () => void }) {
  if (!dirty) return null
  return (
    <div className="flex justify-end gap-2 pt-3">
      <button type="button" className="btn btn-sm btn-ghost" onClick={onReset} disabled={busy}>
        {t('Annuler')}
      </button>
      <button type="button" className="btn btn-sm btn-primary" onClick={onSave} disabled={busy}>
        <Check className="w-4 h-4" />
        {t('Enregistrer')}
      </button>
    </div>
  )
}

const nz = (s: string) => (s.trim() ? s.trim() : null)

// ── Infos ────────────────────────────────────────────────────────────────────
export function ApiInfosSection({ s }: { s: S }) {
  const { quote, company, isRep, run } = s
  const reps = repsOf(company)
  const toForm = (q: ApiQuote) => ({
    assigned_user_id: q.assigned_user_id ?? '',
    source_id: q.source_id,
    quote_date: q.quote_date,
    work_summary: q.work_summary ?? '',
    site_civic_number: q.site_civic_number ?? '',
    site_street: q.site_street ?? '',
    site_city: q.site_city ?? '',
    site_postal_code: q.site_postal_code ?? '',
    site_note: q.site_note ?? '',
  })
  const form = useSynced(toForm(quote))
  const f = form.value
  const set = (k: keyof typeof f, v: string) => form.setValue({ ...f, [k]: v })
  const save = async () => {
    const body: Record<string, string | null> = {}
    const orig = toForm(quote)
    for (const k of Object.keys(f) as (keyof typeof f)[]) {
      if (f[k] === orig[k]) continue
      body[k] = k === 'assigned_user_id' || k === 'source_id' || k === 'quote_date' ? f[k] : nz(f[k])
    }
    if (body.assigned_user_id === '') delete body.assigned_user_id
    if (!Object.keys(body).length) return form.reset()
    const q = await run(() => api.updateQuote(quote.id, body), t('Informations enregistrées'))
    if (q) form.setValue(toForm(q))
  }
  // The assigned person may not be a sales rep (e.g. an admin): keep them in the list.
  const repOptions = reps.some((r) => r.id === f.assigned_user_id) || !f.assigned_user_id ? reps : [...reps, { id: f.assigned_user_id, name: t('Responsable actuel') }]

  return (
    <BuilderSection id="infos" title={t('Informations')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={t('Représentant')}>
          <select className="form-input" value={f.assigned_user_id} onChange={(e) => set('assigned_user_id', e.target.value)} disabled={isRep} title={isRep ? t('Un représentant ne peut pas réassigner une soumission.') : undefined}>
            {!f.assigned_user_id && <option value="">{t('Non assigné')}</option>}
            {repOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('Source')}>
          <select className="form-input" value={f.source_id} onChange={(e) => set('source_id', e.target.value)}>
            {REF.sources.map((x) => (
              <option key={x.id} value={x.id}>
                {t(x.name)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('Date de la soumission')}>
          <input type="date" className="form-input" value={f.quote_date} onChange={(e) => set('quote_date', e.target.value)} />
        </Field>
        <Field label={t('Type de travaux')}>
          <input className="form-input bg-sand" value={quote.work_type ? t(quote.work_type.name) : '—'} readOnly title={t('Le type de travaux ne change pas après la création.')} />
        </Field>
        <Field label={t('Résumé des travaux')} className="sm:col-span-2">
          <input className="form-input" value={f.work_summary} maxLength={300} onChange={(e) => set('work_summary', e.target.value)} placeholder={t('ex. Réfection complète, bardeaux Timberline')} />
        </Field>
        <p className="label-caps sm:col-span-2 pt-2">{t('Adresse des travaux')}</p>
        <div className="sm:col-span-2 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
          <Field label={t('No civique')}>
            <input className="form-input tnum" value={f.site_civic_number} onChange={(e) => set('site_civic_number', e.target.value)} />
          </Field>
          <Field label={t('Rue')}>
            <input className="form-input" value={f.site_street} onChange={(e) => set('site_street', e.target.value)} />
          </Field>
        </div>
        <Field label={t('Ville')}>
          <input className="form-input" value={f.site_city} onChange={(e) => set('site_city', e.target.value)} />
        </Field>
        <Field label={t('Code postal')}>
          <input className="form-input uppercase" value={f.site_postal_code} onChange={(e) => set('site_postal_code', e.target.value.toUpperCase())} />
        </Field>
        <Field label={t('Note sur le chantier')} className="sm:col-span-2">
          <textarea className="form-input py-2 min-h-20" rows={3} value={f.site_note} onChange={(e) => set('site_note', e.target.value)} />
        </Field>
      </div>
      <SaveBar dirty={form.dirty} busy={s.pending > 0} onSave={() => void save()} onReset={form.reset} />
    </BuilderSection>
  )
}

// ── Obligations ──────────────────────────────────────────────────────────────
type FieldDef = { key: string; label: string; kind: 'money' | 'int' | 'tenth' | 'text' | 'area' | 'select' | 'bool'; options?: [string, string][]; wide?: boolean; max?: number }

const ROOF_FIELDS: FieldDef[] = [
  { key: 'area_sqft', label: 'Superficie (pi²)', kind: 'money' },
  { key: 'base_area_sqft', label: 'Superficie « fond » (pi²)', kind: 'money' },
  { key: 'upturn_area_sqft', label: 'Superficie « remontée » (pi²)', kind: 'money' },
  { key: 'slope_count', label: 'Versants', kind: 'int' },
  { key: 'storey_count', label: 'Étages', kind: 'int' },
  { key: 'drain_count', label: 'Drains', kind: 'int' },
  { key: 'estimated_days', label: 'Jours estimés', kind: 'tenth', max: 3 },
  { key: 'pitch_rise', label: 'Pente (x/12)', kind: 'tenth', max: 3 },
  { key: 'note', label: 'Note', kind: 'area', wide: true },
]
const GUTTER_FIELDS: FieldDef[] = [
  { key: 'material', label: 'Matériau', kind: 'select', options: [['', '—'], ['aluminum', 'Aluminium'], ['steel', 'Acier']] },
  { key: 'gutter_size_in', label: 'Modèle', kind: 'select', options: [['', '—'], ['5', '5 po'], ['6', '6 po']] },
  { key: 'gutter_color', label: 'Couleur des gouttières', kind: 'text' },
  { key: 'downspout_color', label: 'Couleur des descentes', kind: 'text' },
  { key: 'gutter_length_ft', label: 'Pieds de gouttières', kind: 'money' },
  { key: 'downspout_length_ft', label: 'Pieds de descentes', kind: 'money' },
  { key: 'ladders', label: 'Échelles', kind: 'text' },
  { key: 'storeys', label: 'Étages', kind: 'text' },
  { key: 'roof_pitch', label: 'Toit (pente)', kind: 'text' },
  { key: 'leaning', label: 'Penchées', kind: 'text' },
  { key: 'drip', label: 'Larmier', kind: 'text' },
  { key: 'has_supreme_screw_hook', label: 'Crochet vissé Suprême', kind: 'bool' },
  { key: 'note', label: 'Note', kind: 'area', wide: true },
]
const RENO_FIELDS: FieldDef[] = [
  { key: 'other_work_title', label: 'Autres travaux', kind: 'text', wide: true },
  { key: 'description', label: 'Description (soumission budgétaire)', kind: 'area', wide: true },
  { key: 'area_sqft', label: 'Superficie (pi²)', kind: 'money' },
  { key: 'estimated_days', label: 'Jours estimés', kind: 'tenth', max: 4 },
  { key: 'note', label: 'Note', kind: 'area', wide: true },
]

const NO_FIELDS: FieldDef[] = []
const FORM_FIELDS = (form: ObligationForm) => (form === 'gutter' ? GUTTER_FIELDS : form === 'renovation' ? RENO_FIELDS : ROOF_FIELDS)
const FORM_TITLE: Record<ObligationForm, string> = { pitched_roof: 'Toit en pente', flat_roof: 'Toit plat', metal_roof: 'Toit en métal', gutter: 'Gouttières', renovation: 'Rénovation' }

export function ApiObligationsSection({ s }: { s: S }) {
  const { quote, run } = s
  const form = quote.work_type?.obligation_form
  const fields = form ? FORM_FIELDS(form) : NO_FIELDS
  const toForm = (obligations: ApiQuote['obligations']) => {
    const o = (obligations ?? {}) as Record<string, unknown>
    return Object.fromEntries(fields.map((f) => [f.key, f.kind === 'bool' ? !!o[f.key] : o[f.key] === null || o[f.key] === undefined ? '' : String(o[f.key])])) as Record<string, string | boolean>
  }
  const source = useMemo(() => toForm(quote.obligations), [quote.obligations, fields]) // eslint-disable-line react-hooks/exhaustive-deps
  const state = useSynced(source)
  const v = state.value
  const [error, setError] = useState<string | null>(null)
  if (!form) return null

  const save = () => {
    const body: Record<string, unknown> = {}
    for (const f of fields) {
      const raw = v[f.key]
      if (f.kind === 'bool') {
        body[f.key] = !!raw
        continue
      }
      const str = String(raw ?? '').trim()
      if (f.kind === 'money') {
        const m = parseMoney(str)
        if (m === undefined) return setError(t('{field} : nombre invalide.', { field: t(f.label) }))
        body[f.key] = m
      } else if (f.kind === 'int') {
        if (str && !/^\d{1,3}$/.test(str)) return setError(t('{field} : nombre entier attendu.', { field: t(f.label) }))
        body[f.key] = str ? Number(str) : null
      } else if (f.kind === 'tenth') {
        const n = str.replace(',', '.')
        if (n && !new RegExp(`^\\d{1,${f.max ?? 3}}(\\.\\d)?$`).test(n)) return setError(t('{field} : nombre invalide (une décimale).', { field: t(f.label) }))
        body[f.key] = n || null
      } else if (f.kind === 'select') {
        body[f.key] = str ? (f.key === 'gutter_size_in' ? Number(str) : str) : null
      } else body[f.key] = str || null
    }
    setError(null)
    void run(() => api.setObligations(quote.id, body), t('Obligations enregistrées')).then((q) => q && state.setValue(toForm(q.obligations)))
  }

  return (
    <BuilderSection id="obligations" title={`${t('Obligations')} · ${t(FORM_TITLE[form])}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {fields.map((f) => (
          <Field key={f.key} label={t(f.label)} className={cn(f.wide && 'col-span-2 md:col-span-4')}>
            {f.kind === 'bool' ? (
              <label className="h-10 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!v[f.key]} onChange={(e) => state.setValue({ ...v, [f.key]: e.target.checked })} className="accent-[var(--color-primary)]" />
                {t('Oui')}
              </label>
            ) : f.kind === 'select' ? (
              <select className="form-input" value={String(v[f.key] ?? '')} onChange={(e) => state.setValue({ ...v, [f.key]: e.target.value })}>
                {f.options!.map(([val, label]) => (
                  <option key={val} value={val}>
                    {t(label)}
                  </option>
                ))}
              </select>
            ) : f.kind === 'area' ? (
              <textarea className="form-input py-2 min-h-20" rows={3} value={String(v[f.key] ?? '')} onChange={(e) => state.setValue({ ...v, [f.key]: e.target.value })} />
            ) : (
              <input className={cn('form-input', f.kind !== 'text' && 'tnum')} inputMode={f.kind === 'text' ? undefined : 'decimal'} value={String(v[f.key] ?? '')} onChange={(e) => state.setValue({ ...v, [f.key]: e.target.value })} />
            )}
          </Field>
        ))}
      </div>
      {error && <p className="text-xs font-semibold text-tone-critical-ink pt-2">{error}</p>}
      <SaveBar dirty={state.dirty} busy={s.pending > 0} onSave={save} onReset={() => { setError(null); state.reset() }} />
    </BuilderSection>
  )
}

// ── Travaux (scope clauses) ──────────────────────────────────────────────────
export function ApiTravauxSection({ s }: { s: S }) {
  const { quote, catalogue, run } = s
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{ id: string; section: string; text: string } | null>(null)
  const [custom, setCustom] = useState<{ section: string; text: string } | null>(null)
  const [template, setTemplate] = useState('')
  const items = quote.scope_items
  const onQuote = new Map(items.filter((i) => i.scope_item_id).map((i) => [i.scope_item_id!, i]))

  const toggle = (c: CatalogueScopeItem) => {
    const existing = onQuote.get(c.id)
    void run(() => (existing ? api.removeScopeItem(quote.id, existing.id) : api.addScopeItem(quote.id, { scope_item_id: c.id })))
  }
  const move = (index: number, dir: -1 | 1) => {
    const ids = items.map((i) => i.id)
    const j = index + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[index], ids[j]] = [ids[j], ids[index]]
    void run(() => api.reorderScopeItems(quote.id, ids))
  }
  const templates = (catalogue?.quote_templates ?? []).filter((tp) => !tp.work_type_id || tp.work_type_id === quote.work_type_id)
  const q = query.trim().toLowerCase()
  const sections = (catalogue?.scope_sections ?? []).map((sec) => ({ ...sec, items: sec.items.filter((i) => !q || i.text.toLowerCase().includes(q)) })).filter((sec) => sec.items.length)
  const sectionNames = [...new Set([...items.map((i) => i.section_title), ...(catalogue?.scope_sections ?? []).map((x) => x.name)])]

  return (
    <BuilderSection
      id="travaux"
      title={t('Travaux')}
      actions={
        templates.length > 0 && (
          <div className="flex items-center gap-2">
            <select className="form-input h-8 text-xs w-auto max-w-[14rem]" value={template} onChange={(e) => setTemplate(e.target.value)} aria-label={t('Modèle')}>
              <option value="">{t('Appliquer un modèle…')}</option>
              {templates.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.name}
                </option>
              ))}
            </select>
            <button
              className="btn btn-xs btn-secondary"
              disabled={!template}
              onClick={async () => {
                if (await run(() => api.applyTemplate(quote.id, template), t('Modèle appliqué'))) setTemplate('')
              }}
            >
              {t('Appliquer')}
            </button>
          </div>
        )
      }
    >
      <div className="space-y-5">
        {/* Clauses on the quote, in print order */}
        <div>
          <p className="label-caps mb-2">{t('Clauses de la soumission ({n})', { n: items.length })}</p>
          {items.length === 0 && <p className="text-sm text-ink-mute">{t('Aucune clause. Cochez-en dans le catalogue ci-dessous ou ajoutez une clause libre.')}</p>}
          <ol className="divide-y divide-hairline rounded-lg border border-hairline">
            {items.map((it, i) => (
              <li key={it.id} className="px-3 py-2 flex items-start gap-2">
                {editing?.id === it.id ? (
                  <div className="flex-1 space-y-2">
                    <input className="form-input h-8 text-xs" value={editing.section} onChange={(e) => setEditing({ ...editing, section: e.target.value })} aria-label={t('Section')} />
                    <textarea className="form-input py-2 text-sm min-h-16" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} aria-label={t('Texte')} />
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-xs btn-ghost" onClick={() => setEditing(null)}>
                        {t('Annuler')}
                      </button>
                      <button
                        className="btn btn-xs btn-primary"
                        disabled={!editing.section.trim() || !editing.text.trim()}
                        onClick={async () => {
                          const body: { section_title?: string; text?: string } = {}
                          if (editing.section.trim() !== it.section_title) body.section_title = editing.section.trim()
                          if (editing.text.trim() !== it.text) body.text = editing.text.trim()
                          if (!Object.keys(body).length || (await run(() => api.editScopeItem(quote.id, it.id, body), t('Clause modifiée')))) setEditing(null)
                        }}
                      >
                        {t('Enregistrer')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-2xs font-semibold text-ink-mute uppercase tracking-wide">{it.section_title}</p>
                      <p className="text-sm text-ink">{it.text}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <IconBtn label={t('Monter')} onClick={() => move(i, -1)} disabled={i === 0}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </IconBtn>
                      <IconBtn label={t('Descendre')} onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </IconBtn>
                      <IconBtn label={t('Modifier')} onClick={() => setEditing({ id: it.id, section: it.section_title, text: it.text })}>
                        <Pencil className="w-3.5 h-3.5" />
                      </IconBtn>
                      <IconBtn label={t('Retirer')} onClick={() => void run(() => api.removeScopeItem(quote.id, it.id))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </IconBtn>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ol>
          {custom ? (
            <div className="mt-3 rounded-lg border border-hairline p-3 space-y-2">
              <input className="form-input h-9 text-sm" list="scope-sections" value={custom.section} onChange={(e) => setCustom({ ...custom, section: e.target.value })} placeholder={t('Section (ex. Inclus généraux)')} aria-label={t('Section')} />
              <datalist id="scope-sections">
                {sectionNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <textarea className="form-input py-2 text-sm min-h-16" value={custom.text} onChange={(e) => setCustom({ ...custom, text: e.target.value })} placeholder={t('Texte de la clause')} aria-label={t('Texte')} />
              <div className="flex justify-end gap-2">
                <button className="btn btn-xs btn-ghost" onClick={() => setCustom(null)}>
                  {t('Annuler')}
                </button>
                <button
                  className="btn btn-xs btn-primary"
                  disabled={!custom.section.trim() || !custom.text.trim()}
                  onClick={async () => {
                    if (await run(() => api.addScopeItem(quote.id, { section_title: custom.section.trim(), text: custom.text.trim() }), t('Clause ajoutée'))) setCustom(null)
                  }}
                >
                  {t('Ajouter')}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-xs btn-secondary mt-3" onClick={() => setCustom({ section: '', text: '' })}>
              <Plus className="w-3.5 h-3.5" />
              {t('Clause libre')}
            </button>
          )}
        </div>

        {/* Catalogue */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="label-caps">{t('Catalogue des clauses')}</p>
            <label className="relative w-56">
              <Search className="w-3.5 h-3.5 text-ink-mute absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input className="form-input h-8 pl-8 text-xs" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Rechercher une clause…')} aria-label={t('Rechercher une clause')} />
            </label>
          </div>
          {!catalogue && <p className="text-sm text-ink-mute">{t('Chargement…')}</p>}
          <div className="space-y-1">
            {sections.map((sec) => {
              const isOpen = !!q || open.has(sec.id)
              const count = sec.items.filter((i) => onQuote.has(i.id)).length
              return (
                <div key={sec.id} className="rounded-lg border border-hairline">
                  <button
                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm font-semibold text-ink"
                    onClick={() =>
                      setOpen((o) => {
                        const n = new Set(o)
                        if (n.has(sec.id)) n.delete(sec.id)
                        else n.add(sec.id)
                        return n
                      })
                    }
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <span className="flex-1">{sec.name}</span>
                    <span className="text-2xs text-ink-mute tnum">
                      {count}/{sec.items.length}
                    </span>
                  </button>
                  {isOpen && (
                    <ul className="px-3 pb-2 space-y-1">
                      {sec.items.map((c) => (
                        <li key={c.id}>
                          <label className="flex items-start gap-2 text-sm cursor-pointer py-0.5">
                            <input type="checkbox" checked={onQuote.has(c.id)} onChange={() => toggle(c)} disabled={s.pending > 0} className="mt-1 accent-[var(--color-primary)]" />
                            <span className={cn(onQuote.has(c.id) ? 'text-ink' : 'text-ink-secondary')}>{c.text}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </BuilderSection>
  )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="p-1.5 rounded text-ink-mute hover:bg-sand hover:text-ink disabled:opacity-30">
      {children}
    </button>
  )
}

// ── Expertises ───────────────────────────────────────────────────────────────
const EXPERTISE_LABEL: Record<ExpertiseStatus, string> = { included: 'Inclus', not_included: 'Non inclus', to_verify: 'À vérifier' }

export function ApiExpertisesSection({ s }: { s: S }) {
  const { quote, catalogue, run } = s
  const [notes, setNotes] = useState<Record<string, string>>({})
  const byItem = new Map(quote.expertise_items.filter((e) => e.expertise_item_id).map((e) => [e.expertise_item_id!, e]))
  const groups = new Map<string, NonNullable<typeof catalogue>['expertise_items']>()
  for (const e of catalogue?.expertise_items ?? []) groups.set(e.section_name, [...(groups.get(e.section_name) ?? []), e])
  // Expertises on the quote whose catalogue line is gone (read-only).
  const orphans = catalogue ? quote.expertise_items.filter((e) => !e.expertise_item_id || !catalogue.expertise_items.some((c) => c.id === e.expertise_item_id)) : []

  const set = (itemId: string, status: ExpertiseStatus, note?: string | null) => void run(() => api.setExpertise(quote.id, itemId, { status, note: note ?? null }))

  return (
    <BuilderSection id="expertises" title={t('Expertises')}>
      {!catalogue && <p className="text-sm text-ink-mute">{t('Chargement…')}</p>}
      {catalogue && catalogue.expertise_items.length === 0 && <p className="text-sm text-ink-mute">{t('Aucune expertise au catalogue de cette compagnie.')}</p>}
      <div className="space-y-4">
        {[...groups.entries()].map(([section, list]) => (
          <div key={section}>
            <p className="label-caps mb-2">{section}</p>
            <ul className="space-y-2">
              {list.map((c) => {
                const cur = byItem.get(c.id)
                const note = notes[c.id] ?? cur?.note ?? ''
                return (
                  <li key={c.id} className="rounded-lg border border-hairline px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('flex-1 min-w-[12rem] text-sm', cur ? 'text-ink font-semibold' : 'text-ink-secondary')}>{c.text}</span>
                      <div className="inline-flex rounded-md border border-hairline overflow-hidden">
                        {(['included', 'not_included', 'to_verify'] as ExpertiseStatus[]).map((st) => (
                          <button key={st} onClick={() => set(c.id, st, cur?.note)} disabled={s.pending > 0} className={cn('px-2.5 h-7 text-xs font-semibold', cur?.status === st ? 'bg-ink text-white' : 'text-ink-mute hover:bg-sand')}>
                            {t(EXPERTISE_LABEL[st])}
                          </button>
                        ))}
                      </div>
                      {cur ? (
                        <IconBtn label={t('Retirer')} onClick={() => void run(() => api.removeExpertise(quote.id, c.id))}>
                          <X className="w-3.5 h-3.5" />
                        </IconBtn>
                      ) : (
                        <button className="text-xs font-semibold text-primary-press" onClick={() => set(c.id, c.default_status)}>
                          {t('Ajouter')}
                        </button>
                      )}
                    </div>
                    {cur && (
                      <input
                        className="form-input h-8 text-xs mt-2"
                        value={note}
                        placeholder={t('Note (facultatif)')}
                        onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                        onBlur={() => {
                          if ((cur.note ?? '') !== note.trim()) set(c.id, cur.status, note.trim() || null)
                          setNotes((n) => {
                            const next = { ...n }
                            delete next[c.id]
                            return next
                          })
                        }}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {orphans.length > 0 && (
          <div>
            <p className="label-caps mb-2">{t('Autres expertises de la soumission')}</p>
            <ul className="space-y-1">
              {orphans.map((e) => (
                <li key={e.id} className="text-sm text-ink-secondary">
                  {e.section_name} · {e.text} · <span className="font-semibold">{t(EXPERTISE_LABEL[e.status])}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </BuilderSection>
  )
}

// ── Garanties ────────────────────────────────────────────────────────────────
export function ApiGarantiesSection({ s }: { s: S }) {
  const { quote, catalogue, run } = s
  const [customText, setCustomText] = useState<Record<string, string>>({})
  const note = useSynced(quote.warranty_note ?? '')
  const current = new Map(quote.warranties.map((w) => [w.warranty_group_id, w]))

  return (
    <BuilderSection id="garanties" title={t('Garanties')}>
      {!catalogue && <p className="text-sm text-ink-mute">{t('Chargement…')}</p>}
      {catalogue && catalogue.warranty_groups.length === 0 && <p className="text-sm text-ink-mute">{t('Aucune garantie au catalogue de cette compagnie.')}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(catalogue?.warranty_groups ?? []).map((g) => {
          const cur = current.get(g.id)
          const value = cur?.warranty_option_id ?? (cur?.custom_text ? '__custom' : '')
          const typed = customText[g.id] ?? cur?.custom_text ?? ''
          return (
            <Field key={g.id} label={g.name}>
              <select
                className="form-input"
                value={customText[g.id] !== undefined ? '__custom' : value}
                disabled={s.pending > 0}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__custom') setCustomText((c) => ({ ...c, [g.id]: cur?.custom_text ?? '' }))
                  else {
                    setCustomText((c) => {
                      const n = { ...c }
                      delete n[g.id]
                      return n
                    })
                    void run(() => (v ? api.setWarranty(quote.id, g.id, { warranty_option_id: v }) : api.clearWarranty(quote.id, g.id)))
                  }
                }}
              >
                <option value="">{t('Aucune')}</option>
                {g.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
                {g.allows_custom_text && <option value="__custom">{t('Texte libre…')}</option>}
              </select>
              {(customText[g.id] !== undefined || (cur?.custom_text && value === '__custom')) && (
                <div className="flex gap-2 mt-1.5">
                  <input className="form-input h-8 text-sm" maxLength={300} value={typed} onChange={(e) => setCustomText((c) => ({ ...c, [g.id]: e.target.value }))} placeholder={t('Garantie offerte')} />
                  <button
                    type="button"
                    className="btn btn-xs btn-primary"
                    disabled={!typed.trim() || typed.trim() === cur?.custom_text}
                    onClick={async () => {
                      if (await run(() => api.setWarranty(quote.id, g.id, { custom_text: typed.trim() }), t('Garantie enregistrée')))
                        setCustomText((c) => {
                          const n = { ...c }
                          delete n[g.id]
                          return n
                        })
                    }}
                  >
                    {t('Enregistrer')}
                  </button>
                </div>
              )}
            </Field>
          )
        })}
      </div>
      <Field label={t('Note sur les garanties')} className="mt-4">
        <textarea className="form-input py-2 min-h-16" rows={2} value={note.value} onChange={(e) => note.setValue(e.target.value)} />
      </Field>
      <SaveBar
        dirty={note.dirty}
        busy={s.pending > 0}
        onSave={() => void run(() => api.updateQuote(quote.id, { warranty_note: nz(note.value) }), t('Note enregistrée')).then((q) => q && note.setValue(q.warranty_note ?? ''))}
        onReset={note.reset}
      />
    </BuilderSection>
  )
}

// ── Coûtants (cost lines) ────────────────────────────────────────────────────
const lineTotal = (qty: string, price: string | null | undefined) => Math.round(toNum(qty) * toNum(price) * 100) / 100

export function ApiCoutantsSection({ s }: { s: S }) {
  const { quote, catalogue, costView, run } = s
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({})
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState('1')
  const lines = quote.cost_lines
  const sell = lines.reduce((n, l) => n + lineTotal(l.quantity, l.unit_price), 0)
  const cost = lines.reduce((n, l) => n + lineTotal(l.quantity, l.unit_cost), 0)
  const cats = [...new Set(lines.map((l) => l.category_label))]

  const saveQty = (lineId: string, current: string) => {
    const draft = qtyDraft[lineId]
    setQtyDraft((d) => {
      const n = { ...d }
      delete n[lineId]
      return n
    })
    if (draft === undefined) return
    const parsed = parseQty(draft)
    if (parsed === undefined || parsed === null) return toast(t('Quantité invalide (ex. 12,5).'))
    if (Number(parsed) === Number(current)) return
    void run(() => api.editCostLine(quote.id, lineId, parsed))
  }

  const add = async () => {
    const parsed = parseQty(qty)
    if (!itemId) return
    if (parsed === undefined || parsed === null) return toast(t('Quantité invalide (ex. 12,5).'))
    if (await run(() => api.addCostLine(quote.id, { cost_item_id: itemId, quantity: parsed }), t('Ligne ajoutée'))) {
      setItemId('')
      setQty('1')
    }
  }

  return (
    <BuilderSection id="coutants" title={costView ? t('Coûtants') : t('Matériaux et main-d’œuvre')}>
      {lines.length === 0 && <p className="text-sm text-ink-mute mb-3">{t('Aucune ligne. Ajoutez des items du catalogue.')}</p>}
      {lines.length > 0 && (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[640px] text-sm [&_td]:px-2 [&_th]:px-2">
            <thead className="border-b border-hairline">
              <tr>
                <th className="th">{t('Item')}</th>
                <th className="th w-24 text-right">{t('Qté')}</th>
                <th className="th">{t('Unité')}</th>
                <th className="th text-right">{t('Prix unitaire')}</th>
                <th className="th text-right">{t('Total')}</th>
                {costView && <th className="th text-right">{t('Coût unitaire')}</th>}
                {costView && <th className="th text-right">{t('Coût')}</th>}
                <th className="th w-8" />
              </tr>
            </thead>
            {cats.map((cat) => (
              <tbody key={cat} className="divide-y divide-hairline">
                <tr>
                  <td colSpan={costView ? 8 : 6} className="pt-3 pb-1 text-2xs font-semibold text-ink-mute uppercase tracking-wide">
                    {cat}
                  </td>
                </tr>
                {lines
                  .filter((l) => l.category_label === cat)
                  .map((l) => (
                    <tr key={l.id}>
                      <td className="td">{l.description}</td>
                      <td className="td text-right">
                        <input
                          className="form-input h-8 w-20 text-right tnum"
                          inputMode="decimal"
                          value={qtyDraft[l.id] ?? editable(l.quantity)}
                          onChange={(e) => setQtyDraft((d) => ({ ...d, [l.id]: e.target.value }))}
                          onBlur={() => saveQty(l.id, l.quantity)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          aria-label={t('Quantité')}
                        />
                      </td>
                      <td className="td text-ink-mute">{l.unit ?? ''}</td>
                      <td className="td text-right tnum">{money(toNum(l.unit_price))}</td>
                      <td className="td text-right tnum font-semibold">{money(lineTotal(l.quantity, l.unit_price))}</td>
                      {costView && <td className="td text-right tnum text-ink-mute">{l.unit_cost == null ? '—' : money(toNum(l.unit_cost))}</td>}
                      {costView && <td className="td text-right tnum text-ink-mute">{l.unit_cost == null ? '—' : money(lineTotal(l.quantity, l.unit_cost))}</td>}
                      <td className="td">
                        <IconBtn label={t('Retirer')} onClick={() => void run(() => api.removeCostLine(quote.id, l.id))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </IconBtn>
                      </td>
                    </tr>
                  ))}
              </tbody>
            ))}
            <tfoot className="border-t border-hairline-strong">
              <tr>
                <td className="td font-semibold" colSpan={4}>
                  {t('Total vendant suggéré')}
                </td>
                <td className="td text-right tnum font-semibold">{money(sell)}</td>
                {costView && <td />}
                {costView && <td className="td text-right tnum font-semibold">{money(cost)}</td>}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <select className="form-input flex-1 min-w-0" value={itemId} onChange={(e) => setItemId(e.target.value)} aria-label={t('Item du catalogue')}>
          <option value="">{catalogue ? t('Ajouter un item du catalogue…') : t('Chargement…')}</option>
          {(catalogue?.cost_general_categories ?? []).flatMap((g) =>
            g.categories.map((c) => (
              <optgroup key={c.id} label={`${g.name} · ${c.name}`}>
                {c.items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                    {i.unit ? ` (${i.unit})` : ''} — {money(toNum(i.sell_price))}
                  </option>
                ))}
              </optgroup>
            )),
          )}
        </select>
        <input className="form-input sm:w-24 tnum text-right" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} aria-label={t('Quantité')} />
        <button className="btn btn-sm btn-secondary" onClick={add} disabled={!itemId || s.pending > 0}>
          <Plus className="w-4 h-4" />
          {t('Ajouter')}
        </button>
      </div>
      {lines.length > 0 && Math.abs(sell - toNum(quote.base_price)) >= 0.01 && (
        <button className="btn btn-xs btn-ghost mt-3" onClick={() => void run(() => api.updateQuote(quote.id, { base_price: sell.toFixed(2) }), t('Prix ajusté au vendant suggéré : {amount}', { amount: money(sell) }))}>
          <Equal className="w-3.5 h-3.5" />
          {t('Utiliser {amount} comme prix de base', { amount: money(sell) })}
        </button>
      )}
    </BuilderSection>
  )
}

// ── Prix (base price, discount, "=", add-ons, totals) ────────────────────────
export function ApiPrixSection({ s }: { s: S }) {
  const { quote, catalogue, costView, run } = s
  const toForm = (q: ApiQuote) => ({ base: editable(q.base_price), discount: toNum(q.discount_amount) ? editable(q.discount_amount) : '', comments: q.price_comments ?? '' })
  const price = useSynced(toForm(quote))
  const [target, setTarget] = useState('')
  const [preset, setPreset] = useState('')
  const [custom, setCustom] = useState({ description: '', amount: '' })
  const [addonDraft, setAddonDraft] = useState<Record<string, { description: string; amount: string }>>({})
  const included = quote.addons.filter((a) => a.is_included).reduce((n, a) => n + toNum(a.amount), 0)

  const savePrice = () => {
    const base = parseMoney(price.value.base)
    const discount = parseMoney(price.value.discount)
    if (base === undefined) return toast(t('Prix invalide (ex. 18450,00).'))
    if (discount === undefined) return toast(t('Escompte invalide (ex. 250,00).'))
    void run(
      () => api.updateQuote(quote.id, { base_price: base, discount_amount: discount ?? '0.00', price_comments: nz(price.value.comments) }),
      t('Prix enregistré'),
    ).then((q) => q && price.setValue(toForm(q)))
  }
  const fromTotal = async () => {
    const total = parseMoney(target)
    if (!total) return toast(t('Entrez un total visé, taxes incluses'))
    const q = await run(() => api.priceFromTotal(quote.id, total))
    if (q) {
      setTarget('')
      toast(t('Prix calculé : {price} pour un total de {total}', { price: money(toNum(q.base_price)), total: money(toNum(q.total_amount)) }))
    }
  }
  const saveAddon = (id: string) => {
    const d = addonDraft[id]
    const a = quote.addons.find((x) => x.id === id)
    if (!d || !a) return
    const amount = parseMoney(d.amount)
    if (amount === undefined || amount === null) return toast(t('Montant invalide (ex. 1250,00).'))
    const body: { description?: string; amount?: string } = {}
    if (d.description.trim() && d.description.trim() !== a.description) body.description = d.description.trim()
    if (amount !== toNum(a.amount).toFixed(2)) body.amount = amount
    setAddonDraft((x) => {
      const n = { ...x }
      delete n[id]
      return n
    })
    if (Object.keys(body).length) void run(() => api.editAddon(quote.id, id, body))
  }
  const addCustom = async () => {
    const amount = parseMoney(custom.amount)
    if (!custom.description.trim()) return
    if (amount === undefined || amount === null) return toast(t('Montant invalide (ex. 1250,00).'))
    if (await run(() => api.addAddon(quote.id, { description: custom.description.trim(), amount }), t('Ajout créé'))) setCustom({ description: '', amount: '' })
  }

  return (
    <BuilderSection id="prix" title={t('Prix')}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('Prix de base (avant taxes)')}>
              <input className="form-input tnum text-right" inputMode="decimal" value={price.value.base} onChange={(e) => price.setValue({ ...price.value, base: e.target.value })} placeholder="0,00" />
            </Field>
            <Field label={t('Escompte')}>
              <input className="form-input tnum text-right" inputMode="decimal" value={price.value.discount} onChange={(e) => price.setValue({ ...price.value, discount: e.target.value })} placeholder="0,00" />
            </Field>
          </div>
          <Field label={t('Commentaires sur le prix')}>
            <textarea className="form-input py-2 min-h-16" rows={2} value={price.value.comments} onChange={(e) => price.setValue({ ...price.value, comments: e.target.value })} />
          </Field>
          <SaveBar dirty={price.dirty} busy={s.pending > 0} onSave={savePrice} onReset={price.reset} />
          <div className="rounded-lg bg-sand p-3">
            <p className="label-caps mb-1.5">{t('Prix à partir du total (« = »)')}</p>
            <div className="flex gap-2">
              <input className="form-input tnum text-right" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={t('Total visé, taxes incluses')} aria-label={t('Total visé, taxes incluses')} />
              <button className="btn btn-sm btn-secondary" onClick={fromTotal} disabled={!target.trim() || s.pending > 0}>
                <Equal className="w-4 h-4" />
                {t('Calculer')}
              </button>
            </div>
            <p className="text-2xs text-ink-mute mt-1.5">{t('Le prix de base est calculé pour que le total taxes incluses soit exactement ce montant (ajouts inclus et escompte compris).')}</p>
          </div>
        </div>

        <dl className="rounded-xl border border-hairline p-4 space-y-1.5 text-sm tnum self-start">
          <Line label={t('Prix de base')} value={money(toNum(quote.base_price))} />
          {included > 0 && <Line label={t('Ajouts inclus')} value={money(included)} />}
          {toNum(quote.discount_amount) > 0 && <Line label={t('Escompte')} value={`−${money(toNum(quote.discount_amount))}`} />}
          <Line label={t('Sous-total')} value={money(toNum(quote.totals.subtotal))} strong />
          <Line label={`${t('TPS')} (${pct(toNum(quote.gst_rate), 2)})`} value={money(toNum(quote.totals.gst))} />
          <Line label={`${t('TVQ')} (${pct(toNum(quote.qst_rate), 3)})`} value={money(toNum(quote.totals.qst))} />
          <div className="border-t border-hairline pt-1.5">
            <Line label={t('Total')} value={money(toNum(quote.totals.total))} strong />
          </div>
          {costView && quote.costs && (
            <div className="border-t border-hairline pt-1.5 mt-1.5 space-y-1.5 text-ink-mute">
              <Line label={t('Coût estimé')} value={money(toNum(quote.costs.estimated_cost_amount))} />
              <Line label={t('Marge')} value={`${money(toNum(quote.costs.margin_amount))}${quote.costs.margin_pct !== null ? ` · ${pct(toNum(quote.costs.margin_pct), 1)}` : ''}`} />
            </div>
          )}
        </dl>
      </div>

      {/* Add-ons */}
      <div className="mt-6">
        <p className="label-caps mb-2">{t('Ajouts')}</p>
        {quote.addons.length === 0 && <p className="text-sm text-ink-mute mb-2">{t('Aucun ajout.')}</p>}
        <ul className="divide-y divide-hairline rounded-lg border border-hairline">
          {quote.addons.map((a) => {
            const d = addonDraft[a.id]
            return (
              <li key={a.id} className="px-3 py-2 flex flex-wrap items-center gap-2">
                <input
                  className="form-input h-8 text-sm flex-1 min-w-[12rem]"
                  value={d?.description ?? a.description}
                  onChange={(e) => setAddonDraft((x) => ({ ...x, [a.id]: { description: e.target.value, amount: d?.amount ?? editable(a.amount) } }))}
                  onBlur={() => saveAddon(a.id)}
                  aria-label={t('Description')}
                />
                <input
                  className="form-input h-8 w-28 text-sm text-right tnum"
                  inputMode="decimal"
                  value={d?.amount ?? editable(a.amount)}
                  onChange={(e) => setAddonDraft((x) => ({ ...x, [a.id]: { description: d?.description ?? a.description, amount: e.target.value } }))}
                  onBlur={() => saveAddon(a.id)}
                  aria-label={t('Montant')}
                />
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary" title={t('Compté dans le sous-total taxable')}>
                  <input type="checkbox" checked={a.is_included} disabled={s.pending > 0} onChange={(e) => void run(() => api.editAddon(quote.id, a.id, { is_included: e.target.checked }))} className="accent-[var(--color-primary)]" />
                  {t('Inclus dans le prix')}
                </label>
                {a.option_group && <span className="badge bg-sand text-ink-mute !text-2xs">{t('Option · {group}', { group: a.option_group })}</span>}
                {a.is_client_selectable && <span className="badge bg-primary-wash text-primary-press !text-2xs">{t('Au choix du client')}</span>}
                <IconBtn label={t('Retirer')} onClick={() => void run(() => api.removeAddon(quote.id, a.id))}>
                  <Trash2 className="w-3.5 h-3.5" />
                </IconBtn>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex gap-2">
            <select className="form-input flex-1 min-w-0" value={preset} onChange={(e) => setPreset(e.target.value)} aria-label={t('Ajout du catalogue')}>
              <option value="">{catalogue ? t('Ajout du catalogue…') : t('Chargement…')}</option>
              {(catalogue?.addon_presets ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.description} — {money(toNum(p.default_amount))}
                </option>
              ))}
            </select>
            <button
              className="btn btn-sm btn-secondary"
              disabled={!preset || s.pending > 0}
              onClick={async () => {
                if (await run(() => api.addAddon(quote.id, { addon_preset_id: preset }), t('Ajout créé'))) setPreset('')
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input className="form-input flex-1 min-w-0" value={custom.description} onChange={(e) => setCustom({ ...custom, description: e.target.value })} placeholder={t('Ajout libre')} aria-label={t('Description')} />
            <input className="form-input w-28 text-right tnum" inputMode="decimal" value={custom.amount} onChange={(e) => setCustom({ ...custom, amount: e.target.value })} placeholder="0,00" aria-label={t('Montant')} />
            <button className="btn btn-sm btn-secondary" onClick={addCustom} disabled={!custom.description.trim() || s.pending > 0}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </BuilderSection>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4', strong ? 'font-semibold text-ink' : 'text-ink-secondary')}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

// ── Notes and terms ──────────────────────────────────────────────────────────
export function ApiNotesSection({ s }: { s: S }) {
  const { quote, run } = s
  const toForm = (q: ApiQuote) => ({ terms: q.payment_terms ?? '', notes: htmlToText(q.notes_html) })
  const form = useSynced(toForm(quote))
  return (
    <BuilderSection id="notes" title={t('Notes et conditions')}>
      <div className="space-y-3">
        <Field label={t('Modalités de paiement')}>
          <textarea className="form-input py-2 min-h-16" rows={2} maxLength={2000} value={form.value.terms} onChange={(e) => form.setValue({ ...form.value, terms: e.target.value })} />
        </Field>
        <Field label={t('Notes imprimées sur la soumission')}>
          <textarea className="form-input py-2 min-h-28" rows={5} value={form.value.notes} onChange={(e) => form.setValue({ ...form.value, notes: e.target.value })} />
        </Field>
      </div>
      <SaveBar
        dirty={form.dirty}
        busy={s.pending > 0}
        onReset={form.reset}
        onSave={() => {
          const body: { payment_terms?: string | null; notes_html?: string | null } = {}
          if (form.value.terms !== (quote.payment_terms ?? '')) body.payment_terms = nz(form.value.terms)
          if (form.value.notes !== htmlToText(quote.notes_html)) body.notes_html = textToHtml(form.value.notes)
          void run(() => api.updateQuote(quote.id, body), t('Notes enregistrées')).then((q) => q && form.setValue(toForm(q)))
        }}
      />
    </BuilderSection>
  )
}
