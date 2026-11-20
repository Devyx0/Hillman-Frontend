import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { ChevronDown, Eraser, PenLine, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/utils'
import { t } from '../../i18n'

/** Priced lines shown to the client (mockup: `Ex`). */
export const PORTAL_PRICE_LINES: { label: string; detail: string; amount: number }[] = [
  { label: 'Réfection complète de la toiture', detail: 'Selon les travaux décrits ci-dessous', amount: 17200 },
  { label: 'Ajout · Ventilateur de faîte Cobra Snowcountry', detail: 'Remplace les ventilateurs statiques existants', amount: 1250 },
]

/** Reasons offered when declining (mockup: `c5`). */
export const REFUSAL_REASONS = ['Prix trop élevé', 'Délai trop long', "Choix d'un autre entrepreneur", 'Projet reporté', 'Autre']

/** Portal section card (mockup: `kl`). */
export function PortalSection({ id, title, kicker, children, className }: { id?: string; title: ReactNode; kicker?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('bg-white rounded-2xl shadow-card p-5 md:p-7 scroll-mt-20', className)}>
      {kicker && <p className="eyebrow text-ink-mute mb-1.5">{kicker}</p>}
      <h2 className="text-xl md:text-2xl font-semibold text-ink tracking-tight mb-4">{title}</h2>
      {children}
    </section>
  )
}

/** Contract terms shown before signing and on the signed copy (mockup: `u5`). */
export const TERMS: { t: string; d: string }[] = [
  { t: 'Droit de résolution', d: "Le consommateur peut résoudre le présent contrat, sans frais ni pénalité, à sa discrétion, dans les 10 jours suivant celui où chacune des parties est en possession d'un double du contrat signé (art. 58 de la Loi sur la protection du consommateur)." },
  { t: 'Validité et modifications', d: "Le prix soumis est valide pour la durée de l'offre indiquée. Tout travail supplémentaire fera l'objet d'un avenant écrit, approuvé par le client avant exécution." },
  { t: 'Dates des travaux', d: 'Les dates sont confirmées après réception de la mise de fond et peuvent être déplacées en raison de la météo.' },
  { t: 'Matériaux et garanties', d: "Les matériaux non utilisés demeurent la propriété de l'entrepreneur. Les garanties s'appliquent une fois le contrat payé en totalité." },
]

/** Collapsible terms & conditions (mockup: `d5`). */
export function TermsAccordion() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-hairline">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldCheck className="w-4 h-4 text-ink-mute" />
          {t('Termes et conditions')}
        </span>
        <span className="flex items-center gap-2 text-2xs text-ink-mute">
          {open ? t('Masquer') : t('Lire')}
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 max-h-72 overflow-y-auto">
          {TERMS.map((s) => (
            <div key={s.t}>
              <p className="text-xs font-semibold text-ink">{t(s.t)}</p>
              <p className="text-xs text-ink-secondary leading-relaxed">{t(s.d)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Freehand signature canvas (mockup: `m5`). `onChange(true)` once something is drawn; `onImage` receives
 * the drawing as a PNG data URL after each stroke (undefined when cleared). `className` sizes the canvas.
 */
export function SignaturePad({ onChange, onImage, className, large }: { onChange: (signed: boolean) => void; onImage?: (dataUrl?: string) => void; className?: string; large?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const drawn = useRef(false)
  const [signed, setSigned] = useState(false)
  const ready = useRef(false)

  const setup = () => {
    if (ready.current) return
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim() || 'black'
    ready.current = true
  }

  useEffect(() => {
    const onResize = () => {
      ready.current = false
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const point = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }
  const start = (e: PointerEvent<HTMLCanvasElement>) => {
    setup()
    drawing.current = true
    canvasRef.current!.setPointerCapture(e.pointerId)
    const [x, y] = point(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const [x, y] = point(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.lineTo(x, y)
    ctx.stroke()
    drawn.current = true
    if (!signed) {
      setSigned(true)
      onChange(true)
    }
  }
  const end = () => {
    if (drawing.current && drawn.current && onImage) onImage(canvasRef.current!.toDataURL('image/png'))
    drawing.current = false
  }
  const clear = () => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    drawn.current = false
    setSigned(false)
    onChange(false)
    onImage?.(undefined)
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className={cn('w-full h-36 rounded-xl border border-dashed border-hairline-strong bg-sand touch-none cursor-crosshair', className)}
        aria-label={t('Zone de signature')}
      />
      {!signed && (
        <span className={cn('pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-ink-faint', large ? 'text-lg' : 'text-sm')}>
          <PenLine className={large ? 'w-5 h-5' : 'w-4 h-4'} />
          {t('Signez ici avec le doigt ou la souris')}
        </span>
      )}
      <div className="absolute left-4 right-4 bottom-8 border-b border-hairline-strong pointer-events-none" />
      {signed && (
        <button onClick={clear} className={cn('absolute top-2 right-2 btn btn-ghost bg-white/80', large ? 'btn-sm' : 'btn-xs')}>
          <Eraser className="w-3.5 h-3.5" />
          {t('Effacer')}
        </button>
      )}
    </div>
  )
}
