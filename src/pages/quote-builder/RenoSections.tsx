import { useNavigate } from 'react-router-dom'
import { GitBranch, LayoutList, List } from 'lucide-react'
import { Badge, Field, StatusBadge } from '../../components/ui'
import { BuilderSection, UnitField } from '../../components/quote-shared'
import { draftPricing, getDraft, newVersion, projectVersions } from '../../data/quote-builder'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn, money, pct } from '../../lib/utils'
import { ListMode, StandardMode } from './CoutantsSection'
import { PhotoGrid } from './PhotosSection'
import type { Builder } from './useQuoteBuilder'

/** Rénovations: free-text description of the project, surface, duration and the before photos. */
export function DescriptionSection({ b }: { b: Builder }) {
  return (
    <BuilderSection id="description" title={t('Description')}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <UnitField label={t('Type de travaux')} value={t(b.quote.workType)} />
          <UnitField label={t('Superficie approximative')} value={b.renoArea} suffix={t('pi²')} onChange={b.setRenoArea} />
          <UnitField label={t('Nombre de jours estimés')} value={b.renoDays} suffix={t('j')} onChange={b.setRenoDays} />
        </div>
        <Field label={t('Description du projet')}>
          <textarea
            className="form-input h-auto py-2 leading-relaxed"
            rows={7}
            value={b.description}
            onChange={(e) => b.setDescription(e.target.value)}
            placeholder={t('Décrivez le projet comme au client : besoins, pièces visées, matériaux, contraintes…')}
          />
        </Field>
        <div>
          <p className="label-caps mb-1.5">{t('Photos')}</p>
          <PhotoGrid b={b} />
        </div>
      </div>
    </BuilderSection>
  )
}

/**
 * Rénovations: the price split by budget category, in proportion to the estimate. Costs and margins
 * per category show only with the `quotes.costs` permission (they also edit the estimate lines).
 */
export function BudgetSection({ b }: { b: Builder }) {
  const cats = b.costCats.map((cat) => {
    const rows = b.costs.filter((l) => l.cat === cat)
    const sell = rows.reduce((n, l) => n + l.qty * l.sell, 0)
    const cost = rows.reduce((n, l) => n + l.qty * l.cost, 0)
    return { cat, sell, cost }
  })
  const sellTotal = cats.reduce((n, c) => n + c.sell, 0) || 1
  const rows = cats.map((c) => ({ ...c, budget: (c.sell / sellTotal) * b.subtotal }))
  const modeBtn = (on: boolean) => cn('h-7 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5', on ? 'bg-white text-ink shadow-card' : 'text-ink-mute hover:text-ink')
  return (
    <BuilderSection
      id="budget"
      title={t('Budget par catégorie')}
      actions={
        b.canCosts ? (
          <div className="inline-flex p-0.5 bg-sand rounded-lg" role="radiogroup" aria-label={t('Mode des coûtants')}>
            <button role="radio" aria-checked={b.costMode === 'std'} onClick={() => b.setCostMode('std')} className={modeBtn(b.costMode === 'std')}>
              <LayoutList className="w-3.5 h-3.5" />
              {t('Standard')}
            </button>
            <button role="radio" aria-checked={b.costMode === 'liste'} onClick={() => (b.costMode === 'liste' ? null : b.openList())} className={modeBtn(b.costMode === 'liste')}>
              <List className="w-3.5 h-3.5" />
              {t('Liste')}
            </button>
          </div>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-mute">{t('Aucune catégorie : ajoutez des items au budget.')}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const margin = r.sell ? ((r.sell - r.cost) / r.sell) * 100 : 0
            return (
              <div key={r.cat} className="rounded-lg border border-hairline px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-sm font-semibold text-ink flex-1 min-w-[140px]">{t(r.cat)}</span>
                  {b.canCosts && <span className="text-xs text-ink-mute tnum">{t('Coûtant {amount}', { amount: money(r.cost, false) })}</span>}
                  {b.canCosts && <span className={cn('text-xs font-semibold tnum', margin >= b.target ? 'text-tone-good-ink' : 'text-tone-warn-ink')}>{pct(margin)}</span>}
                  <span className="text-sm font-semibold tnum w-28 text-right">{money(r.budget, false)}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-stone overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(r.budget / (b.subtotal || 1)) * 100}%` }} />
                </div>
              </div>
            )
          })}
          <p className="flex justify-between text-sm font-semibold text-ink px-4 pt-1">
            <span>{t('Total avant taxes')}</span>
            <span className="tnum">{money(b.subtotal, false)}</span>
          </p>
        </div>
      )}
      {b.canCosts && <div className="mt-6 pt-4 border-t border-hairline">{b.costMode === 'liste' ? <ListMode b={b} /> : <StandardMode b={b} />}</div>}
    </BuilderSection>
  )
}

/** Rénovations: V1 / V2… of the same project, switchable, each with its own price. */
export function VersionsSection({ b }: { b: Builder }) {
  const navigate = useNavigate()
  const versions = projectVersions(b.quote)
  const create = () => {
    const next = newVersion(b.quote)
    if (!next) return
    toast(t('Version {n} créée à partir de la version {from} — la version {from} reste consultable', { n: next.version ?? 2, from: b.quote.version ?? 1 }))
    navigate(`/soumissions/${next.id}`)
  }
  return (
    <BuilderSection
      id="versions"
      title={t('Versions')}
      actions={
        <button className="btn btn-sm btn-secondary" onClick={create}>
          <GitBranch className="w-4 h-4" />
          {t('Nouvelle version')}
        </button>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {versions.map((v) => {
          const current = v.id === b.quote.id
          const p = current ? b.pricing : draftPricing(v, getDraft(v))
          return (
            <button
              key={v.id}
              onClick={() => !current && navigate(`/soumissions/${v.id}`)}
              className={cn('text-left rounded-lg border p-4 transition-colors', current ? 'border-primary bg-primary-wash' : 'border-hairline hover:border-ink/40')}
              aria-current={current ? 'page' : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-ink">V{v.version ?? 1}</span>
                <span className="text-xs text-ink-mute tnum">{v.no}</span>
                {current && <Badge tone="info">{t('Affichée')}</Badge>}
                <span className="ml-auto">
                  <StatusBadge status={v.status} />
                </span>
              </div>
              <p className="text-md font-semibold tnum mt-2">{money(p.subtotal, false)}</p>
              <p className="text-xs text-ink-mute tnum">{t('{total} taxes incluses', { total: money(p.total, false) })}</p>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-ink-mute mt-3">{t('Chaque version a son propre prix et sa propre portée. Le client reçoit la version envoyée.')}</p>
    </BuilderSection>
  )
}
