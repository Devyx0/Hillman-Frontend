/**
 * `/equipe/chantier/:id` — one job for the field crew: site (directions, call), the work order
 * WITHOUT prices, notes and the job's photos (full-screen viewer, add a photo from the camera).
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarRange, Camera, ChevronLeft, ChevronRight, ClipboardList, CloudRain, Image as ImageIcon, LoaderCircle, MapPin, Package, Phone, StickyNote, Users, Wallet, X } from 'lucide-react'
import { Badge, Card, Page } from '../../components/ui'
import { NoAccess } from '../../components/states'
import { jobById, type JobRecord } from '../../data/crews'
import { companyById, repById } from '../../data/mock'
import { commit, quoteByNo, useStore } from '../../data/store'
import { getDraft, saveDraft, type QuotePhoto } from '../../data/quote-builder'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { dayRange } from '../agenda/crews'
import { readImage } from '../quote-builder/PhotosSection'
import { MATERIAL_TONE, STAGE_TONE, SiteActions, crewStage, jobPhotos, jobSite, telHref, useMyCrew, workOrderLines } from './shared'

const STRIPES = { backgroundImage: 'repeating-linear-gradient(135deg, var(--color-hairline-strong) 0 2px, transparent 2px 14px)' }

/** Adds a photo taken on site to the job's quote photos (mock: kept in the builder draft). */
function addJobPhoto(job: JobRecord, src: string) {
  const q = quoteByNo(job.quoteNo)
  if (!q) return
  const d = getDraft(q)
  const photo: QuotePhoto = { id: 'c' + Date.now(), label: 'Photo de chantier', src }
  saveDraft(q.id, { ...d, photos: [...d.photos, photo] })
  commit()
}

const photoSrc = (p: QuotePhoto) => p.annotated ?? p.src

function PhotoViewer({ photos, index, onIndex, onClose }: { photos: QuotePhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const p = photos[index]
  const prev = () => onIndex((index - 1 + photos.length) % photos.length)
  const next = () => onIndex((index + 1) % photos.length)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  if (!p) return null
  const src = photoSrc(p)
  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label={t(p.label)}>
      <div className="flex items-center gap-3 px-4 h-14 text-white shrink-0">
        <p className="flex-1 min-w-0 truncate text-sm font-semibold">{t(p.label)}</p>
        <span className="text-xs text-white/70 tnum">
          {index + 1} / {photos.length}
        </span>
        <button onClick={onClose} className="p-2 -mr-2 rounded-md hover:bg-white/10" aria-label={t('Fermer')}>
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center">
        {src ? (
          <img src={src} alt={t(p.label)} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-white/60 text-sm">
            <ImageIcon className="w-10 h-10" />
            {t('Photo de démonstration (aucune image)')}
          </div>
        )}
        {photos.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25" aria-label={t('Photo précédente')}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25" aria-label={t('Photo suivante')}>
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function PhotosCard({ job }: { job: JobRecord }) {
  const photos = jobPhotos(job).filter((p) => photoSrc(p) || p.placeholder)
  const canAdd = !!quoteByNo(job.quoteNo)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<number | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      addJobPhoto(job, await readImage(file))
      toast(t('Photo ajoutée au chantier'))
    } catch {
      toast(t("La photo n'a pas pu être ajoutée"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card
      title={t('Photos ({n})', { n: photos.length })}
      icon={ImageIcon}
      actions={
        canAdd && (
          <button className="btn btn-sm btn-primary" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {t('Prendre une photo')}
          </button>
        )
      }
    >
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      {photos.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((p, i) => {
            const src = photoSrc(p)
            return (
              <button key={p.id} onClick={() => setOpen(i)} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone flex flex-col justify-end text-left" aria-label={t('Agrandir {label}', { label: t(p.label) })}>
                {src ? (
                  <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="absolute inset-0 opacity-60" style={STRIPES} />
                    <ImageIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-ink-faint" />
                  </>
                )}
                {p.shapes?.length ? <span className="absolute top-2 left-2 badge bg-primary text-white">{t('Annotée')}</span> : null}
                <span className="relative bg-white/90 px-2.5 py-1.5 text-2xs font-semibold text-ink-secondary truncate">{t(p.label)}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-ink-mute">{t('Aucune photo pour ce chantier.')}</p>
      )}
      {open !== null && <PhotoViewer photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </Card>
  )
}

export default function CrewJob() {
  useStore()
  const { id } = useParams()
  const crew = useMyCrew()
  const job = jobById(id)
  if (!crew || !job || job.crewId !== crew.id) {
    return (
      <Page className="max-w-3xl">
        <Link to="/equipe" className="btn btn-sm btn-ghost -ml-2">
          <ArrowLeft className="w-4 h-4" />
          {t('Mes chantiers')}
        </Link>
        <div className="card">
          <NoAccess>{t("Ce chantier n'est pas assigné à votre équipe.")}</NoAccess>
        </div>
      </Page>
    )
  }

  const site = jobSite(job)
  const company = companyById(job.company)
  const quote = quoteByNo(job.quoteNo)
  const rep = quote ? repById(quote.repId) : undefined
  const lines = workOrderLines(job)
  const notes = job.notes || (quote && getDraft(quote).gutter.note) || t('Protéger l’aménagement paysager. Nettoyer les lieux à la fin des travaux.')
  const stage = crewStage(job.stage)

  return (
    <Page className="max-w-3xl space-y-4">
      <Link to="/equipe" className="btn btn-sm btn-ghost -ml-2">
        <ArrowLeft className="w-4 h-4" />
        {t('Mes chantiers')}
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STAGE_TONE[stage] ?? 'neutral'} dot>
            {t(stage)}
          </Badge>
          <span className="text-xs text-ink-mute tnum">BT-{job.quoteNo}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-ink tracking-tight">{site.name}</h1>
        <p className="text-md text-ink-secondary">{t(job.work)}</p>
        <p className="flex items-center gap-1.5 text-sm text-ink-mute">
          <CalendarRange className="w-4 h-4 shrink-0" />
          {dayRange(job.startDay!, job.days)}
        </p>
      </header>

      <SiteActions site={site} />

      <Card title={t('Adresse et contact')} icon={MapPin}>
        <div className="space-y-3 text-sm">
          <a href={site.maps} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-ink hover:underline">
            <MapPin className="w-4 h-4 text-ink-mute shrink-0 mt-0.5" />
            {site.address}
          </a>
          {site.phones.map((p) => (
            <a key={p} href={telHref(p)} className="flex items-center gap-2 font-semibold text-primary-press">
              <Phone className="w-4 h-4 shrink-0" />
              {p}
            </a>
          ))}
          {rep && <p className="text-xs text-ink-mute">{t('Estimateur : {name}', { name: rep.name })}</p>}
          <p className="text-xs text-ink-mute">
            {t('Bureau : {company}', { company: company.name })} ·{' '}
            <a href={telHref(company.phone)} className="font-semibold text-ink-secondary underline underline-offset-2">
              {company.phone}
            </a>
          </p>
        </div>
      </Card>

      <Card title={t('Bon de travail')} icon={ClipboardList} pad={false}>
        {lines.length ? (
          <table className="w-full text-sm">
            <thead className="bg-sand/60 text-left">
              <tr>
                <th className="px-4 py-2 label-caps">{t('Article')}</th>
                <th className="px-4 py-2 label-caps text-right w-20">{t('Qté')}</th>
                <th className="px-4 py-2 label-caps w-20">{t('Unité')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5">{l.item}</td>
                  <td className="px-4 py-2.5 text-right tnum font-semibold">{l.qty}</td>
                  <td className="px-4 py-2.5 text-ink-mute">{l.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-5 pt-4 text-sm text-ink-secondary">{t(job.work)}</p>
        )}
        <div className="px-5 py-4 space-y-2 text-sm border-t border-hairline">
          <p className="flex flex-wrap items-center gap-2">
            <Package className="w-4 h-4 text-ink-mute shrink-0" />
            {t('Matériaux')}
            <Badge tone={MATERIAL_TONE[job.materials] ?? 'neutral'}>{t(job.materials)}</Badge>
          </p>
          <p className={cn('flex items-start gap-2', !job.deposit && 'text-tone-warn-ink')}>
            <Wallet className="w-4 h-4 shrink-0 mt-0.5" />
            {job.deposit ? t('Dépôt reçu') : t('Dépôt non reçu — ne pas commencer sans l’accord du bureau')}
          </p>
          {job.weather && (
            <p className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-ink-mute shrink-0" />
              {t(job.weather)}
            </p>
          )}
          <p className="flex items-start gap-2 text-ink-secondary">
            <Users className="w-4 h-4 text-ink-mute shrink-0 mt-0.5" />
            {t('Chef : {name}', { name: crew.lead })}
            {crew.members.length > 1 ? ` · ${crew.members.filter((m) => m !== crew.lead).join(', ')}` : ''}
          </p>
          <p className="text-xs text-ink-mute">{t('Aucun prix sur ce document. Quantités à valider sur place.')}</p>
        </div>
      </Card>

      <Card title={t('Notes')} icon={StickyNote}>
        <p className="whitespace-pre-line text-sm text-ink-secondary">{notes}</p>
      </Card>

      <PhotosCard job={job} />
    </Page>
  )
}
