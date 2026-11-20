import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Download, Search, UserPlus, Users, Workflow, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { Select } from '../components/filters'
import { SkeletonRows } from '../components/states'
import { Avatar, CompanyBadge, Empty, Page, PageHeader } from '../components/ui'
import { useApp } from '../context/AppContext'
import { CLIENT_COMPANIES, TOTAL_CLIENTS, companiesServing, relativeDay } from '../data/clients'
import { CLIENTS, COMPANIES, clientLang, fullName, type CompanyId } from '../data/mock'
import { request, useStore } from '../data/store'
import { openCreate } from '../lib/create'
import { toast } from '../lib/toast'
import { cn, normalize, num } from '../lib/utils'
import { t } from '../i18n'

export default function Clients() {
  useStore()
  const navigate = useNavigate()
  const { scope } = useApp()
  const { can } = useAuth()
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let live = true
    request(null, { ms: 350 }).then(() => live && setLoading(false))
    return () => {
      live = false
    }
  }, [])
  const [query, setQuery] = useState('')
  const [type, setType] = useState('Tous')
  const [company, setCompany] = useState('Toutes')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    setCompany('Toutes')
    setSelected(new Set())
  }, [scope])

  const rows = CLIENTS.map((c) => ({ c, served: companiesServing(c) })).filter((r) => {
    if ((scope !== 'all' && !r.served.includes(scope)) || (company !== 'Toutes' && !r.served.includes(company as CompanyId)) || (type !== 'Tous' && r.c.type !== type)) return false
    if (query.trim()) {
      const q = normalize(query.trim())
      const digits = query.replace(/\D/g, '')
      const hay = normalize(`${fullName(r.c)} ${r.c.company ?? ''} ${r.c.email} ${r.c.no} ${r.c.street} ${r.c.city} ${r.c.postal}`)
      const phones = (r.c.phone + (r.c.mobile ?? '')).replace(/\D/g, '')
      if (!hay.includes(q) && !(digits.length >= 3 && phones.includes(digits))) return false
    }
    return true
  })
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.c.id))
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <Page>
      <PageHeader
        title={t('Clients')}
        actions={
          <>
            {can('clients.export') && (
              <button onClick={() => toast(t('Export CSV lancé'))} className="btn btn-sm btn-secondary">
                <Download className="w-4 h-4" />
                {t('Exporter')}
              </button>
            )}
            <button onClick={() => openCreate('client', { company: scope !== 'all' ? scope : undefined })} className="btn btn-sm btn-primary">
              <UserPlus className="w-4 h-4" />
              {t('Nouveau client')}
            </button>
          </>
        }
      />
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Nom, téléphone, adresse, courriel…')} className="form-input pl-9 bg-white" aria-label={t('Rechercher un client')} />
        </div>
        <Select value={type} onChange={setType} options={[{ value: 'Tous', label: t('Tous les types') }, ...['Résidentiel', 'Commercial', 'Entrepreneur'].map((ty) => ({ value: ty, label: t(ty) }))]} className="sm:w-44 [&>button]:h-10 [&>button]:bg-white" />
        {scope === 'all' && <Select value={company} onChange={setCompany} options={[{ value: 'Toutes', label: t('Toutes les compagnies') }, ...COMPANIES.map((c) => ({ value: c.id as string, label: c.name }))]} className="sm:w-52 [&>button]:h-10 [&>button]:bg-white" />}
      </div>
      {selected.size > 0 && (
        <div className="sticky top-20 z-20 bg-ink text-white rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-3 shadow-float menu-in">
          <span className="text-sm font-semibold tnum">
            {selected.size > 1 ? t('{n} sélectionnés', { n: selected.size }) : t('{n} sélectionné', { n: selected.size })}
          </span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <button
              onClick={() => {
                toast(t('Relance démarrée'))
                setSelected(new Set())
              }}
              className="btn btn-xs bg-white text-ink hover:bg-sand"
            >
              <Workflow className="w-3.5 h-3.5" />
              {t('Relancer')}
            </button>
            <button onClick={() => toast(t('Export de la sélection'))} className="btn btn-xs bg-white/15 text-white hover:bg-white/25">
              <Download className="w-3.5 h-3.5" />
              {t('Exporter')}
            </button>
            <button onClick={() => setSelected(new Set())} className="p-1.5 rounded-md hover:bg-white/15" aria-label={t('Annuler la sélection')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {loading && <SkeletonRows rows={8} />}
        <div className={cn('overflow-x-auto', loading && 'hidden')}>
          <table className="w-full min-w-[720px] [&_td]:px-3 [&_th]:px-3">
            <thead className="border-b border-hairline">
              <tr>
                <th className="th w-10">
                  <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.c.id)))} className="accent-[var(--color-primary)]" aria-label={t('Tout sélectionner')} />
                </th>
                <th className="th">{t('Client')}</th>
                <th className="th">{t('Téléphone')}</th>
                <th className="th">{t('Ville')}</th>
                {scope === 'all' && <th className="th">{t('Compagnies')}</th>}
                <th className="th">{t('Activité')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.slice(0, 25).map(({ c, served }) => (
                <tr key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className={cn('cursor-pointer hover:bg-sand/60 transition-colors', selected.has(c.id) && 'bg-primary-wash')}>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-[var(--color-primary)]" aria-label={t('Sélectionner {name}', { name: fullName(c) })} />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={fullName(c)} size="sm" />
                      <span className="text-sm font-semibold text-ink truncate">{fullName(c)}</span>
                      {clientLang(c) === 'en' && (
                        <span className="badge bg-sand text-ink-mute uppercase shrink-0" title={t('Communique en anglais')}>
                          {t('EN')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="td tnum">{c.mobile ?? c.phone}</td>
                  <td className="td">{c.city}</td>
                  {scope === 'all' && (
                    <td className="td">
                      <div className="flex flex-wrap gap-1">{served.length ? served.map((id) => <CompanyBadge key={id} id={id} />) : <span className="text-ink-faint">—</span>}</div>
                    </td>
                  )}
                  <td className="td text-xs whitespace-nowrap text-ink-mute">{relativeDay(c.lastActivity)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <Empty icon={Users} title={t('Aucun client trouvé.')}>
                      {query.trim() ? t('Vérifiez l’orthographe ou cherchez par téléphone.') : t('Créez une fiche avec « Nouveau client ».')}
                    </Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-hairline flex items-center justify-between text-xs text-ink-mute">
          <span className="tnum">
            {t('1 – {n} de {total}', { n: Math.min(25, rows.length), total: num(TOTAL_CLIENTS[scope] + Object.values(CLIENT_COMPANIES).filter((cs) => scope === 'all' || cs.includes(scope)).length) })}
          </span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-md hover:bg-sand" aria-label={t('Page précédente')} disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            {[1, 2, 3].map((p) => (
              <button key={p} className={cn('w-7 h-7 rounded-md text-xs font-semibold tnum', p === 1 ? 'bg-ink text-white' : 'hover:bg-sand')}>
                {p}
              </button>
            ))}
            <button className="p-1.5 rounded-md hover:bg-sand" aria-label={t('Page suivante')}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Page>
  )
}
