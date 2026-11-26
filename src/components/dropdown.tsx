/**
 * Styled single-value dropdown — a drop-in replacement for the native `<select>`.
 *
 * Usage stays exactly like a native select: pass `value`, `onChange={(e) => …e.target.value}`
 * and `<option>` / `<optgroup>` children. The children are only read as a description of the
 * choices; the list itself is drawn in a portal so it is never clipped by drawers or cards.
 */
import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { t } from '../i18n'
import { cn, normalize } from '../lib/utils'

/** From this many options a search box appears at the top of the list. */
const SEARCH_THRESHOLD = 9

interface Opt {
  kind: 'option'
  value: string
  label: ReactNode
  text: string
  disabled: boolean
}
interface Group {
  kind: 'group'
  label: string
}
type Row = Opt | Group

export interface DropdownChange {
  target: { value: string }
  currentTarget: { value: string }
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean }
type GroupProps = { label?: string; children?: ReactNode; disabled?: boolean }

function collect(children: ReactNode, out: Row[], groupDisabled = false) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === Fragment) {
      collect((child as ReactElement<{ children?: ReactNode }>).props.children, out, groupDisabled)
    } else if (child.type === 'optgroup') {
      const p = (child as ReactElement<GroupProps>).props
      out.push({ kind: 'group', label: p.label ?? '' })
      collect(p.children, out, groupDisabled || !!p.disabled)
    } else if (child.type === 'option') {
      const p = (child as ReactElement<OptionProps>).props
      const text = textOf(p.children)
      out.push({ kind: 'option', value: p.value === undefined ? text : String(p.value), label: p.children, text, disabled: groupDisabled || !!p.disabled })
    }
  })
}

export function Dropdown({
  value,
  onChange,
  children,
  className,
  disabled = false,
  title,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  placeholder,
}: {
  value: string | number | undefined
  onChange?: (e: DropdownChange) => void
  children?: ReactNode
  className?: string
  disabled?: boolean
  title?: string
  id?: string
  'aria-label'?: string
  'aria-invalid'?: boolean
  placeholder?: string
}) {
  const rows = useMemo(() => {
    const out: Row[] = []
    collect(children, out)
    return out
  }, [children])
  const options = useMemo(() => rows.filter((r): r is Opt => r.kind === 'option'), [rows])
  const current = String(value ?? '')
  const selected = options.find((o) => o.value === current)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const [pos, setPos] = useState<CSSProperties | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const typeahead = useRef({ text: '', at: 0 })
  const listId = useId()
  const showSearch = options.length >= SEARCH_THRESHOLD

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return rows
    const out: Row[] = []
    let group: Group | null = null
    for (const r of rows) {
      if (r.kind === 'group') group = r
      else if (normalize(r.text).includes(q)) {
        if (group) {
          out.push(group)
          group = null
        }
        out.push(r)
      }
    }
    return out
  }, [rows, query])
  const visibleOpts = useMemo(() => visible.filter((r): r is Opt => r.kind === 'option'), [visible])

  const close = useCallback((refocus = true) => {
    setOpen(false)
    setQuery('')
    setPos(null)
    if (refocus) triggerRef.current?.focus()
  }, [])

  const openMenu = () => {
    if (disabled) return
    setActive(Math.max(0, options.findIndex((o) => o.value === current && !o.disabled)))
    setOpen(true)
  }

  const pick = (o: Opt) => {
    if (o.disabled) return
    close()
    if (o.value !== current) onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } })
  }

  // Position the floating list under (or above) the trigger, kept inside the viewport.
  const place = useCallback(() => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const r = trigger.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    const width = Math.min(Math.max(r.width, 176), vw - 16)
    const h = menu.offsetHeight
    const below = vh - r.bottom - 8
    const up = below < Math.min(h, 240) && r.top > below
    const left = Math.min(Math.max(8, r.left), vw - width - 8)
    setPos({
      left,
      minWidth: width,
      maxWidth: vw - 16,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? vh - r.top + 6 : undefined,
      maxHeight: Math.max(160, (up ? r.top : below) - 12),
    })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place, visible.length])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node
      if (!triggerRef.current?.contains(n) && !menuRef.current?.contains(n)) close(false)
    }
    const onMove = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return
      place()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, close, place])

  useEffect(() => {
    if (open && showSearch) {
      const raf = requestAnimationFrame(() => searchRef.current?.focus())
      return () => cancelAnimationFrame(raf)
    }
  }, [open, showSearch])

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open || active < 0) return
    menuRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const step = (from: number, dir: 1 | -1) => {
    const n = visibleOpts.length
    for (let i = 1; i <= n; i++) {
      const idx = (from + dir * i + n) % n
      if (!visibleOpts[idx].disabled) return idx
    }
    return from
  }

  const onKey = (e: KeyboardEvent) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openMenu()
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        close()
        return
      case 'Tab':
        close(false)
        return
      case 'ArrowDown':
        e.preventDefault()
        setActive((a) => step(a, 1))
        return
      case 'ArrowUp':
        e.preventDefault()
        setActive((a) => step(a, -1))
        return
      case 'Home':
        e.preventDefault()
        setActive(step(-1, 1))
        return
      case 'End':
        e.preventDefault()
        setActive(step(visibleOpts.length, -1))
        return
      case 'Enter':
        e.preventDefault()
        if (visibleOpts[active]) pick(visibleOpts[active])
        return
    }
    // Type-to-jump when there is no search box.
    if (!showSearch && e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (e.key === ' ' && !typeahead.current.text) {
        e.preventDefault()
        if (visibleOpts[active]) pick(visibleOpts[active])
        return
      }
      const now = Date.now()
      const ta = typeahead.current
      ta.text = (now - ta.at > 700 ? '' : ta.text) + normalize(e.key)
      ta.at = now
      const hit = visibleOpts.findIndex((o) => !o.disabled && normalize(o.text).startsWith(ta.text))
      if (hit >= 0) setActive(hit)
    }
  }

  let optIdx = -1
  const activeId = open && active >= 0 ? `${listId}-${active}` : undefined

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={showSearch ? undefined : activeId}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKey}
        className={cn(
          'form-input inline-flex items-center gap-2 text-left select-none',
          className,
          'pr-2',
          open && 'border-primary ring-2 ring-ring',
          disabled && 'opacity-60 cursor-not-allowed bg-sand',
        )}
      >
        <span className={cn('flex-1 min-w-0 truncate', !selected && 'text-ink-faint')}>{selected ? selected.label : (placeholder ?? (current || '—'))}</span>
        <ChevronDown aria-hidden className={cn('w-4 h-4 shrink-0 text-ink-mute transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={pos ?? { visibility: 'hidden', top: 0, left: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[100] flex flex-col bg-white rounded-lg border border-hairline shadow-xl overflow-hidden menu-in"
          >
            {showSearch && (
              <div className="relative border-b border-hairline p-2 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActive(0)
                  }}
                  onKeyDown={onKey}
                  placeholder={t('Rechercher…')}
                  aria-label={t('Filtrer les options')}
                  aria-controls={listId}
                  aria-activedescendant={activeId}
                  className="w-full pl-7 pr-2 py-1.5 rounded-md bg-sand text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/25"
                />
              </div>
            )}
            <div id={listId} role="listbox" aria-label={ariaLabel} className="py-1 overflow-y-auto overscroll-contain">
              {visibleOpts.length === 0 && <p className="px-3 py-4 text-center text-xs text-ink-mute">{t('Aucun résultat')}</p>}
              {visible.map((r, i) => {
                if (r.kind === 'group')
                  return (
                    <div key={`g${i}`} role="presentation" className="px-3 pt-2.5 pb-1 text-2xs font-semibold uppercase tracking-eyebrow text-ink-mute truncate">
                      {r.label}
                    </div>
                  )
                optIdx++
                const idx = optIdx
                const on = r.value === current
                return (
                  <div
                    key={`o${i}`}
                    id={`${listId}-${idx}`}
                    data-idx={idx}
                    role="option"
                    aria-selected={on}
                    aria-disabled={r.disabled || undefined}
                    onMouseMove={() => !r.disabled && active !== idx && setActive(idx)}
                    onClick={() => pick(r)}
                    className={cn(
                      'mx-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors',
                      r.disabled ? 'text-ink-faint cursor-not-allowed' : idx === active ? 'bg-sand text-ink' : 'text-ink-secondary',
                      on && 'font-semibold text-primary-press',
                    )}
                  >
                    <span className="flex-1 min-w-0 truncate">{r.label}</span>
                    <Check aria-hidden className={cn('w-4 h-4 shrink-0 text-primary', !on && 'invisible')} strokeWidth={2.5} />
                  </div>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
