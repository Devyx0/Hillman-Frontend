import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { LeadStageBadge } from '../components/leads'
import { Avatar, CompanyBadge, Page, PageHeader, RepAvatar, Tabs } from '../components/ui'
import { inScope, useApp } from '../context/AppContext'
import { ALL_LEADS, LEAD_PROFILES, channelStyle, leadBucket, leadStage, type LeadBucket } from '../data/leads'
import { repById } from '../data/mock'
import { t } from '../i18n'
import { toast } from '../lib/toast'
import { cn, normalize } from '../lib/utils'

type Filter = 'all' | LeadBucket

/** Leads inbox (mockup: `C3`). */
export default function Leads() {
  const { scope } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const leads = useMemo(() => ALL_LEADS.filter((l) => inScope(scope, l.company)), [scope])
  const count = (f: Filter) => (f === 'all' ? leads.filter((l) => leadStage(l) >= 0).length : leads.filter((l) => leadBucket(l) === f).length)
  const rows = leads
    .filter((l) => (filter === 'all' ? leadStage(l) >= 0 : leadBucket(l) === filter))
    .filter((l) => !query || normalize(`${l.name} ${l.phone} ${l.city} ${l.email ?? ''} ${LEAD_PROFILES[l.id]?.work ?? ''}`).includes(normalize(query)))

  return (
    <Page>
      <PageHeader
        title={t('Leads')}
        actions={
          <button className="btn btn-sm btn-primary" onClick={() => toast(t('Nouveau lead (démo)'))}>
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
            { value: 'lost', label: t('Non qualifiés'), count: count('lost') },
          ]}
        />
        <label className="relative md:ml-auto md:w-72">
          <Search className="w-4 h-4 text-ink-mute absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Rechercher…')} className="form-input pl-9" aria-label={t('Rechercher un lead')} />
        </label>
      </div>
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
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
                    <span className="line-clamp-1">{LEAD_PROFILES[l.id] ? t(LEAD_PROFILES[l.id].work) : '—'}</span>
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
                    {LEAD_PROFILES[l.id] ? t(LEAD_PROFILES[l.id].work) : undefined} · {l.city}
                  </span>
                </span>
                <LeadStageBadge lead={l} />
              </button>
            </li>
          ))}
        </ul>
        {rows.length === 0 && <p className="px-5 py-12 text-center text-sm text-ink-mute">{t('Aucun lead')}</p>}
      </div>
    </Page>
  )
}
