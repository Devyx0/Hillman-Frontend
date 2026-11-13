import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, LayoutTemplate, ListChecks, Lock, Package, SearchCheck, ShieldCheck, Upload, UserCog, Workflow } from 'lucide-react'
import { Page, PageHeader, Tabs } from '../components/ui'
import { toast } from '../lib/toast'
import { t } from '../i18n'
import { CostItemsTab, ExpertisesTab, TemplatesTab, WarrantiesTab, WorkLinesTab } from './catalogue/CatalogueTabs'
import { CompaniesTab, FollowUpsTab, SecurityTab, UsersTab } from './catalogue/SettingsTabs'

type CatalogueTab = 'travaux' | 'expertises' | 'items' | 'modeles' | 'garanties'
type SettingsTab = 'compagnies' | 'utilisateurs' | 'suivis' | 'securite'

/** Mockup: `r5`. */
function CatalogueView() {
  const [tab, setTab] = useState<CatalogueTab>('travaux')
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
      {tab === 'travaux' && <WorkLinesTab />}
      {tab === 'expertises' && <ExpertisesTab />}
      {tab === 'items' && <CostItemsTab />}
      {tab === 'modeles' && <TemplatesTab />}
      {tab === 'garanties' && <WarrantiesTab />}
    </Page>
  )
}

/** Mockup: `o5`. */
function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>('compagnies')
  return (
    <Page>
      <PageHeader title={t('Paramètres')} />
      <Tabs<SettingsTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'compagnies', label: t('Compagnies'), icon: Building2 },
          { value: 'utilisateurs', label: t('Utilisateurs'), icon: UserCog },
          { value: 'suivis', label: t('Suivis automatiques'), icon: Workflow },
          { value: 'securite', label: t('Sécurité'), icon: Lock },
        ]}
      />
      {tab === 'compagnies' && <CompaniesTab />}
      {tab === 'utilisateurs' && <UsersTab />}
      {tab === 'suivis' && <FollowUpsTab />}
      {tab === 'securite' && <SecurityTab />}
    </Page>
  )
}

/** `/catalogue` — also renders Paramètres when `?tab=parametres` (mockup: `i5`). */
export default function Catalogue() {
  const [params] = useSearchParams()
  return params.get('tab') === 'parametres' ? <SettingsView key="s" /> : <CatalogueView key="c" />
}
