import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, Circle, Eraser, Save, Type, Undo2, X } from 'lucide-react'
import type { QuotePhoto, Shape, ShapeKind } from '../../data/quote-builder'
import { t } from '../../i18n'
import { cn } from '../../lib/utils'

const COLORS = ['#e5484d', '#f5a524', '#ffffff', '#3b82f6', '#16a34a']
const TOOLS: [ShapeKind, string, typeof ArrowUpRight][] = [
  ['arrow', 'Flèche', ArrowUpRight],
  ['circle', 'Cercle', Circle],
  ['text', 'Texte', Type],
]

/** Grey striped stand-in for seeded demo photos that have no image. */
function placeholderCanvas(label: string) {
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 900
  const g = c.getContext('2d')!
  g.fillStyle = '#e7e3dc'
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = '#d3cdc3'
  g.lineWidth = 3
  for (let x = -c.height; x < c.width; x += 28) {
    g.beginPath()
    g.moveTo(x, c.height)
    g.lineTo(x + c.height, 0)
    g.stroke()
  }
  g.fillStyle = '#6b6459'
  g.font = '600 44px system-ui, sans-serif'
  g.textAlign = 'center'
  g.fillText(label, c.width / 2, c.height / 2)
  return c
}

/** Draw annotations on a 2D context of size w × h. */
function drawShapes(g: CanvasRenderingContext2D, shapes: Shape[], w: number, h: number) {
  const lw = Math.max(3, w * 0.006)
  for (const s of shapes) {
    const x1 = s.x1 * w
    const y1 = s.y1 * h
    const x2 = s.x2 * w
    const y2 = s.y2 * h
    g.strokeStyle = s.color
    g.fillStyle = s.color
    g.lineWidth = lw
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.shadowColor = 'rgba(0,0,0,0.45)'
    g.shadowBlur = lw
    if (s.kind === 'arrow') {
      const a = Math.atan2(y2 - y1, x2 - x1)
      const head = lw * 5
      g.beginPath()
      g.moveTo(x1, y1)
      g.lineTo(x2, y2)
      g.stroke()
      g.beginPath()
      g.moveTo(x2, y2)
      g.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45))
      g.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45))
      g.closePath()
      g.fill()
    } else if (s.kind === 'circle') {
      g.beginPath()
      g.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.max(4, Math.abs(x2 - x1) / 2), Math.max(4, Math.abs(y2 - y1) / 2), 0, 0, Math.PI * 2)
      g.stroke()
    } else if (s.text) {
      const size = Math.max(18, w * 0.04)
      g.font = `700 ${size}px system-ui, sans-serif`
      g.textBaseline = 'middle'
      g.shadowBlur = 0
      g.lineWidth = size / 6
      g.strokeStyle = s.color === '#ffffff' ? '#111111' : '#ffffff'
      g.strokeText(s.text, x1, y1)
      g.fillText(s.text, x1, y1)
    }
    g.shadowBlur = 0
  }
}

/**
 * Annotation editor (PDF item 8): draw arrows, circles and text over a photo, in colour, with undo.
 * Saving burns the annotations into a JPEG (thumbnail, PDF, work order) and keeps the shapes so the
 * photo can be re-edited from the original.
 */
export function AnnotationEditor({ photo, onSave, onClose }: { photo: QuotePhoto; onSave: (annotated: string, shapes: Shape[]) => void; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const base = useRef<HTMLCanvasElement | HTMLImageElement | null>(null)
  const [ready, setReady] = useState(!photo.src)
  const [shapes, setShapes] = useState<Shape[]>(photo.shapes ?? [])
  const [drag, setDrag] = useState<Shape | null>(null)
  const [tool, setTool] = useState<ShapeKind>('arrow')
  const [color, setColor] = useState(COLORS[0])
  const [text, setText] = useState('')

  // Load the original photo (or the placeholder) once.
  useEffect(() => {
    if (!photo.src) {
      base.current = placeholderCanvas(t(photo.label))
      return
    }
    const img = new Image()
    // Remote photos (signed storage URLs) must load with CORS, or the canvas could not be exported.
    if (/^https?:/.test(photo.src)) img.crossOrigin = 'anonymous'
    img.onload = () => {
      base.current = img
      setReady(true)
    }
    img.src = photo.src
  }, [photo])

  // Redraw on every change.
  useEffect(() => {
    const c = canvas.current
    const b = base.current
    if (!c || !b || !ready) return
    const w = b instanceof HTMLImageElement ? b.naturalWidth : b.width
    const h = b instanceof HTMLImageElement ? b.naturalHeight : b.height
    if (c.width !== w) c.width = w
    if (c.height !== h) c.height = h
    const g = c.getContext('2d')!
    g.drawImage(b, 0, 0, w, h)
    drawShapes(g, drag ? [...shapes, drag] : shapes, w, h)
  }, [ready, shapes, drag])

  // Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const point = (e: ReactPointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }
  const down = (e: ReactPointerEvent) => {
    const p = point(e)
    if (tool === 'text') {
      const value = text.trim()
      if (value) setShapes((s) => [...s, { kind: 'text', color, x1: p.x, y1: p.y, x2: p.x, y2: p.y, text: value }])
      return
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDrag({ kind: tool, color, x1: p.x, y1: p.y, x2: p.x, y2: p.y })
  }
  const move = (e: ReactPointerEvent) => {
    if (!drag) return
    const p = point(e)
    setDrag({ ...drag, x2: p.x, y2: p.y })
  }
  const up = () => {
    if (drag && (Math.abs(drag.x2 - drag.x1) > 0.01 || Math.abs(drag.y2 - drag.y1) > 0.01)) setShapes((s) => [...s, drag])
    setDrag(null)
  }
  const save = () => {
    const c = canvas.current
    if (!c) return
    let annotated = ''
    try {
      annotated = c.toDataURL('image/jpeg', 0.85)
    } catch {
      /* canvas not exportable: the shapes alone are saved */
    }
    onSave(annotated, shapes)
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-ink/95 text-white" role="dialog" aria-modal="true" aria-label={t('Annoter la photo')}>
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-white/10">
        <p className="text-sm font-semibold mr-auto truncate">{t('Annoter · {label}', { label: t(photo.label) })}</p>
        <button className="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onClick={onClose}>
          <X className="w-4 h-4" />
          {t('Fermer')}
        </button>
        <button className="btn btn-sm btn-primary" onClick={save} disabled={!ready}>
          <Save className="w-4 h-4" />
          {t('Enregistrer')}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 border-b border-white/10">
        <div className="inline-flex rounded-lg bg-white/10 p-0.5" role="radiogroup" aria-label={t('Outil')}>
          {TOOLS.map(([id, label, Icon]) => (
            <button key={id} role="radio" aria-checked={tool === id} onClick={() => setTool(id)} className={cn('h-8 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5', tool === id ? 'bg-white text-ink' : 'text-white/80 hover:text-white')}>
              <Icon className="w-4 h-4" />
              {t(label)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label={t('Couleur')}>
          {COLORS.map((c) => (
            <button key={c} role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} className={cn('w-7 h-7 rounded-full border-2', color === c ? 'border-white scale-110' : 'border-white/30')} style={{ background: c }} />
          ))}
        </div>
        {tool === 'text' && <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Texte, puis touchez la photo')} className="h-8 px-2.5 rounded-md bg-white text-ink text-sm w-full sm:w-56" autoFocus />}
        <span className="flex-1" />
        <button className="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onClick={() => setShapes((s) => s.slice(0, -1))} disabled={!shapes.length}>
          <Undo2 className="w-4 h-4" />
          {t('Annuler le dernier')}
        </button>
        <button className="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onClick={() => setShapes([])} disabled={!shapes.length}>
          <Eraser className="w-4 h-4" />
          {t('Tout effacer')}
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6 overflow-auto">
        {ready ? (
          <canvas
            ref={canvas}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            className="max-w-full max-h-full rounded-md shadow-2xl touch-none cursor-crosshair"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <p className="text-sm text-white/70">{t('Chargement…')}</p>
        )}
      </div>
      <p className="px-4 pb-3 text-center text-2xs text-white/60">{tool === 'text' ? t('Écrivez le texte, puis touchez la photo pour le placer.') : t('Glissez sur la photo pour dessiner.')}</p>
    </div>,
    document.body,
  )
}
