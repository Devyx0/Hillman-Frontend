import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { t } from '../i18n'
import { cn, normalize } from '../lib/utils'

/** Label above a filter control (mockup: `Es`). */
export function FilterField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
      <label className="text-2xs font-semibold text-ink-mute uppercase tracking-eyebrow px-0.5">{label}</label>
      {children}
    </div>
  )
}

/** White bar holding filter fields (mockup: `J0`). */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="bg-white rounded-xl shadow-card px-4 md:px-5 py-3 md:py-3.5 grid grid-cols-2 md:flex md:flex-wrap items-end gap-3 md:gap-x-6 md:gap-y-3">{children}</div>
}

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  icon?: ReactNode
}

/** Options count from which the search box appears (mockup: `D3`). */
const SEARCH_THRESHOLD = 4

/** Custom dropdown select with optional search (mockup: `ft`). */
export function Select<T extends string = string>({
  value,
  onChange,
  options,
  variant = 'default',
  disabled = false,
  className,
  searchable,
}: {
  value: T
  onChange: (v: T) => void
  options: SelectOption<T>[]
  variant?: 'default' | 'accent'
  disabled?: boolean
  className?: string
  searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const selected = options.find((o) => o.value === value)
  const showSearch = searchable ?? options.length >= SEARCH_THRESHOLD
  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return q ? options.filter((o) => normalize(o.label).includes(q)) : options
  }, [options, query])
  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const choose = (v: T) => {
    onChange(v)
    close()
  }

  useEffect(() => {
    if (open && showSearch) {
      const raf = requestAnimationFrame(() => input.current?.focus())
      return () => cancelAnimationFrame(raf)
    }
  }, [open, showSearch])

  const accent = variant === 'accent'
  return (
    <div ref={root} className={cn('relative max-w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 w-full pl-3 pr-2.5 py-2 rounded-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/25 select-none',
          disabled && 'opacity-40 cursor-not-allowed',
          accent ? 'bg-primary-wash text-primary-press hover:bg-primary-subdued' : 'bg-sand text-ink-secondary hover:bg-stone',
          open && (accent ? 'bg-primary-subdued ring-2 ring-primary/25' : 'bg-stone ring-2 ring-hairline-strong'),
        )}
      >
        {selected?.icon}
        <span className="flex-1 text-left truncate">{selected?.label ?? '—'}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', accent ? 'text-primary-press' : 'text-ink-mute', open && 'rotate-180')} />
      </button>
      {open && (
        <div className={cn('absolute z-50 top-full mt-1.5 left-0 min-w-full bg-white rounded-lg border border-hairline shadow-xl overflow-hidden', 'menu-in')}>
          {showSearch && (
            <div className="relative border-b border-hairline p-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Rechercher…')}
                aria-label={t('Filtrer les options')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered.length === 1) {
                    e.preventDefault()
                    choose(filtered[0].value)
                  }
                }}
                className="w-full pl-7 pr-2 py-1.5 rounded-md bg-sand text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
          )}
          <div className="py-1 max-h-64 overflow-y-auto">
            {filtered.length === 0 && <p className="px-3 py-4 text-center text-xs text-ink-mute">{t('Aucun résultat')}</p>}
            {filtered.map((o) => {
              const active = o.value === value
              return (
                <button key={o.value} type="button" onClick={() => choose(o.value)} className={cn('w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors text-left', active ? 'bg-primary/5 text-primary-press font-semibold' : 'text-ink-secondary hover:bg-sand font-medium')}>
                  <span className="flex items-center gap-2 min-w-0">
                    {o.icon}
                    <span className="truncate" translate="no">
                      {o.label}
                    </span>
                  </span>
                  {active && <Check className="w-3.5 h-3.5 shrink-0 text-primary-press" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
