/**
 * Catalogue with the backend: GET /companies/:id/catalogue for one of the user's companies (scope clauses,
 * expertises, cost items, templates, warranties, add-ons). Cost prices are shown to admin and coordination only
 * (the API sends them to these roles only). Editing the catalogue is not part of the API yet: read-only.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutTemplate, ListChecks, Lock, Package, PackagePlus, SearchCheck, ShieldCheck } from 'lucide-react'
import { errorMessage } from '../../api/http'
import { toNum } from '../../api/mappers'
import type { ApiCatalogue, ExpertiseStatus } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { ErrorState, Loading, Notice } from '../../components/states'
import { Card, Empty, Page, PageHeader, Tabs } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { REF, isCostViewer, loadCatalogue, workTypeById } from '../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../data/mock'
import { t } from '../../i18n'
import { money } from '../../lib/utils'

type Tab = 'travaux' | 'expertises' | 'items' | 'modeles' | 'garanties' | 'ajouts'
const TABS: Tab[] = ['travaux', 'expertises', 'items', 'modeles', 'garanties', 'ajouts']
const EXPERTISE_LABEL: Record<ExpertiseStatus, string> = { included: 'Inclus', not_included: 'Non inclus', to_verify: 'À vérifier' }

export function ApiCatalogueView() {
  const { companies } = useAuth()
  const { scope } = useApp()
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('onglet') as Tab | null
  const tab: Tab = fromUrl && TABS.includes(fromUrl) ? fromUrl : 'travaux'
  const setTab = (v: Tab) =>
    setParams(
      (p) => {
        p.set('onglet', v)
        return p
      },
      { replace: true },
    )
  const [company, setCompany] = useState<CompanyId | undefined>(scope !== 'all' && companies.includes(scope) ? scope : companies[0])
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; data?: ApiCatalogue; error?: string }>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!company) return
    let live = true
    setState({ status: 'loading' })
    loadCatalogue(company).then(
      (data) => live && setState({ status: 'ready', data }),
      (e) => live && setState({ status: 'error', error: errorMessage(e) }),
    )
    return () => {
      live = false
    }
  }, [company, attempt])

  const costs = !!company && isCostViewer(company)
  const c = state.data
  const names = c ? catalogueNames(c) : null

  return (
    <Page>
      <PageHeader
        title={t('Catalogue')}
        actions={
          companies.length > 1 && (
            <select className="form-input h-9 w-auto" value={company} onChange={(e) => setCompany(e.target.value as CompanyId)} aria-label={t('Compagnie')}>
              {COMPANIES.filter((x) => companies.includes(x.id)).map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          )
        }
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'travaux', label: t('Travaux'), icon: ListChecks },
          { value: 'expertises', label: t('Expertises'), icon: SearchCheck },
          { value: 'items', label: t('Items coûtants'), icon: Package },
          { value: 'modeles', label: t('Modèles'), icon: LayoutTemplate },
          { value: 'garanties', label: t('Garanties'), icon: ShieldCheck },
          { value: 'ajouts', label: t('Ajouts'), icon: PackagePlus },
        ]}
      />
      <Notice tone="info">
        <Lock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
        {t('Lecture seule : le catalogue de la compagnie, tel qu’enregistré sur le serveur.')}
      </Notice>
      {state.status === 'loading' && <Loading />}
      {state.status === 'error' && (
        <div className="card">
          <ErrorState onRetry={() => setAttempt((n) => n + 1)}>{state.error}</ErrorState>
        </div>
      )}
      {state.status === 'ready' && c && names && company && (
        <>
          {tab === 'travaux' && (
            <div className="space-y-4">
              {c.scope_sections.length === 0 && <EmptyCard />}
              {c.scope_sections.map((sec) => (
                <Card key={sec.id} title={sec.name}>
                  <ul className="space-y-1.5 text-sm">
                    {sec.items.map((i) => (
                      <li key={i.id} className="flex items-start gap-2">
                        <span className={i.is_checked_by_default ? 'text-ink' : 'text-ink-secondary'}>{i.text}</span>
                        {i.is_checked_by_default && <span className="badge bg-tone-good-soft text-tone-good-ink !text-2xs shrink-0">{t('Par défaut')}</span>}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
          {tab === 'expertises' && (
            <Card pad={false}>
              {c.expertise_items.length === 0 ? (
                <EmptyCard />
              ) : (
                <table className="w-full text-sm [&_td]:px-4 [&_th]:px-4">
                  <thead className="border-b border-hairline">
                    <tr>
                      <th className="th">{t('Section')}</th>
                      <th className="th">{t('Expertise')}</th>
                      <th className="th">{t('Par défaut')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {c.expertise_items.map((e) => (
                      <tr key={e.id}>
                        <td className="td text-ink-mute">{e.section_name}</td>
                        <td className="td">{e.text}</td>
                        <td className="td">{t(EXPERTISE_LABEL[e.default_status])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
          {tab === 'items' && (
            <div className="space-y-4">
              {c.cost_general_categories.length === 0 && <EmptyCard />}
              {c.cost_general_categories.map((g) => (
                <Card key={g.id} title={g.name} pad={false} actions={g.print_lines_on_quote ? <span className="text-2xs text-ink-mute">{t('Lignes imprimées sur la soumission')}</span> : undefined}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm [&_td]:px-4 [&_th]:px-4">
                      <thead className="border-b border-hairline">
                        <tr>
                          <th className="th">{t('Item')}</th>
                          <th className="th">{t('Unité')}</th>
                          <th className="th text-right">{t('Prix vendant')}</th>
                          {costs && <th className="th text-right">{t('Coûtant')}</th>}
                        </tr>
                      </thead>
                      {g.categories.map((cat) => (
                        <tbody key={cat.id} className="divide-y divide-hairline">
                          <tr>
                            <td colSpan={costs ? 4 : 3} className="pt-3 pb-1 px-4 text-2xs font-semibold text-ink-mute uppercase tracking-wide">
                              {cat.name}
                            </td>
                          </tr>
                          {cat.items.map((i) => (
                            <tr key={i.id}>
                              <td className="td">{i.name}</td>
                              <td className="td text-ink-mute">{i.unit ?? ''}</td>
                              <td className="td text-right tnum">{money(toNum(i.sell_price))}</td>
                              {costs && <td className="td text-right tnum text-ink-mute">{i.cost_price == null ? '—' : money(toNum(i.cost_price))}</td>}
                            </tr>
                          ))}
                        </tbody>
                      ))}
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {tab === 'modeles' && (
            <div className="space-y-4">
              {c.quote_templates.length === 0 && <EmptyCard />}
              {c.quote_templates.map((tp) => (
                <Card key={tp.id} title={tp.name} actions={<span className="text-2xs text-ink-mute">{tp.work_type_id ? t(workTypeById(company, tp.work_type_id)?.name ?? '') : t('Tous les types de travaux')}</span>}>
                  <ul className="space-y-1 text-sm">
                    {tp.items.map((i) => (
                      <li key={i.id} className="text-ink-secondary">
                        {i.scope_item_id && (
                          <>
                            <span className="text-2xs font-semibold text-ink-mute uppercase mr-1.5">{t('Clause')}</span>
                            {names.scope.get(i.scope_item_id) ?? '—'}
                          </>
                        )}
                        {i.cost_item_id && (
                          <>
                            <span className="text-2xs font-semibold text-ink-mute uppercase mr-1.5">{t('Coûtant')}</span>
                            {names.items.get(i.cost_item_id) ?? '—'}
                            {i.quantity && <span className="tnum"> × {toNum(i.quantity).toLocaleString()}</span>}
                          </>
                        )}
                        {i.addon_preset_id && (
                          <>
                            <span className="text-2xs font-semibold text-ink-mute uppercase mr-1.5">{t('Ajout')}</span>
                            {names.addons.get(i.addon_preset_id) ?? '—'}
                            {i.is_included && <span className="text-ink-mute"> · {t('inclus dans le prix')}</span>}
                          </>
                        )}
                      </li>
                    ))}
                    {tp.items.length === 0 && <li className="text-ink-mute">{t('Modèle vide')}</li>}
                  </ul>
                </Card>
              ))}
            </div>
          )}
          {tab === 'garanties' && (
            <div className="grid md:grid-cols-2 gap-4">
              {c.warranty_groups.length === 0 && <EmptyCard />}
              {c.warranty_groups.map((g) => (
                <Card key={g.id} title={g.name} actions={g.allows_custom_text ? <span className="text-2xs text-ink-mute">{t('Texte libre permis')}</span> : undefined}>
                  <ul className="space-y-1 text-sm text-ink-secondary">
                    {g.options.map((o) => (
                      <li key={o.id}>{o.label}</li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          )}
          {tab === 'ajouts' && (
            <Card pad={false}>
              {c.addon_presets.length === 0 ? (
                <EmptyCard />
              ) : (
                <table className="w-full text-sm [&_td]:px-4 [&_th]:px-4">
                  <thead className="border-b border-hairline">
                    <tr>
                      <th className="th">{t('Ajout')}</th>
                      <th className="th">{t('Groupe d’options')}</th>
                      <th className="th text-right">{t('Montant')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {c.addon_presets.map((a) => (
                      <tr key={a.id}>
                        <td className="td">
                          {a.description}
                          {a.is_client_selectable && <span className="ml-2 badge bg-primary-wash text-primary-press !text-2xs">{t('Au choix du client')}</span>}
                          {a.warranty_text && <span className="block text-2xs text-ink-mute">{a.warranty_text}</span>}
                        </td>
                        <td className="td text-ink-mute">{a.option_group ?? '—'}</td>
                        <td className="td text-right tnum">{money(toNum(a.default_amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </>
      )}
      {!REF.companies.length && <EmptyCard />}
    </Page>
  )
}

function EmptyCard() {
  return (
    <div className="card">
      <Empty icon={Package} title={t('Rien au catalogue pour le moment')} />
    </div>
  )
}

function catalogueNames(c: ApiCatalogue) {
  return {
    scope: new Map(c.scope_sections.flatMap((s) => s.items.map((i) => [i.id, i.text] as const))),
    items: new Map(c.cost_general_categories.flatMap((g) => g.categories.flatMap((cat) => cat.items.map((i) => [i.id, i.name] as const)))),
    addons: new Map(c.addon_presets.map((a) => [a.id, a.description] as const)),
  }
}
