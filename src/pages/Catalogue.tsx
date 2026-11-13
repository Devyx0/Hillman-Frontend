import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, LayoutTemplate, ListChecks, Lock, Package, SearchCheck, ShieldCheck, Upload, UserCog, Workflow } from 'lucide-react'
import { Page, PageHeader, Tabs } from '../components/ui'
import { toast } from '../lib/toast'
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
        title="Catalogue"
        actions={
          <button className="btn btn-sm btn-secondary" onClick={() => toast('Catalogue exporté (Excel)')}>
            <Upload className="w-4 h-4 rotate-180" />
            Exporter
          </button>
        }
      />
      <Tabs<CatalogueTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'travaux', label: 'Travaux', icon: ListChecks },
          { value: 'expertises', label: 'Expertises', icon: SearchCheck },
          { value: 'items', label: 'Items coûtants', icon: Package },
          { value: 'modeles', label: 'Modèles', icon: LayoutTemplate },
          { value: 'garanties', label: 'Garanties', icon: ShieldCheck },
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
      <PageHeader title="Paramètres" />
      <Tabs<SettingsTab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'compagnies', label: 'Compagnies', icon: Building2 },
          { value: 'utilisateurs', label: 'Utilisateurs', icon: UserCog },
          { value: 'suivis', label: 'Suivis automatiques', icon: Workflow },
          { value: 'securite', label: 'Sécurité', icon: Lock },
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
