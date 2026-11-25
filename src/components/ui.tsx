import { useEffect, type ComponentType, type ReactNode } from 'react'
import { Bot, Mail, MessageSquare, Phone, StickyNote, X } from 'lucide-react'
import { COMPANY_NAMES, STATUS_TONE, companyById, repById, type CompanyId, type Tone } from '../data/mock'
import { getLang, locale, t } from '../i18n'
import { cn } from '../lib/utils'
import { LOGOS } from '../assets/logos'

export type Icon = ComponentType<{ className?: string }>

/* ── Brand ─────────────────────────────────────────────────────────────── */

/** Mockup: `PN`. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('w-8 h-8', className)} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
      <path d="M7 17.5 16 9l9 8.5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 16v7h10v-7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
    </svg>
  )
}

/** Mockup: `z0`. */
export function Wordmark({ className, sub = true }: { className?: string; sub?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="leading-none">
        <span className="block text-[1.05rem] font-semibold tracking-tight text-ink">hillman</span>
        {sub && <span className="block text-2xs font-semibold uppercase tracking-eyebrow text-ink-mute mt-0.5">{t('Centrale')}</span>}
      </span>
    </span>
  )
}

/** Mockup: `ls`. */
export function CompanyLogo({ id, className }: { id: CompanyId; className?: string }) {
  return <img src={LOGOS[id]} alt={COMPANY_NAMES[id]} className={cn('object-contain object-left select-none', className)} draggable={false} />
}

/** Renders `*text*` segments in the italic serif accent (mockup: `D0`). */
export function AccentText({ text }: { text: string }) {
  const parts = text.split('*')
  if (parts.length === 1) return <>{text}</>
  if (parts.length % 2 === 0) return <>{parts.join('')}</>
  return <>{parts.map((p, i) => (i % 2 === 1 ? <em key={i} className="accent-serif">{p}</em> : p))}</>
}

/* ── Page scaffolding ──────────────────────────────────────────────────── */

/** Mockup: `qa`. */
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn('p-4 md:p-8 mx-auto space-y-6', wide ? 'max-w-[1680px]' : 'max-w-screen-2xl', className)}>{children}</div>
}

/** Mockup: `Hs`. `title` supports `*accent*` markup. */
export function PageHeader({ title, subtitle, eyebrow, actions }: { title: string; subtitle?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow text-ink-mute mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">
          <AccentText text={title} />
        </h1>
        {subtitle && <p className="text-sm text-ink-mute mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

/** Mockup: `ut`. */
export function Card({ children, className, title, icon: IconC, actions, pad = true }: { children?: ReactNode; className?: string; title?: ReactNode; icon?: Icon; actions?: ReactNode; pad?: boolean }) {
  return (
    <section className={cn('bg-white rounded-xl shadow-card overflow-hidden', className)}>
      {title && (
        <header className="px-5 py-3.5 border-b border-hairline flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2 min-w-0">
            {IconC && <IconC className="w-4 h-4 text-ink-mute shrink-0" />}
            <span className="truncate">{title}</span>
          </h3>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}
      <div className={cn(pad && 'p-5')}>{children}</div>
    </section>
  )
}

/** KPI tile (mockup: `Ml`). */
export function Stat({ label, value, sub, icon: IconC, delta, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; icon?: Icon; delta?: number; tone?: 'dark' | 'accent' }) {
  const dark = tone === 'dark'
  const inverse = dark || tone === 'accent'
  return (
    <div className={cn('rounded-xl p-4 md:p-5 flex flex-col gap-2 min-w-0', dark ? 'bg-ink text-white' : tone === 'accent' ? 'bg-primary text-white' : 'bg-white shadow-card')}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('label-caps leading-tight', inverse && 'text-white/70')}>{label}</p>
        {IconC && <IconC className={cn('w-4 h-4 shrink-0', inverse ? 'text-white/70' : 'text-ink-faint')} />}
      </div>
      <p className="text-2xl md:text-[1.75rem] font-semibold tracking-tight tnum leading-none">{value}</p>
      <div className="flex items-center gap-2 text-xs min-h-[1.125rem]">
        {delta !== undefined && (
          <span className={cn('font-semibold tnum', inverse ? 'text-white' : delta >= 0 ? 'text-tone-good-ink' : 'text-tone-critical-ink')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toLocaleString(locale())}
            {getLang() === 'en' ? '%' : ' %'}
          </span>
        )}
        {sub && <span className={cn('truncate', inverse ? 'text-white/70' : 'text-ink-mute')}>{sub}</span>}
      </div>
    </div>
  )
}

/* ── Badges ────────────────────────────────────────────────────────────── */

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-tone-neutral-soft text-tone-neutral-ink',
  info: 'bg-primary-wash text-primary-press',
  accent: 'bg-ink text-white',
  warn: 'bg-tone-warn-soft text-tone-warn-ink',
  good: 'bg-tone-good-soft text-tone-good-ink',
  critical: 'bg-tone-critical-soft text-tone-critical-ink',
}
const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-tone-neutral',
  info: 'bg-primary',
  accent: 'bg-white',
  warn: 'bg-tone-warn',
  good: 'bg-tone-good',
  critical: 'bg-tone-critical',
}

/** Mockup: `sa`. */
export function Badge({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap', TONE_CLASS[tone], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', TONE_DOT[tone])} />}
      {children}
    </span>
  )
}

/** Quote status pill (mockup: `Os`). */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot className={className}>
      {t(status)}
    </Badge>
  )
}

/** Mockup: `ql`. */
export function CompanyBadge({ id, full, className }: { id: string; full?: boolean; className?: string }) {
  const c = companyById(id)
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold border whitespace-nowrap', c.tone, className)}>{full ? c.name : t(c.short)}</span>
}

/* ── Avatars ───────────────────────────────────────────────────────────── */

const AVATAR_SIZE = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-lg',
}
export type AvatarSize = keyof typeof AVATAR_SIZE

const initials = (name: string) =>
  name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

/** Mockup: `Sn`. Colour is hashed from the name unless given. */
export function Avatar({ name, size = 'sm', color, className }: { name: string; size?: AvatarSize; color?: string; className?: string }) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 10
  const c = color ?? `data-${h + 1}`
  return (
    <span className={cn('rounded-full shrink-0 inline-flex items-center justify-center font-bold select-none', AVATAR_SIZE[size], `bg-${c} text-${c}-ink`, className)} title={name}>
      {initials(name)}
    </span>
  )
}

/** Mockup: `Tt`. */
export function RepAvatar({ id, size = 'sm', className }: { id: string; size?: AvatarSize; className?: string }) {
  // Unassigned (or a person not loaded): a neutral avatar instead of a crash.
  const rep = repById(id) ?? { name: '—', color: 'sand' }
  return <Avatar name={rep.name} size={size} color={rep.color} className={className} />
}

/** Mockup: `Cd`. */
export function RepName({ id, size = 'sm' }: { id: string; size?: AvatarSize }) {
  const rep = repById(id) ?? { name: t('Non assigné') }
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <RepAvatar id={id} size={size} />
      <span className="truncate">{rep.name}</span>
    </span>
  )
}

/* ── Tabs / drawer / form bits ─────────────────────────────────────────── */

export interface TabItem<T extends string = string> {
  value: T
  label: ReactNode
  icon?: Icon
  count?: number
}

/** Segmented tabs (mockup: `Gs`). */
export function Tabs<T extends string = string>({ tabs, value, onChange, className }: { tabs: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-1 p-1 bg-white rounded-lg shadow-card overflow-x-auto max-w-full', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn('flex items-center gap-1.5 px-3 h-8 rounded-md text-sm font-semibold whitespace-nowrap transition-colors', value === t.value ? 'bg-ink text-white' : 'text-ink-mute hover:text-ink hover:bg-sand')}
        >
          {t.icon && <t.icon className="w-3.5 h-3.5" />}
          {t.label}
          {t.count !== undefined && <span className={cn('tnum text-2xs px-1.5 rounded-full', value === t.value ? 'bg-white/20' : 'bg-sand text-ink-mute')}>{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/** Channel → icon (mockup: `_0`). */
export const CHANNEL_ICONS: Record<string, Icon> = {
  sms: MessageSquare,
  email: Mail,
  call: Phone,
  ai: Bot,
  note: StickyNote,
  task: Phone,
  wait: StickyNote,
}

/** Right-side drawer (mockup: `Gi`). */
export function Drawer({ open, onClose, title, children, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={cn('relative w-full h-full bg-white shadow-float flex flex-col menu-in', width)}>
        <header className="h-14 px-5 border-b border-hairline flex items-center justify-between shrink-0">
          <h3 className="text-md font-semibold text-ink">{title}</h3>
          <button onClick={onClose} aria-label={t('Fermer')} className="p-1.5 rounded-md text-ink-mute hover:bg-sand">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/** Labelled form field (mockup: `we`). */
export function Field({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('flex flex-col gap-1 min-w-0', className)}>
      <span className="label-caps">{label}</span>
      {children}
    </label>
  )
}

/** Empty state (mockup: `Ts`). */
export function Empty({ icon: IconC, title, children }: { icon: Icon; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-2">
      <IconC className="w-8 h-8 text-ink-faint" />
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <p className="text-xs text-ink-mute max-w-xs">{children}</p>}
    </div>
  )
}
