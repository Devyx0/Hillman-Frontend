import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Bell, BookOpen, CalendarDays, CalendarPlus, Check, ChevronDown, ChevronsUpDown, Columns3, FilePenLine, FileText, Inbox, Layers, LogOut, Menu, MessagesSquare, Plus, Search, Settings, Sun, UserPlus, Users, X } from 'lucide-react'
import { CompanyLogo, RepAvatar, StatusBadge, Wordmark, type Icon } from '../components/ui'
import { useApp, type Scope } from '../context/AppContext'
import { CLIENTS, COMPANIES, LEADS, ME, QUOTES, THREADS, clientById, fullName, type CompanyId } from '../data/mock'
import { t } from '../i18n'
import { LanguageSwitch } from '../i18n/LanguageProvider'
import { onToast, toast } from '../lib/toast'
import { openCreate } from '../lib/create'
import CreateHost from '../components/create/CreateHost'
import { ConfirmHost } from '../components/states'
import { cn, money, normalize } from '../lib/utils'

interface NavEntry {
  name: string
  href: string
  icon: Icon
  count?: number
}

const NAV_GROUPS: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Ventes',
    items: [
      { name: "Aujourd'hui", href: '/', icon: Sun },
      { name: 'Leads', href: '/leads', icon: Inbox },
      { name: 'Pipeline', href: '/pipeline', icon: Columns3 },
      { name: 'Soumissions', href: '/soumissions', icon: FilePenLine },
      { name: 'Clients', href: '/clients', icon: Users },
      { name: 'Conversations', href: '/conversations', icon: MessagesSquare },
    ],
  },
  { label: 'Opérations', items: [{ name: 'Agenda', href: '/agenda', icon: CalendarDays }] },
]

const ADMIN_NAV: NavEntry[] = [
  { name: 'Catalogue', href: '/catalogue', icon: BookOpen },
  { name: 'Paramètres', href: '/catalogue?tab=parametres', icon: Settings },
]

function NavItem({ item }: { item: NavEntry }) {
  const location = useLocation()
  const { scope } = useApp()
  const visible = (company: string) => scope === 'all' || scope === company
  const count =
    item.href === '/leads'
      ? LEADS.filter((l) => visible(l.company) && l.status !== 'Non qualifié' && l.status !== 'RDV réservé').length
      : item.href === '/conversations'
        ? THREADS.filter((t) => visible(t.company)).reduce((n, t) => n + t.unread, 0)
        : item.count
  const onSettings = location.pathname === '/catalogue' && location.search.includes('tab=parametres')
  const resolve = (isActive: boolean) => (item.href.includes('?') ? onSettings : item.href === '/catalogue' ? isActive && !onSettings : isActive)
  return (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      className={({ isActive }) => cn('group flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors', resolve(isActive) ? 'bg-primary text-white' : 'text-ink-mute hover:text-ink hover:bg-sand')}
    >
      {({ isActive }) => {
        const active = resolve(isActive)
        return (
          <>
            <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-ink-mute group-hover:text-ink')} />
            <span className="flex-1 truncate">{t(item.name)}</span>
            {count ? <span className={cn('tnum text-2xs font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center', active ? 'bg-white text-primary-press' : 'bg-primary text-white')}>{count}</span> : null}
          </>
        )
      }}
    </NavLink>
  )
}

function CompanySwitcher({ onPick }: { onPick?: () => void }) {
  const { scope, setScope } = useApp()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const current = scope === 'all' ? null : COMPANIES.find((c) => c.id === scope)
  const choose = (s: Scope) => {
    setScope(s)
    setOpen(false)
    onPick?.()
    toast(s === 'all' ? t('Vue Groupe Hillman — les 3 compagnies') : t('Compte : {name}', { name: COMPANIES.find((c) => c.id === s)!.name }))
  }
  const openQuotes = (id: CompanyId) => QUOTES.filter((q) => q.company === id && ['En soumission', 'À rappeler', 'Rappel courriel envoyé'].includes(q.status)).length
  return (
    <div className="relative w-full">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('Changer de compagnie')}
        className={cn('w-full h-12 pl-3 pr-2 rounded-lg border flex items-center gap-2 text-left transition-colors', open ? 'border-primary ring-2 ring-ring bg-white' : 'border-hairline hover:border-hairline-strong hover:bg-sand')}
      >
        <span className="flex-1 min-w-0 flex items-center h-full">{current ? <CompanyLogo id={current.id} className="h-8 max-w-[150px]" /> : <Wordmark sub={false} />}</span>
        <ChevronsUpDown className="w-4 h-4 text-ink-mute shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-[19rem] bg-white rounded-xl border border-hairline shadow-float overflow-hidden menu-in" role="listbox">
            <p className="label-caps px-4 pt-3 pb-2">{t('Compagnies')}</p>
            <div className="px-2 pb-2 space-y-1">
              {COMPANIES.map((c) => (
                <button key={c.id} role="option" aria-selected={scope === c.id} onClick={() => choose(c.id)} className={cn('w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors', scope === c.id ? 'bg-primary-wash ring-1 ring-primary/30' : 'hover:bg-sand')}>
                  <span className="w-24 h-10 rounded-md bg-white border border-hairline flex items-center justify-center px-1.5 shrink-0">
                    <CompanyLogo id={c.id} className="max-h-7 w-full object-center" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink truncate">{c.name}</span>
                    <span className="block text-2xs text-ink-mute tnum">
                      {t('{n} soumissions ouvertes', { n: openQuotes(c.id) })} · {c.phone}
                    </span>
                  </span>
                  {scope === c.id && <Check className="w-4 h-4 text-primary-press shrink-0" />}
                </button>
              ))}
            </div>
            <div className="border-t border-hairline p-2">
              <button role="option" aria-selected={scope === 'all'} onClick={() => choose('all')} className={cn('w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors', scope === 'all' ? 'bg-primary-wash ring-1 ring-primary/30' : 'hover:bg-sand')}>
                <span className="w-24 h-10 rounded-md bg-sand flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-ink-mute" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">Groupe Hillman</span>
                  <span className="block text-2xs text-ink-mute">{t("Vue d'ensemble des 3 compagnies · admin")}</span>
                </span>
                {scope === 'all' && <Check className="w-4 h-4 text-primary-press shrink-0" />}
              </button>
              <button
                onClick={() => {
                  setOpen(false)
                  onPick?.()
                  navigate('/catalogue?tab=parametres')
                }}
                className="w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-md text-xs font-semibold text-ink-mute hover:text-ink hover:bg-sand"
              >
                <Settings className="w-3.5 h-3.5" />
                {t('Gérer les compagnies')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function NewMenu() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const items: { label: string; icon: Icon; go: () => void }[] = [
    { label: t('Soumission'), icon: FileText, go: () => openCreate('quote') },
    { label: t('Client'), icon: UserPlus, go: () => openCreate('client') },
    { label: t('Lead'), icon: Inbox, go: () => openCreate('lead') },
    { label: t('Rendez-vous'), icon: CalendarPlus, go: () => navigate('/agenda') },
  ]
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn btn-sm btn-primary">
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">{t('Nouveau')}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-80" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white rounded-lg border border-hairline shadow-xl py-1 menu-in">
            {items.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setOpen(false)
                  it.go()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ink-secondary hover:bg-sand"
              >
                <it.icon className="w-4 h-4 text-ink-mute" />
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useApp()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  useEffect(() => {
    if (!paletteOpen) setQuery('')
  }, [paletteOpen])
  const results = useMemo(() => {
    const q = normalize(query.trim())
    const quotes = QUOTES.filter((x) => !q || normalize(`${x.no} ${fullName(clientById(x.clientId)!)} ${x.city} ${x.workType}`).includes(q)).slice(0, 5)
    const clients = CLIENTS.filter((c) => !q || normalize(`${fullName(c)} ${c.phone} ${c.mobile ?? ''} ${c.street} ${c.city} ${c.email}`).includes(q)).slice(0, 5)
    return { quotes, clients }
  }, [query])
  if (!paletteOpen) return null
  const go = (to: string) => {
    setPaletteOpen(false)
    navigate(to)
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/30" onClick={() => setPaletteOpen(false)} />
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-float overflow-hidden menu-in">
        <div className="flex items-center gap-3 px-4 h-14 border-b border-hairline">
          <Search className="w-4 h-4 text-ink-mute" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Nom, téléphone, adresse, no de soumission…')} className="flex-1 text-md outline-none placeholder:text-ink-faint" aria-label={t('Recherche globale')} />
          <kbd className="text-2xs text-ink-mute bg-sand px-1.5 py-0.5 rounded">{t('Échap')}</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          <p className="label-caps px-3 pt-2 pb-1">{t('Soumissions')}</p>
          {results.quotes.map((q) => (
            <button key={q.id} onClick={() => go(`/soumissions/${q.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sand text-left">
              <FilePenLine className="w-4 h-4 text-ink-mute shrink-0" />
              <span className="text-sm font-semibold text-ink tnum w-16">{q.no}</span>
              <span className="text-sm text-ink-secondary truncate flex-1">
                {fullName(clientById(q.clientId)!)} · {q.city}
              </span>
              <StatusBadge status={q.status} />
              <span className="text-sm font-semibold tnum w-24 text-right">{money(q.amount, false)}</span>
            </button>
          ))}
          <p className="label-caps px-3 pt-3 pb-1">{t('Clients')}</p>
          {results.clients.map((c) => (
            <button key={c.id} onClick={() => go(`/clients/${c.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sand text-left">
              <Users className="w-4 h-4 text-ink-mute shrink-0" />
              <span className="text-sm font-semibold text-ink truncate flex-1">{fullName(c)}</span>
              <span className="text-xs text-ink-mute tnum">{c.phone}</span>
              <span className="text-xs text-ink-mute truncate w-48">
                {c.no}, {c.street}, {c.city}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Toaster() {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    onToast((m) => {
      setMessage(m)
      window.setTimeout(() => setMessage(null), 2600)
    })
  }, [])
  if (!message) return null
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] bg-ink text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-float menu-in flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-lime" />
      {message}
    </div>
  )
}

export default function AppLayout() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { setPaletteOpen, scope } = useApp()

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo(0, 0)
    document.querySelector('main')?.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setPaletteOpen])

  const sidebar = (
    <div className="flex flex-col h-full bg-white">
      <div className="h-16 px-3 flex items-center gap-1 shrink-0 border-b border-hairline">
        <CompanySwitcher onPick={() => setMenuOpen(false)} />
        <button className="md:hidden p-1.5 rounded-md text-ink-mute hover:bg-sand" onClick={() => setMenuOpen(false)} aria-label={t('Fermer le menu')}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto nav-scroll space-y-5">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className="space-y-0.5">
            <p className="label-caps px-3 pb-1.5">{t(g.label)}</p>
            {g.items.map((it) => (
              <NavItem key={it.href} item={it} />
            ))}
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-hairline px-3 py-3 space-y-0.5">
        <p className="label-caps px-3 pb-1.5">{t('Administration')}</p>
        {ADMIN_NAV.map((it) => (
          <NavItem key={it.name} item={it} />
        ))}
        <div className="flex items-center gap-3 px-3 py-2 mt-2 rounded-md hover:bg-sand transition-colors">
          <RepAvatar id={ME.id} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink-secondary truncate">{ME.name}</p>
            <p className="text-2xs text-ink-mute truncate">{t('Administrateur · accès aux 3 comptes')}</p>
          </div>
          <LogOut className="w-3.5 h-3.5 text-ink-faint" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-sand flex font-sans">
      <aside className={cn('fixed md:sticky top-0 left-0 z-50 h-screen w-60 border-r border-hairline shrink-0 transition-transform duration-300', menuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>{sidebar}</aside>
      {menuOpen && <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setMenuOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-hairline flex items-center gap-3 px-4 md:px-6 sticky top-0 z-30">
          <button onClick={() => setMenuOpen(true)} className="md:hidden p-2 -ml-2 text-ink-mute hover:bg-sand rounded-md" aria-label={t('Menu')}>
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => setMenuOpen(true)} className="md:hidden shrink-0 h-9 flex items-center" aria-label={t('Changer de compagnie')}>
            {scope === 'all' ? <Wordmark sub={false} /> : <CompanyLogo id={scope} className="h-6 max-w-[96px]" />}
          </button>
          <button onClick={() => setPaletteOpen(true)} className="flex-1 min-w-0 max-w-xl h-9 px-3 rounded-md bg-sand hover:bg-stone transition-colors flex items-center gap-2 text-sm text-ink-faint text-left">
            <Search className="w-4 h-4 text-ink-mute" />
            <span className="flex-1 truncate hidden sm:block">{t('Rechercher un client, une adresse, un no…')}</span>
            <span className="flex-1 truncate sm:hidden">{t('Rechercher…')}</span>
            <kbd className="hidden sm:inline text-2xs text-ink-mute bg-white px-1.5 py-0.5 rounded border border-hairline">⌘ K</kbd>
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <LanguageSwitch />
            <button className="relative p-2 rounded-md text-ink-mute hover:bg-sand" aria-label={t('Notifications')} onClick={() => toast(t("Isabelle Gagnon vient d'ouvrir H64320 (3e fois)"))}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white" />
            </button>
            <NewMenu />
          </div>
        </header>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
        <footer className="px-6 py-4 text-2xs text-ink-faint flex items-center justify-between border-t border-hairline bg-white/40">
          <span>{t('Maquette interactive · données fictives')}</span>
        </footer>
      </div>
      <CommandPalette />
      <CreateHost />
      <ConfirmHost />
      <Toaster />
    </div>
  )
}
