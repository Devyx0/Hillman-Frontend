import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronDown, Copy, ExternalLink, FileText, Mail, Phone, Plus, Search } from 'lucide-react'
import { Badge, Field, RepAvatar } from '../../components/ui'
import { REPS, fullName } from '../../data/mock'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn, formatHour } from '../../lib/utils'
import { SCOPE_TEMPLATES } from '../../data/quote-builder'
import { Select } from '../../components/filters'
import { BuilderSection, ToggleChip, UnitField } from '../../components/quote-shared'
import type { Builder, ExpertiseValue } from './useQuoteBuilder'

const DAY_LABELS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']

/** Client, job address, rep and appointments. */
export function InfosSection({ b }: { b: Builder }) {
  const navigate = useNavigate()
  const { quote, client } = b
  return (
    <BuilderSection id="infos" title={t('Infos')}>
      <div className="grid md:grid-cols-2 gap-5 [&>*]:min-w-0">
        <div className="rounded-lg border border-hairline p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-11 h-11 rounded-full bg-data-5 text-data-5-ink flex items-center justify-center font-bold text-sm shrink-0">
                {client.first[0]}
                {client.last[0]}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink truncate">{fullName(client)}</p>
              </div>
            </div>
            <Link to={`/clients/${client.id}`} className="btn btn-xs btn-quiet shrink-0">
              {t('Fiche')}
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 text-ink-secondary">
              <Phone className="w-3.5 h-3.5 text-ink-mute" />
              <span className="tnum">{client.phone}</span>
              {client.mobile && <span className="text-ink-mute tnum">· {t('cell.')} {client.mobile}</span>}
            </p>
            <p className="flex items-center gap-2 text-ink-secondary">
              <Mail className="w-3.5 h-3.5 text-ink-mute" />
              {client.email}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-hairline p-4 grid grid-cols-2 gap-3 text-sm content-start">
          <div className="col-span-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="label-caps">{t('Adresse des travaux')}</p>
              <p className="text-ink font-medium">
                {client.no}, {client.street}, {client.city} {client.postal}
              </p>
            </div>
            <button className="btn btn-xs btn-quiet shrink-0 px-2" aria-label={t("Copier l'adresse principale")} title={t("Copier l'adresse principale")} onClick={() => toast(t('Adresse principale copiée'))}>
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="col-span-2">
            <p className="label-caps">{t('Source')}</p>
            <p className="text-ink-secondary">{t(quote.source)}</p>
          </div>
          <div className="col-span-2">
            <p className="label-caps mb-0.5">{t('Représentant')}</p>
            <Select value={b.repId} onChange={b.setRepId} options={REPS.filter((r) => r.company === quote.company || r.company === 'all').map((r) => ({ value: r.id, label: r.name, icon: <RepAvatar id={r.id} size="xs" /> }))} searchable={false} />
          </div>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <p className="label-caps">{t('Rendez-vous')}</p>
          <button className="btn btn-xs btn-secondary" onClick={() => navigate(`/agenda?nouveau=${quote.id}`)}>
            <Plus className="w-3.5 h-3.5" />
            {t('Ajouter')}
          </button>
        </div>
        <div className="divide-y divide-hairline rounded-lg border border-hairline">
          {b.appointments.map((a) => (
            <div key={a.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm">
              <CalendarDays className="w-4 h-4 text-ink-mute" />
              <span className="font-semibold text-ink tnum">
                {t(DAY_LABELS[a.day])} {t('{d} oct.', { d: 18 + a.day })} · {formatHour(a.start)}
              </span>
              <span className="text-ink-secondary">
                {t(a.title)} · {a.city}
              </span>
              <span className="ml-auto">
                <RepAvatar id={a.repId} size="xs" />
              </span>
            </div>
          ))}
          <div className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm text-ink-mute">
            <CalendarDays className="w-4 h-4" />
            {t("Jeu. 15 oct. · 13 h 00 · Visite d'estimation")}
            <Badge tone="good" className="ml-auto">
              {t('Fait')}
            </Badge>
          </div>
        </div>
      </div>
    </BuilderSection>
  )
}

const noop = () => {}

/** Measurements and job facts; fields differ per company. */
export function ObligationsSection({ b }: { b: Builder }) {
  const { quote, dims, setDims } = b
  return (
    <BuilderSection id="obligations" title={t('Obligations')}>
      {quote.company === 'toit' ? (
        <div className="space-y-4">
          <Field label={t('Type de travaux')} className="max-w-xs">
            <Select value={b.workKind} onChange={b.setWorkKind} options={['Toit plat', 'Toit en pente', 'Toit en métal'].map((v) => ({ value: v, label: t(v) }))} searchable={false} />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <UnitField label={t('Superficie approx.')} value={dims.area} suffix={t('pi²')} onChange={(v) => setDims({ ...dims, area: v })} />
            <UnitField label={t('Superficie « fond »')} value={dims.fond} suffix={t('pi²')} onChange={(v) => setDims({ ...dims, fond: v })} />
            <UnitField label={t('Superficie « remontée »')} value={dims.rem} suffix={t('pi²')} onChange={(v) => setDims({ ...dims, rem: v })} />
            <UnitField label={t('Pente moyenne')} value={dims.pente} suffix="/12" onChange={(v) => setDims({ ...dims, pente: v })} />
            <UnitField label={t('Nombre de versants')} value={dims.versants} onChange={(v) => setDims({ ...dims, versants: v })} />
            <UnitField label={t("Nombre d'étages")} value={dims.etages} onChange={(v) => setDims({ ...dims, etages: v })} />
            <UnitField label={t('Nombre de drains')} value={dims.drains} onChange={(v) => setDims({ ...dims, drains: v })} />
            <UnitField label={t('Jours estimés')} value={dims.jours} suffix={t('j')} onChange={(v) => setDims({ ...dims, jours: v })} />
          </div>
          <Field label={t('Note')}>
            <textarea className="form-input h-auto py-2" rows={2} defaultValue={b.isDemo ? t("Cheminée en brique côté nord. Accès conteneur par l'entrée asphaltée. Piscine hors-terre à protéger.") : ''} />
          </Field>
        </div>
      ) : quote.company === 'sg' ? (
        <div className="space-y-4">
          <Field label={t('Type de travaux')} className="max-w-xs">
            <Select value="Gouttière" onChange={noop} options={[{ value: 'Gouttière', label: t('Gouttière') }]} searchable={false} />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label={t('Type')} className="col-span-2">
              <div className="flex flex-wrap gap-1.5">
                <ToggleChip active onClick={noop}>
                  {t('Aluminium')}
                </ToggleChip>
                <ToggleChip active={false} onClick={noop}>
                  {t('Acier')}
                </ToggleChip>
                <ToggleChip active onClick={noop}>
                  {t('Crochet vissé Suprême')}
                </ToggleChip>
              </div>
            </Field>
            <UnitField label={t('Gouttières')} value="140" suffix={t('pi')} />
            <UnitField label={t('Tuyaux')} value="48" suffix={t('pi')} />
            <UnitField label={t('Échelles')} value="2" />
            <UnitField label={t('Étages')} value="2" />
            <UnitField label={t('Toit')} value={t('Bardeaux')} />
            <UnitField label={t('Penchées')} value="0" />
            <UnitField label={t('Drip')} value="0" suffix={t('pi')} />
          </div>
          <Field label={t('Note')}>
            <textarea className="form-input h-auto py-2" rows={2} defaultValue={t('Arbres matures côté cour : proposer protège-gouttières.')} />
          </Field>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t('Type de travaux')}>
              <Select value="Rénovation" onChange={noop} options={[{ value: 'Rénovation', label: t('Rénovation') }]} searchable={false} />
            </Field>
            <UnitField label={t('Autre travaux')} value={t(quote.workType)} className="sm:col-span-2" />
            <UnitField label={t('Superficie approximative')} value="192" suffix={t('pi²')} />
            <UnitField label={t('Nombre de jours estimés')} value="18" suffix={t('j')} />
          </div>
          <Field label={t('Note')}>
            <textarea className="form-input h-auto py-2" rows={3} defaultValue={t("** Soumission budgétaire selon les travaux\n- travaux de menuiserie et charpente\n- travaux d'isolation\n- travaux de revêtements")} />
          </Field>
        </div>
      )}
    </BuilderSection>
  )
}

/** Scope-of-work checklist with templates and search. */
export function TravauxSection({ b }: { b: Builder }) {
  const { quote, checked } = b
  return (
    <BuilderSection
      id="travaux"
      title={`${t('Travaux')} · ${checked.size}/${b.scopeLineCount}`}
      actions={
        quote.company === 'toit' ? (
          <div className="relative">
            <button className="btn btn-sm btn-secondary" onClick={() => b.setTemplateMenu((o) => !o)}>
              <FileText className="w-4 h-4" />
              {t('Modèle')}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {b.templateMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => b.setTemplateMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
                  {Object.keys(SCOPE_TEMPLATES).map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        b.setChecked(new Set(SCOPE_TEMPLATES[name]))
                        b.setTemplateMenu(false)
                        toast(t('Modèle « {name} » appliqué', { name: t(name) }))
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-sand"
                    >
                      <span className="block text-sm font-medium text-ink">{t(name)}</span>
                      <span className="block text-2xs text-ink-mute">{t('{n} lignes', { n: SCOPE_TEMPLATES[name].length })}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={b.scopeQuery} onChange={(e) => b.setScopeQuery(e.target.value)} placeholder={t('Chercher…')} className="form-input pl-9" aria-label={t('Chercher une ligne de travaux')} />
      </div>
      <div className="divide-y divide-hairline rounded-lg border border-hairline">
        {b.filteredScope.map((group) => {
          const count = group.lines.filter((l) => checked.has(l)).length
          const open = b.openGroups.has(group.name) || !!b.scopeQuery
          return (
            <div key={group.name}>
              <button
                onClick={() =>
                  b.setOpenGroups((prev) => {
                    const next = new Set(prev)
                    if (next.has(group.name)) next.delete(group.name)
                    else next.add(group.name)
                    return next
                  })
                }
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-sand/60 text-left"
              >
                <ChevronDown className={cn('w-4 h-4 text-ink-mute transition-transform', !open && '-rotate-90')} />
                <span className="text-sm font-semibold text-ink flex-1">{t(group.name)}</span>
                <span className={cn('text-xs tnum font-semibold px-2 py-0.5 rounded-full', count ? 'bg-primary-wash text-primary-press' : 'bg-sand text-ink-mute')}>
                  {count}/{group.lines.length}
                </span>
              </button>
              {open && (
                <div className="pb-2 px-2">
                  {group.lines.map((line) => (
                    <label key={line} className={cn('flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer text-sm', checked.has(line) ? 'text-ink' : 'text-ink-mute hover:bg-sand/60')}>
                      <input type="checkbox" checked={checked.has(line)} onChange={() => b.toggleLine(line)} className="mt-0.5 w-4 h-4 accent-[var(--color-primary)] shrink-0" />
                      <span className="flex-1">{t(line)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </BuilderSection>
  )
}

const EXPERTISES = ['Isolation', 'Structure', 'Ventilation', 'Pontage']

export function ExpertisesSection({ b }: { b: Builder }) {
  const set = (name: string, value: ExpertiseValue) => b.setExpertises({ ...b.expertises, [name]: value })
  return (
    <BuilderSection id="expertises" title={t('Expertises')}>
      <div className="grid sm:grid-cols-2 gap-3">
        {EXPERTISES.map((name) => (
          <div key={name} className="rounded-lg border border-hairline p-4 space-y-2.5">
            <p className="text-sm font-semibold text-ink">{t(name)}</p>
            <div className="flex flex-wrap gap-1.5">
              <ToggleChip active={b.expertises[name] === 'Inclus'} tone="good" onClick={() => set(name, 'Inclus')}>
                {t('Inclus')}
              </ToggleChip>
              <ToggleChip active={b.expertises[name] === 'Non-inclus'} tone="critical" onClick={() => set(name, 'Non-inclus')}>
                {t('Non inclus')}
              </ToggleChip>
              <ToggleChip active={b.expertises[name] === 'Vérifier'} tone="primary" onClick={() => set(name, 'Vérifier')}>
                {t('À vérifier')}
              </ToggleChip>
            </div>
          </div>
        ))}
      </div>
    </BuilderSection>
  )
}

const WARRANTY_GROUPS: [keyof Builder['warranties'], string, string[]][] = [
  ['fab', 'Manufacturier', ['Non applicable', 'Prolongé IKO ShieldPro Plus 20 ans', 'Prolongé BP 50 ans ferme', 'Voir détail du fabricant', 'Autre']],
  ['mo', "Main-d'œuvre", ['Non applicable', '5 ans', '10 ans', 'Autre']],
  ['offre', 'Validité', ['24 h', '48 h', '30 jours', '60 jours', 'Autre']],
]

export function GarantiesSection({ b }: { b: Builder }) {
  return (
    <BuilderSection id="garanties" title={t('Garanties')}>
      <div className="space-y-4">
        {WARRANTY_GROUPS.map(([key, label, options]) => (
          <div key={key}>
            <p className="label-caps mb-1.5">{t(label)}</p>
            <div className="flex flex-wrap gap-1.5">
              {options.map((o) => (
                <ToggleChip key={o} active={b.warranties[key] === o} onClick={() => b.setWarranties({ ...b.warranties, [key]: o })}>
                  {t(o)}
                </ToggleChip>
              ))}
            </div>
          </div>
        ))}
      </div>
    </BuilderSection>
  )
}
