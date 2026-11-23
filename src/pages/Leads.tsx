import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Inbox, Plus, Search } from 'lucide-react'
import { Select } from '../components/filters'
import { LeadStageBadge } from '../components/leads'
import { SkeletonRows } from '../components/states'
import { Avatar, CompanyBadge, Empty, Page, PageHeader, RepAvatar, Tabs } from '../components/ui'
import { useAccess } from '../auth/access'
import { inScope, useApp } from '../context/AppContext'
import { ALL_LEADS, LEAD_PROFILES, channelStyle, leadBucket, leadStage, type LeadBucket } from '../data/leads'
import { repById } from '../data/mock'
import { activeSources } from '../data/settings'
import { request, useStore } from '../data/store'
import { t } from '../i18n'
import { openCreate } from '../lib/create'
import { cn, normalize } from '../lib/utils'

type Filter = 'all' | LeadBucket

/** Leads inbox (mockup: `C3`). */
export default function Leads() {
  useStore()
  const { scope } = useApp()
  const access = useAccess()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('all')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let live = true
    request(null, { ms: 350 }).then(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [])

  // Sources offered by the filter: the active list from Settings, plus any older source still on a lead.
  const sourceOptions = [...new Set([...activeSources(), ...ALL_LEADS.map((l) => l.channel)])]
  // Without `leads.viewAll` a rep sees only the leads assigned to them (or that they created).
  const leads = ALL_LEADS.filter((l) => inScope(scope, l.company) && access.lead(l))
  const inFunnel = (l: (typeof leads)[number]) => leadStage(l) >= 0 && leadStage(l) < 4
  const count = (f: Filter) => (f === 'all' ? leads.filter(inFunnel).length : leads.filter((l) => leadBucket(l) === f).length)
  const work = (l: (typeof leads)[number]) => (LEAD_PROFILES[l.id] ? t(LEAD_PROFILES[l.id].work) : l.message || '—')
  const rows = leads
    .filter((l) => (filter === 'all' ? inFunnel(l) : leadBucket(l) === filter))
    .filter((l) => source === 'all' || l.channel === source)
    .filter((l) => !query || normalize(`${l.name} ${l.phone} ${l.city} ${l.email ?? ''} ${work(l)}`).includes(normalize(query)))

  return (
    <Page>
      <PageHeader
        title={access.seesAll.leads ? t('Leads') : t('Vos leads')}
        subtitle={access.seesAll.leads ? undefined : t('Les leads qui vous sont assignés')}
        actions={
          <button className="btn btn-sm btn-primary" onClick={() => openCreate('lead', { company: scope !== 'all' ? scope : undefined })}>
            <Plus className="w-4 h-4" />
            {t('Ajouter un lead')}
          </button>
        }
      />
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: t('Tous'), count: count('all') },
            { value: 'new', label: t('Nouveaux'), count: count('new') },
            { value: 'qualified', label: t('Qualifiés'), count: count('qualified') },
            { value: 'booked', label: t('RDV réservés'), count: count('booked') },
            { value: 'converted', label: t('Convertis'), count: count('converted') },
            { value: 'lost', label: t('Non qualifiés'), count: count('lost') },
          ]}
        />
        <Select value={source} onChange={setSource} options={[{ value: 'all', label: t('Toutes les sources') }, ...sourceOptions.map((s) => ({ value: s, label: t(s) }))]} className="md:ml-auto md:w-52 [&>button]:h-10 [&>button]:bg-white" />
        <label className="relative md:w-72">
          <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Rechercher…')} className="form-input pl-9" aria-label={t('Rechercher un lead')} />
        </label>
      </div>
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <SkeletonRows rows={6} />
        ) : (
          <>
            <table className="w-full hidden md:table">
              <thead className="border-b border-hairline">
                <tr>
                  <th className="th">{t('Nom')}</th>
                  <th className="th">{t('Demande')}</th>
                  <th className="th">{t('Source')}</th>
                  <th className="th">{t('Étape')}</th>
                  <th className="th">{t('Responsable')}</th>
                  <th className="th text-right">{t('Reçu')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((l) => {
                  const ch = channelStyle(l.channel)
                  return (
                    <tr key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="hover:bg-sand/60 cursor-pointer">
                      <td className="td">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={l.name} size="md" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-ink truncate">{l.name}</p>
                            <p className="text-xs text-ink-mute">{l.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <span className="line-clamp-1">{work(l)}</span>
                        {scope === 'all' && <CompanyBadge id={l.company} className="mt-1" />}
                      </td>
                      <td className="td">
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <span className={cn('w-6 h-6 rounded-md flex items-center justify-center', ch.tone)}>
                            <ch.icon className="w-3.5 h-3.5" />
                          </span>
                          {t(l.channel)}
                        </span>
                      </td>
                      <td className="td">
                        <LeadStageBadge lead={l} />
                      </td>
                      <td className="td">
                        <span className="inline-flex items-center gap-2">
                          <RepAvatar id={l.repId ?? 'jph'} size="sm" />
                          <span className="truncate">{repById(l.repId ?? 'jph')!.first}</span>
                        </span>
                      </td>
                      <td className="td text-right text-xs text-ink-mute whitespace-nowrap">{t(l.ago)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <ul className="md:hidden divide-y divide-hairline">
              {rows.map((l) => (
                <li key={l.id}>
                  <button onClick={() => navigate(`/leads/${l.id}`)} className="w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-sand/60">
                    <Avatar name={l.name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink truncate">{l.name}</span>
                      <span className="block text-xs text-ink-mute truncate">
                        {work(l)} · {l.city}
                      </span>
                    </span>
                    <LeadStageBadge lead={l} />
                  </button>
                </li>
              ))}
            </ul>
            {rows.length === 0 && (
              <Empty icon={Inbox} title={t('Aucun lead')}>
                {query || source !== 'all' ? t('Aucun lead ne correspond à ces filtres.') : t('Les nouvelles demandes (site web, appels, références) arrivent ici.')}
              </Empty>
            )}
          </>
        )}
      </div>
    </Page>
  )
}
