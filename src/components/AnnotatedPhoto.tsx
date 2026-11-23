import { useState } from 'react'
import type { QuotePhoto, Shape } from '../data/quote-builder'
import { t } from '../i18n'
import { cn } from '../lib/utils'

/**
 * A site photo with the estimator's annotations drawn on top (arrows, circles, text), using the same
 * proportions as the annotation editor's canvas. Photos whose annotations were burnt into `annotated`
 * show that image as-is; photos with only `shapes` get them as a live SVG overlay.
 *
 * `fit="cover"` fills a fixed box (thumbnails); `fit="contain"` sizes the frame to the image (viewer).
 */
export function AnnotatedPhoto({ photo, fit = 'cover', className, imgClassName }: { photo: QuotePhoto; fit?: 'cover' | 'contain'; className?: string; imgClassName?: string }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const burnt = !!photo.annotated
  const src = photo.annotated ?? photo.src
  if (!src) return null
  const shapes = !burnt && photo.shapes?.length ? photo.shapes : []
  const img = (
    <img
      src={src}
      alt={t(photo.label)}
      onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth || 1200, h: e.currentTarget.naturalHeight || 900 })}
      className={cn(fit === 'cover' ? 'absolute inset-0 w-full h-full object-cover' : 'block max-w-full max-h-full', imgClassName)}
    />
  )
  if (!shapes.length) return fit === 'cover' ? img : <div className={cn('relative inline-block', className)}>{img}</div>
  const w = size?.w ?? 1200
  const h = size?.h ?? 900
  const overlay = <ShapesOverlay shapes={shapes} w={w} h={h} fit={fit} />
  return fit === 'cover' ? (
    <>
      {img}
      {overlay}
    </>
  ) : (
    <div className={cn('relative inline-block', className)}>
      {img}
      {overlay}
    </div>
  )
}

function ShapesOverlay({ shapes, w, h, fit }: { shapes: Shape[]; w: number; h: number; fit: 'cover' | 'contain' }) {
  const lw = Math.max(3, w * 0.006)
  const font = Math.max(18, w * 0.04)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio={fit === 'cover' ? 'xMidYMid slice' : 'none'} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <defs>
        <filter id="mark-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation={lw / 2} floodColor="#000" floodOpacity=".45" />
        </filter>
      </defs>
      {shapes.map((s, i) => {
        const x1 = s.x1 * w
        const y1 = s.y1 * h
        const x2 = s.x2 * w
        const y2 = s.y2 * h
        if (s.kind === 'arrow') {
          const a = Math.atan2(y2 - y1, x2 - x1)
          const head = lw * 5
          const p1 = `${x2 - head * Math.cos(a - 0.45)},${y2 - head * Math.sin(a - 0.45)}`
          const p2 = `${x2 - head * Math.cos(a + 0.45)},${y2 - head * Math.sin(a + 0.45)}`
          return (
            <g key={i} filter="url(#mark-shadow)">
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.color} strokeWidth={lw} strokeLinecap="round" />
              <polygon points={`${x2},${y2} ${p1} ${p2}`} fill={s.color} />
            </g>
          )
        }
        if (s.kind === 'circle') {
          return <ellipse key={i} cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={Math.max(4, Math.abs(x2 - x1) / 2)} ry={Math.max(4, Math.abs(y2 - y1) / 2)} fill="none" stroke={s.color} strokeWidth={lw} filter="url(#mark-shadow)" />
        }
        if (!s.text) return null
        return (
          <text key={i} x={x1} y={y1} dominantBaseline="middle" fontSize={font} fontWeight={700} fontFamily="system-ui, sans-serif" fill={s.color} stroke={s.color === '#ffffff' ? '#111111' : '#ffffff'} strokeWidth={font / 6} paintOrder="stroke" strokeLinejoin="round">
            {t(s.text)}
          </text>
        )
      })}
    </svg>
  )
}

/** Main photo first, then the others (in their original order). */
export function orderPhotos(photos: QuotePhoto[]) {
  return [...photos.filter((p) => p.main), ...photos.filter((p) => !p.main)]
}
