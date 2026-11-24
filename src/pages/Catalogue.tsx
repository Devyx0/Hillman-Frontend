import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutTemplate, ListChecks, Lock, Package, SearchCheck, ShieldCheck, Upload } from 'lucide-react'
import { Page, PageHeader, Tabs } from '../components/ui'
import { Select } from '../components/filters'
import { ErrorState, Loading, NoAccess, Notice } from '../components/states'
import { useAuth } from '../auth/AuthContext'
import { request } from '../data/store'
import { toast } from '../lib/toast'
import { cn } from '../lib/utils'
import { t } from '../i18n'
import { API_MODE } from '../api/config'
import { ApiCatalogueView } from './catalogue/ApiCatalogueView'
import { CatalogueEditContext, CostItemsTab, ExpertisesTab, TemplatesTab, WarrantiesTab, WorkLinesTab } from './catalogue/CatalogueTabs'
import { SETTINGS_GROUPS, SETTINGS_SECTIONS, type SettingsSection, type SettingsSectionId } from './catalogue/SettingsTabs'

type CatalogueTab = 'travaux' | 'expertises' | 'items' | 'modeles' | 'garanties'
const CATALOGUE_TABS: CatalogueTab[] = ['travaux', 'expertises', 'items', 'modeles', 'garanties']

/** Simulated fetch on mount so every screen has a loading and an error state (`&erreur=1` forces the error). */
function Loader({ children, fail }: { children: ReactNode; fail: boolean }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    request(null, { ms: 250, fail: fail && attempt === 0 })
      .then(() => live && setState('ready'))
      .catch(() => live && setState('error'))
    return () => {
      live = false
    }
  }, [fail, attempt])
  if (state === 'loading') return <Loading />
  if (state === 'error')
    return (
      <div className="card">
        <ErrorState
          onRetry={() => {
            setState('loading')
            setAttempt((a) => a + 1)
          }}
        />
      </div>
    )
  return <>{children}</>
}

/** Mockup: `r5`. */
function CatalogueView() {
  const { can } = useAuth()
  const [params, setParams] = useSearchParams()
  const fromUrl = params.get('onglet') as CatalogueTab | null
  const tab: CatalogueTab = fromUrl && CATALOGUE_TABS.includes(fromUrl) ? fromUrl : 'travaux'
  const setTab = (v: CatalogueTab) =>
    setParams(
      (p) => {
        p.set('onglet', v)
        return p
      },
      { replace: true },
    )
  const canEdit = can('catalogue.edit')
  return (
    <Page>
      <PageHeader
        title={t('Catalogue')}
        actions={
          <button className="btn btn-sm btn-secondary" onClick={() => toast(t('Catalogue exporté (Excel)'))}>
            <Upload className="w-4 h-4 rotate-180" />
            {t('Exporter')}
          </button>
        }
      />
      <Tabs<CatalogueTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'travaux', label: t('Travaux'), icon: ListChecks },
          { value: 'expertises', label: t('Expertises'), icon: SearchCheck },
          { value: 'items', label: t('Items coûtants'), icon: Package },
          { value: 'modeles', label: t('Modèles'), icon: LayoutTemplate },
          { value: 'garanties', label: t('Garanties'), icon: ShieldCheck },
        ]}
      />
      {!canEdit && (
        <Notice tone="info">
          <Lock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          {t('Lecture seule : consultez le catalogue pour choisir les items de vos soumissions.')}
        </Notice>
      )}
      <CatalogueEditContext.Provider value={canEdit}>
        <Loader key={tab} fail={params.get('erreur') === '1'}>
          {tab === 'travaux' && <WorkLinesTab />}
          {tab === 'expertises' && <ExpertisesTab />}
          {tab === 'items' && <CostItemsTab />}
          {tab === 'modeles' && <TemplatesTab />}
          {tab === 'garanties' && <WarrantiesTab />}
        </Loader>
      </CatalogueEditContext.Provider>
    </Page>
  )
}

/** Mockup: `o5`. Sections: vertical sub-nav on desktop, a select on mobile. */
function SettingsView() {
  const { can, user } = useAuth()
  const [params, setParams] = useSearchParams()
  const allowed = (s: SettingsSection) => s.allowed(can, user)
  const requested = params.get('section') as SettingsSectionId | null
  const current = SETTINGS_SECTIONS.find((s) => s.id === requested) ?? SETTINGS_SECTIONS.find(allowed) ?? SETTINGS_SECTIONS[0]
  const go = (id: SettingsSectionId) =>
    setParams((p) => {
      p.set('section', id)
      return p
    })
  const Section = current.component

  return (
    <Page>
      <PageHeader title={t('Paramètres')} subtitle={t(current.hint)} />
      <div className="grid lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
        <div className="lg:hidden">
          <Select<SettingsSectionId> value={current.id} onChange={go} className="w-full" options={SETTINGS_SECTIONS.map((s) => ({ value: s.id, label: t(s.label) + (allowed(s) ? '' : ` · ${t('accès restreint')}`) }))} />
        </div>
        <nav className="hidden lg:block bg-white rounded-xl shadow-card p-2 sticky top-20" aria-label={t('Sections des paramètres')}>
          {SETTINGS_GROUPS.map((g) => (
            <div key={g} className="mb-1 last:mb-0">
              <p className="label-caps px-3 pt-2 pb-1">{t(g)}</p>
              {SETTINGS_SECTIONS.filter((s) => s.group === g).map((s) => (
                <button
                  key={s.id}
                  onClick={() => go(s.id)}
                  aria-current={current.id === s.id ? 'page' : undefined}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left', current.id === s.id ? 'bg-primary-wash text-primary-press font-semibold' : 'text-ink-mute hover:bg-sand hover:text-ink', !allowed(s) && 'opacity-60')}
                >
                  <s.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{t(s.label)}</span>
                  {!allowed(s) && <Lock className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="min-w-0 space-y-4">
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
            <current.icon className="w-5 h-5 text-ink-mute" />
            {t(current.label)}
          </h2>
          {API_MODE && current.id !== 'securite' && (
            <Notice tone="info">{t('Ces paramètres ne sont pas encore enregistrés sur le serveur : les changements restent sur cet appareil jusqu’à la prochaine connexion.')}</Notice>
          )}
          {allowed(current) ? (
            <Loader key={current.id} fail={params.get('erreur') === '1'}>
              <Section />
            </Loader>
          ) : (
            <div className="card">
              <NoAccess />
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

/** `/catalogue` — also renders Paramètres when `?tab=parametres` (mockup: `i5`). `&section=<id>` opens a settings section. */
export default function Catalogue() {
  const [params] = useSearchParams()
  if (params.get('tab') === 'parametres') return <SettingsView key="s" />
  // With the backend the catalogue is the company's, read from the server (read-only in this phase).
  return API_MODE ? <ApiCatalogueView key="a" /> : <CatalogueView key="c" />
}
