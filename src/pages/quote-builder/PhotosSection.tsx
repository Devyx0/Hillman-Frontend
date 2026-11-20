import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, CircleCheck, CircleDashed, Image as ImageIcon, PenLine, Star, Trash2, Upload } from 'lucide-react'
import type { QuotePhoto } from '../../data/quote-builder'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { BuilderSection } from '../../components/quote-shared'
import { AnnotationEditor } from './AnnotationEditor'
import type { Builder } from './useQuoteBuilder'

/** Read an image file and shrink it to at most 1600 px (keeps the session light, like the upload will). Also used by the crew job page. */
export function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight))
        const c = document.createElement('canvas')
        c.width = Math.round(img.naturalWidth * scale)
        c.height = Math.round(img.naturalHeight * scale)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

const STRIPES = { backgroundImage: 'repeating-linear-gradient(135deg, var(--color-hairline-strong) 0 2px, transparent 2px 14px)' }

function Tile({ photo, onAnnotate, onTake, onRemove }: { photo: QuotePhoto; onAnnotate: () => void; onTake: () => void; onRemove?: () => void }) {
  const img = photo.annotated ?? photo.src
  const has = !!img || !!photo.placeholder
  return (
    <figure className={cn('relative aspect-[4/3] rounded-lg overflow-hidden flex flex-col justify-end', has ? 'bg-stone' : 'border-2 border-dashed border-hairline-strong bg-white')}>
      {img ? (
        <img src={img} alt={t(photo.label)} className="absolute inset-0 w-full h-full object-cover" />
      ) : photo.placeholder ? (
        <>
          <div className="absolute inset-0 opacity-60" style={STRIPES} />
          <ImageIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-ink-faint" />
        </>
      ) : (
        <button onClick={onTake} className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-ink-mute hover:text-primary-press">
          <Camera className="w-6 h-6" />
          <span className="text-2xs font-semibold">{t('À prendre')}</span>
        </button>
      )}
      <div className="absolute top-2 left-2 right-2 flex gap-1">
        {photo.main && (
          <span className="badge bg-ink text-white">
            <Star className="w-3 h-3 mr-1" />
            {t('Principale')}
          </span>
        )}
        {photo.shapes?.length ? <span className="badge bg-primary text-white">{t('Annotée')}</span> : null}
        <span className="flex-1" />
        {has && (
          <button onClick={onAnnotate} className="h-7 px-2 rounded-md bg-white/95 text-ink text-2xs font-semibold inline-flex items-center gap-1 shadow-card hover:bg-white" aria-label={t('Annoter {label}', { label: t(photo.label) })}>
            <PenLine className="w-3.5 h-3.5" />
            {t('Annoter')}
          </button>
        )}
        {onRemove && (
          <button onClick={onRemove} className="h-7 w-7 rounded-md bg-white/95 text-ink-mute inline-flex items-center justify-center shadow-card hover:text-tone-critical-ink" aria-label={t('Retirer la photo')}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <figcaption className="relative bg-white/90 px-2.5 py-1.5 text-2xs font-semibold text-ink-secondary flex items-center gap-1.5">
        {photo.required && (has ? <CircleCheck className="w-3.5 h-3.5 text-tone-good shrink-0" /> : <CircleDashed className="w-3.5 h-3.5 text-tone-warn shrink-0" />)}
        <span className="truncate">{t(photo.label)}</span>
      </figcaption>
    </figure>
  )
}

/**
 * Site photos (PDF item 8): required-photo checklist for the job type, in-app camera on phones
 * (`capture="environment"`), file picker on desktop, and the annotation editor.
 */
export function PhotoGrid({ b }: { b: Builder }) {
  const { photos, setPhotos } = b
  const camera = useRef<HTMLInputElement>(null)
  const files = useRef<HTMLInputElement>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [editing, setEditing] = useState<QuotePhoto | null>(null)
  const required = photos.filter((p) => p.required)
  const takenRequired = required.filter((p) => p.src || p.placeholder).length

  const take = (id: string | null) => {
    setSlot(id)
    camera.current?.click()
  }
  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = [...(e.target.files ?? [])]
    e.target.value = ''
    if (!list.length) return
    try {
      const urls = await Promise.all(list.map(readImage))
      setPhotos((prev) => {
        const next = [...prev]
        for (const src of urls) {
          // A chosen slot first, then the first missing required photo, then a free photo.
          const target = slot ? next.findIndex((p) => p.id === slot) : next.findIndex((p) => p.required && !p.src && !p.placeholder)
          if (target >= 0 && !(slot === null && next[target].src)) next[target] = { ...next[target], src, annotated: undefined, shapes: undefined, placeholder: false }
          else next.push({ id: 'p' + Date.now() + next.length, label: t('Photo {n}', { n: next.filter((p) => !p.required).length + 1 }), src })
        }
        return next
      })
      toast(list.length > 1 ? t('{n} photos ajoutées', { n: list.length }) : t('Photo ajoutée'))
    } catch {
      toast(t("Impossible de lire l'image"))
    }
    setSlot(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('text-xs font-semibold mr-auto', takenRequired === required.length ? 'text-tone-good-ink' : 'text-tone-warn-ink')}>
          {t('Photos obligatoires : {n}/{total}', { n: takenRequired, total: required.length })}
        </p>
        <button className="btn btn-sm btn-primary" onClick={() => take(null)}>
          <Camera className="w-4 h-4" />
          {t('Prendre une photo')}
        </button>
        <button className="btn btn-sm btn-secondary" onClick={() => files.current?.click()}>
          <Upload className="w-4 h-4" />
          {t('Choisir des fichiers')}
        </button>
        {/* Phones open the camera; desktops fall back to the file picker. */}
        <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFiles} />
        <input ref={files} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {photos.map((p) => (
          <Tile
            key={p.id}
            photo={p}
            onTake={() => take(p.id)}
            onAnnotate={() => setEditing(p)}
            onRemove={p.required ? (p.src ? () => setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, src: undefined, annotated: undefined, shapes: undefined } : x))) : undefined) : () => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
          />
        ))}
      </div>
      {editing && (
        <AnnotationEditor
          photo={editing}
          onClose={() => setEditing(null)}
          onSave={(annotated, shapes) => {
            setPhotos((prev) => prev.map((x) => (x.id === editing.id ? { ...x, annotated, shapes } : x)))
            setEditing(null)
            toast(t('Annotations enregistrées'))
          }}
        />
      )}
    </div>
  )
}

/** Gouttières: photos tab. */
export function PhotosSection({ b }: { b: Builder }) {
  return (
    <BuilderSection id="photos" title={t('Photos')}>
      <PhotoGrid b={b} />
    </BuilderSection>
  )
}
