/**
 * Agenda calendar pieces. Private copies of mockup helpers that sit just
 * before the Agenda page in the bundle:
 *   $0→DAY_ABBR  Rd→DAY_NAMES  S4→capitalize  zs→TODAY_INDEX  _i→DAY_START
 *   F0→DAY_END  Cl→HOUR_HEIGHT  k4→NOW_HOUR  Bi→formatHour (lib/utils)
 *   zd→AGENDA_REPS  C4→EventChip  M4→layoutLanes  K0→HourGutter
 *   I0→DayColumn  E4→quotePath  T4→JobsStrip  R4→WeekView  z4→DayView
 *   D4→MonthView
 */
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Ban, HardHat, Sparkles } from 'lucide-react'
import { RepAvatar } from '../../components/ui'
import { inScope, useApp } from '../../context/AppContext'
import { JOBS, QUOTES, REPS, companyById, repById, type Appointment } from '../../data/mock'
import { cn, formatHour, money } from '../../lib/utils'

const DAY_ABBR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
export const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Index of "today" (mardi 20 oct.) within the displayed week (dim. 18 → sam. 24). */
export const TODAY_INDEX = 2
const DAY_START = 7
const DAY_END = 18
const HOUR_HEIGHT = 56
const NOW_HOUR = 9.1

/** Reps who have a calendar (everyone but the coordinator). */
export const AGENDA_REPS = REPS.filter((r) => r.id !== 'hpe')

function EventChip({ a, onClick, style, compact }: { a: Appointment; onClick: () => void; style: CSSProperties; compact?: boolean }) {
  const rep = repById(a.repId)!
  if (a.type === 'Non dispo') {
    return (
      <div style={style} className="absolute rounded-md border border-hairline-strong text-2xs text-ink-mute p-1.5 overflow-hidden bg-[repeating-linear-gradient(135deg,var(--color-sand)_0_6px,var(--color-stone)_6px_12px)]">
        <Ban className="w-3 h-3 inline mr-1" />
        Non dispo · {rep.first}
      </div>
    )
  }
  return (
    <button
      onClick={onClick}
      style={style}
      className={cn('absolute text-left rounded-md border-l-[3px] px-1.5 py-1 overflow-hidden hover:shadow-elevated hover:z-20 transition-shadow', `bg-${rep.color} text-${rep.color}-ink border-${rep.color}-ink`)}
    >
      <p className="text-2xs font-bold leading-tight truncate flex items-center gap-1">
        {a.aiBooked && <Sparkles className="w-2.5 h-2.5 shrink-0" />}
        {a.city || a.title}
      </p>
      {!compact && <p className="text-2xs leading-tight truncate opacity-90">{a.title}</p>}
      {!compact && <p className="text-[10px] leading-tight opacity-75 tnum">{formatHour(a.start)}</p>}
    </button>
  )
}

/** Packs overlapping appointments into side-by-side lanes. */
function layoutLanes(evts: Appointment[]) {
  const sorted = [...evts].sort((a, b) => a.start - b.start)
  const out: { a: Appointment; lane: number; of: number }[] = []
  let group: { a: Appointment; lane: number }[] = []
  let groupEnd = -1
  const flush = () => {
    const of = Math.max(1, ...group.map((g) => g.lane + 1))
    group.forEach((g) => out.push({ ...g, of }))
    group = []
  }
  for (const a of sorted) {
    if (a.start >= groupEnd && group.length) flush()
    const taken = new Set(group.filter((g) => g.a.end > a.start).map((g) => g.lane))
    let lane = 0
    while (taken.has(lane)) lane++
    group.push({ a, lane })
    groupEnd = Math.max(groupEnd, a.end)
  }
  flush()
  return out
}

function HourGutter() {
  return (
    <div className="w-12 shrink-0">
      {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
        <div key={i} style={{ height: HOUR_HEIGHT }} className="text-2xs text-ink-mute tnum text-right pr-2 -mt-1.5">
          {DAY_START + i} h
        </div>
      ))}
    </div>
  )
}

function DayColumn({ evts, onOpen, today, dot = true }: { evts: Appointment[]; onOpen: (a: Appointment) => void; today?: boolean; dot?: boolean }) {
  return (
    <div className={cn('relative flex-1 min-w-0 border-l border-hairline grid-bg', today && 'bg-primary-wash/50')} style={{ height: (DAY_END - DAY_START) * HOUR_HEIGHT, backgroundSize: `100% ${HOUR_HEIGHT}px` }}>
      {layoutLanes(evts).map(({ a, lane, of }) => (
        <EventChip
          key={a.id}
          a={a}
          onClick={() => onOpen(a)}
          compact={a.end - a.start < 1}
          style={{ top: (a.start - DAY_START) * HOUR_HEIGHT + 1, height: (a.end - a.start) * HOUR_HEIGHT - 3, left: `calc(${(lane / of) * 100}% + 2px)`, width: `calc(${100 / of}% - 4px)` }}
        />
      ))}
      {today && (
        <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: (NOW_HOUR - DAY_START) * HOUR_HEIGHT }}>
          {dot && <span className="w-2 h-2 rounded-full bg-tone-critical -ml-1" />}
          <span className="flex-1 h-px bg-tone-critical" />
        </div>
      )}
    </div>
  )
}

const quotePath = (no: string) => {
  const q = QUOTES.find((x) => x.no === no)
  return q ? `/soumissions/${q.id}` : '/soumissions'
}

/** Strip of scheduled jobs ("jours de travaux") above the week grid. */
function JobsStrip({ cols }: { cols: number[] }) {
  const { scope } = useApp()
  const jobs = JOBS.filter((j) => j.startDay !== undefined && j.crewId && inScope(scope, j.company) && j.startDay <= 4 && j.startDay + j.days > 0)
  return (
    <div className="flex border-b border-hairline bg-sand/60">
      <div className="w-12 shrink-0 flex items-center justify-end pr-2">
        <HardHat className="w-3.5 h-3.5 text-ink-mute" aria-label="Jours de travaux" />
      </div>
      <div className="flex-1 relative py-1.5" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, minmax(0,1fr))`, gridAutoRows: '22px', rowGap: 3 }}>
        {jobs.map((j) => {
          const from = Math.max(1, j.startDay! + 1)
          const to = Math.min(6, j.startDay! + j.days)
          const col = cols.indexOf(from)
          if (col < 0) return null
          const span = Math.max(1, cols.filter((c) => c >= from && c <= to).length)
          return (
            <Link
              key={j.id}
              to={quotePath(j.quoteNo)}
              style={{ gridColumn: `${col + 1} / span ${span}` }}
              className={cn('mx-0.5 rounded px-1.5 text-2xs font-semibold truncate flex items-center gap-1 border', companyById(j.company).tone)}
              title={`${j.client} · ${j.quoteNo} · ${money(j.amount, false)}`}
            >
              <span className="truncate">
                {j.client} · {j.quoteNo}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function WeekView({ evts, onOpen, showJobs }: { evts: Appointment[]; onOpen: (a: Appointment) => void; showJobs: boolean }) {
  const days = [0, 1, 2, 3, 4, 5, 6]
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="flex border-b border-hairline">
          <div className="w-12 shrink-0" />
          {days.map((d) => (
            <div key={d} className={cn('flex-1 py-2.5 text-center border-l border-hairline', d === TODAY_INDEX && 'bg-primary-wash/50')}>
              <p className="label-caps">{DAY_ABBR[d]}</p>
              <p className={cn('text-lg font-semibold tnum mx-auto w-8 h-8 rounded-full flex items-center justify-center', d === TODAY_INDEX ? 'bg-primary text-white' : 'text-ink')}>{18 + d}</p>
            </div>
          ))}
        </div>
        {showJobs && <JobsStrip cols={days} />}
        <div className="flex pt-2 max-h-[620px] overflow-y-auto">
          <HourGutter />
          {days.map((d) => (
            <DayColumn key={d} today={d === TODAY_INDEX} evts={evts.filter((e) => e.day === d)} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function DayView({ evts, reps, onOpen }: { evts: Appointment[]; reps: string[]; onOpen: (a: Appointment) => void }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="flex border-b border-hairline">
          <div className="w-12 shrink-0" />
          {reps.map((id) => (
            <div key={id} className="flex-1 py-2.5 px-2 border-l border-hairline flex items-center justify-center gap-2 min-w-0">
              <RepAvatar id={id} size="sm" />
              <span className="text-xs font-semibold text-ink truncate">{repById(id)!.first}</span>
              <span className="text-2xs text-ink-mute tnum">{evts.filter((e) => e.repId === id && e.day === TODAY_INDEX).length}</span>
            </div>
          ))}
        </div>
        <div className="flex pt-2 max-h-[620px] overflow-y-auto">
          <HourGutter />
          {reps.map((id, i) => (
            <DayColumn key={id} today dot={i === 0} evts={evts.filter((e) => e.repId === id && e.day === TODAY_INDEX)} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function MonthView({ evts, onPickWeek }: { evts: Appointment[]; onPickWeek: () => void }) {
  const cells = Array.from({ length: 35 }, (_, i) => i - 4 + 1)
  const weekend = (d: number) => new Date(2026, 9, d).getDay() % 6 === 0
  const countFor = (d: number) =>
    d >= 18 && d <= 24
      ? evts.filter((e) => e.day === d - 18 && e.type !== 'Non dispo').length
      : d < 1 || d > 31
        ? 0
        : d > 24
          ? Math.max(0, ((d * 7) % 9) - (weekend(d) ? 9 : 0))
          : ((d * 5) % 11) + (weekend(d) ? -8 : 2)
  return (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-px bg-hairline rounded-lg overflow-hidden">
        {DAY_ABBR.map((d) => (
          <div key={d} className="bg-sand label-caps text-center py-2">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          const inMonth = d >= 1 && d <= 31
          const count = Math.max(0, countFor(d))
          return (
            <button key={i} onClick={onPickWeek} disabled={!inMonth} className={cn('bg-white min-h-[84px] p-2 text-left flex flex-col gap-1 hover:bg-primary-wash/40 disabled:bg-sand/40 disabled:hover:bg-sand/40', d === 20 && 'ring-2 ring-inset ring-primary')}>
              <span className={cn('text-sm font-semibold tnum', inMonth ? (d === 20 ? 'text-primary-press' : 'text-ink') : 'text-ink-faint')}>{inMonth ? d : ''}</span>
              {inMonth && count > 0 && (
                <>
                  <div className="flex flex-wrap gap-0.5">
                    {Array.from({ length: Math.min(count, 12) }, (_, k) => (
                      <span key={k} className={cn('w-1.5 h-1.5 rounded-full', `bg-${AGENDA_REPS[k % AGENDA_REPS.length].color}-ink`)} />
                    ))}
                  </div>
                  <span className="text-2xs text-ink-mute mt-auto tnum">{count}</span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
