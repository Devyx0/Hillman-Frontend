/**
 * Multi-value dropdown filter.
 * Minified → exported: Y3 → MultiSelect, vx → CheckMark.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn, normalize } from '../lib/utils'
import type { SelectOption } from './filters'

/** Options count from which the search box appears (mockup: `Q3`). */
const SEARCH_THRESHOLD = 4

/** Checkbox / radio glyph used in option lists (mockup: `vx`). */
function CheckMark({ on, round }: { on: boolean; round?: boolean }) {
  return (
    <span className={cn('shrink-0 inline-flex items-center justify-center w-4 h-4 border transition-colors', round ? 'rounded-full' : 'rounded-xs', on ? 'bg-primary border-primary text-white' : 'bg-white border-hairline-strong')}>
      {on && <Check className="w-3 h-3" strokeWidth={3} />}
    </span>
  )
}

/** Multi-value dropdown; an empty array means "all" (mockup: `Y3`). */
export function MultiSelect({
  values,
  onChange,
  options,
  allLabel,
  allIcon,
  disabled = false,
  className,
  searchable,
}: {
  values: string[]
  onChange: (v: string[]) => void
  options: SelectOption[]
  allLabel: string
  allIcon?: ReactNode
  disabled?: boolean
  className?: string
  searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = useMemo(() => new Set(values), [values])
  const showSearch = searchable ?? options.length >= SEARCH_THRESHOLD
  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return q ? options.filter((o) => normalize(o.label).includes(q)) : options
  }, [options, query])
  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  // Flip the menu to the right edge when it would overflow the viewport.
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!open || !el) return
    if (el.getBoundingClientRect().right > document.documentElement.clientWidth - 8) {
      el.style.left = 'auto'
      el.style.right = '0'
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close()
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
  useEffect(() => {
    if (open && showSearch) {
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open, showSearch])

  const toggle = (v: string) => {
    const next = new Set(selected)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    const known = options.filter((o) => next.has(o.value)).map((o) => o.value)
    const unknown = values.filter((x) => next.has(x) && !options.some((o) => o.value === x))
    onChange([...known, ...unknown])
  }

  const first = options.find((o) => o.value === values[0])
  const extra = values.length - 1
  const any = values.length > 0
  const triggerIcon = any ? first?.icon : allIcon

  return (
    <div ref={rootRef} className={cn('relative max-w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 w-full pl-3 pr-2.5 py-2 rounded-md text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/25 select-none',
          'bg-sand text-ink-secondary hover:bg-stone',
          disabled && 'opacity-40 cursor-not-allowed',
          open && 'bg-stone ring-2 ring-hairline-strong',
        )}
      >
        {triggerIcon && <span className="-my-0.5 inline-flex shrink-0">{triggerIcon}</span>}
        <span className="flex-1 text-left truncate" translate={any ? 'no' : undefined}>
          {any ? (first?.label ?? values[0]) : allLabel}
        </span>
        {extra > 0 && (
          <span
            translate="no"
            title={values.map((v) => options.find((o) => o.value === v)?.label ?? v).join(', ')}
            className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded-full bg-ink text-white text-2xs font-bold tabular-nums"
          >
            +{extra}
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 text-ink-mute transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div ref={menuRef} className={cn('absolute z-50 top-full mt-1.5 left-0 min-w-full max-w-[calc(100vw-1rem)] bg-white rounded-lg border border-hairline shadow-xl overflow-hidden', 'menu-in')}>
          {showSearch && (
            <div className="relative border-b border-hairline p-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                aria-label="Filtrer les options"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered.length === 1) {
                    e.preventDefault()
                    toggle(filtered[0].value)
                    setQuery('')
                  }
                }}
                className="w-full pl-7 pr-2 py-1.5 rounded-md bg-sand text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
          )}
          <div className="py-1 max-h-64 overflow-y-auto" role="listbox" aria-multiselectable="true">
            {!query.trim() && (
              <button
                type="button"
                role="option"
                aria-selected={!any}
                onClick={() => {
                  onChange([])
                  close()
                }}
                className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left border-b border-hairline', any ? 'text-ink-secondary hover:bg-sand font-medium' : 'bg-primary/5 text-primary-press font-semibold')}
              >
                <CheckMark on={!any} round />
                <span className="flex items-center gap-2 min-w-0">
                  {allIcon}
                  <span className="truncate">{allLabel}</span>
                </span>
              </button>
            )}
            {filtered.length === 0 && <p className="px-3 py-4 text-center text-xs text-ink-mute">Aucun résultat</p>}
            {filtered.map((o) => {
              const on = selected.has(o.value)
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(o.value)}
                  className={cn('w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left', on ? 'bg-primary/5 text-primary-press font-semibold' : 'text-ink-secondary hover:bg-sand font-medium')}
                >
                  <CheckMark on={on} />
                  <span className="flex items-center gap-2 min-w-0">
                    {o.icon}
                    <span className="truncate" translate="no">
                      {o.label}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
