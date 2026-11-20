import { Equal, LoaderCircle, Plus, Sparkles, Upload } from 'lucide-react'
import { Field } from '../../components/ui'
import { t } from '../../i18n'
import { toast } from '../../lib/toast'
import { cn, money, pct } from '../../lib/utils'
import { BuilderSection, ToggleChip } from '../../components/quote-shared'
import { CAA_RATE } from '../../data/quote-builder'
import { PhotoGrid } from './PhotosSection'
import type { Builder } from './useQuoteBuilder'

const DOLLAR = <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-mute">$</span>

/** Price, discount, taxes, add-ons and payment schedule. */
export function PrixSection({ b }: { b: Builder }) {
  const sg = b.quote.company === 'sg'
  return (
    <BuilderSection id="prix" title={t('Prix')}>
      <div className="grid md:grid-cols-[260px_1fr] gap-5">
        <div className="space-y-3">
          <Field label={b.tiered ? t('Prix de base (sans protection)') : t('Prix')}>
            <div className="relative">
              <input type="number" value={b.price} onChange={(e) => b.setPrice(Number(e.target.value))} className="form-input pr-8 tnum" />
              {DOLLAR}
            </div>
          </Field>
          <Field label={t('Escompte')}>
            <div className="relative">
              <input type="number" value={b.discount || ''} placeholder="0" onChange={(e) => b.setDiscount(Number(e.target.value))} className="form-input pr-8 tnum" />
              {DOLLAR}
            </div>
          </Field>
          {sg && (
            <div className="rounded-lg border border-hairline p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={b.caa} onChange={() => b.setCaa(!b.caa)} className="w-4 h-4 accent-[var(--color-primary)]" />
                {t('Membre CAA-Québec (−{n} %)', { n: Math.round(CAA_RATE * 100) })}
              </label>
              {b.caa && <input className="form-input h-8 text-sm" value={b.caaNo} onChange={(e) => b.setCaaNo(e.target.value)} placeholder={t('No de membre CAA')} aria-label={t('No de membre CAA')} />}
            </div>
          )}
          <div className="rounded-lg bg-sand p-3 space-y-1 text-sm">
            {b.pricing.lines.length > 1 &&
              b.pricing.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-2 text-ink-secondary">
                  <span className="truncate">{t(l.label, { item: l.item ? t(l.item) : '', n: Math.round(CAA_RATE * 100) })}</span>
                  <span className="tnum">{money(l.amount)}</span>
                </div>
              ))}
            <div className="flex justify-between text-ink font-medium">
              <span>{t('Sous-total')}</span>
              <span className="tnum">{money(b.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-mute">
              <span>{t('TPS')}</span>
              <span className="tnum">{money(b.gst)}</span>
            </div>
            <div className="flex justify-between text-ink-mute">
              <span>{t('TVQ')}</span>
              <span className="tnum">{money(b.qst)}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink pt-1 border-t border-hairline-strong">
              <span>{t('Total')}</span>
              <span className="tnum">{money(b.total)}</span>
            </div>
          </div>
          <Field label={t('Prix depuis un total')}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  inputMode="decimal"
                  value={b.targetTotal}
                  onChange={(e) => b.setTargetTotal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') b.priceFromTotal()
                  }}
                  placeholder={t('ex. 21 000')}
                  className="form-input pr-8 tnum"
                />
                {DOLLAR}
              </div>
              <button className="btn btn-md btn-dark px-3" onClick={b.priceFromTotal} aria-label={t('Calculer le prix à partir du total')} title={t('Calculer le prix à partir du total')}>
                <Equal className="w-4 h-4" />
              </button>
            </div>
          </Field>
        </div>
        <div className="min-w-0 space-y-3">
          {b.tiered && <TierOptions b={b} />}
          <Field label={t('Commentaires')}>
            <textarea value={b.comments} onChange={(e) => b.setComments(e.target.value)} rows={3} className="form-input h-auto py-2" placeholder="" />
          </Field>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="label-caps">{t('Ajout')}</p>
              <button className="btn btn-xs btn-ghost" onClick={() => b.setAddons((prev) => [...prev, { id: 'n' + prev.length, desc: 'Nouvelle ligne', price: 0, included: false }])}>
                <Plus className="w-3.5 h-3.5" />
                {t('Ajouter')}
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-hairline">
              <table className="w-full min-w-[460px] text-sm">
                <thead className="bg-sand/60">
                  <tr>
                    <th className="th">{t('Description')}</th>
                    <th className="th text-right">{t('Prix $')}</th>
                    <th className="th text-center">{t('Inclus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {b.addons.map((a, i) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2 text-ink-secondary">{t(a.desc)}</td>
                      <td className="px-4 py-2 text-right">
                        <input type="number" value={a.price} onChange={(e) => b.setAddons((prev) => prev.map((x, k) => (k === i ? { ...x, price: Number(e.target.value) } : x)))} className="w-24 h-8 px-2 rounded-md border border-hairline-input text-right tnum text-sm focus:outline-none focus:border-primary" aria-label={t('Prix {desc}', { desc: t(a.desc) })} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input type="checkbox" checked={a.included} onChange={() => b.setAddons((prev) => prev.map((x, k) => (k === i ? { ...x, included: !x.included } : x)))} className="w-4 h-4 accent-[var(--color-primary)]" aria-label={t('Inclus : {desc}', { desc: t(a.desc) })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <p className="label-caps mt-6 mb-2">{t('Calendrier des paiements')}</p>
      <div className="flex gap-1.5 mb-3">
        <ToggleChip active={b.payMode === 'std'} onClick={() => b.setPayMode('std')}>
          {t('Standard de la compagnie')}
        </ToggleChip>
        <ToggleChip active={b.payMode === 'autre'} onClick={() => b.setPayMode('autre')}>
          {t('Autre (30 / 70)')}
        </ToggleChip>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {b.schedule.map((step, i) => (
          <div key={i} className="rounded-lg border border-hairline p-3">
            <p className="text-xs text-ink-mute">{t(step.label)}</p>
            <p className="text-lg font-semibold tnum">{pct(step.pct)}</p>
            <p className="text-xs tnum text-ink-secondary">{money((b.total * step.pct) / 100, false)}</p>
          </div>
        ))}
      </div>
    </BuilderSection>
  )
}

/** Gouttières protection tiers (plan: crochet standard, crochet continu, 5000, 1800), offered as options. */
function TierOptions({ b }: { b: Builder }) {
  return (
    <div>
      <p className="label-caps mb-1.5">{t('Options de protection')}</p>
      <div className="rounded-lg border border-hairline divide-y divide-hairline" role="radiogroup" aria-label={t('Options de protection')}>
        {b.tiers.map((tier, i) => {
          const on = b.tier === tier.id
          return (
            <div key={tier.id} className={cn('flex items-center gap-3 px-3 py-2', on && 'bg-primary-wash')}>
              <input type="radio" name="tier" checked={on} onChange={() => b.setTier(tier.id)} className="w-4 h-4 accent-[var(--color-primary)]" aria-label={t(tier.label)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{t(tier.label)}</p>
                <p className="text-2xs text-ink-mute truncate">{t(tier.detail)}</p>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={tier.price}
                  disabled={tier.id === 'standard'}
                  onChange={(e) => b.setTiers((prev) => prev.map((x, k) => (k === i ? { ...x, price: Number(e.target.value) } : x)))}
                  className="w-24 h-8 pl-2 pr-6 rounded-md border border-hairline-input text-right tnum text-sm focus:outline-none focus:border-primary disabled:bg-sand disabled:text-ink-mute"
                  aria-label={t('Prix {desc}', { desc: t(tier.label) })}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs text-ink-mute">$</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-2xs text-ink-mute mt-1">{t('Le client choisit son option dans le portail; l’option cochée ici est celle du total affiché.')}</p>
    </div>
  )
}

/** Client-facing note with the "Rédiger avec l'IA" rewrite. */
export function NotesSection({ b }: { b: Builder }) {
  const { note, rewriting } = b
  return (
    <BuilderSection id="notes" title={t('Notes')}>
      <div className="rounded-lg border border-hairline-input overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-hairline bg-sand/60">
          {['G', 'I', 'S'].map((f) => (
            <button key={f} className={cn('w-7 h-7 rounded text-sm hover:bg-white', f === 'G' && 'font-bold', f === 'I' && 'italic', f === 'S' && 'underline')}>
              {t(f)}
            </button>
          ))}
          <span className="w-px h-5 bg-hairline-strong mx-1" />
          <button className="h-7 px-2 rounded text-xs hover:bg-white">{t('• Liste')}</button>
          <button onClick={b.rewriteNote} className="ml-auto btn btn-xs btn-secondary" disabled={rewriting || !note}>
            {rewriting ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {t("Rédiger avec l'IA")}
          </button>
        </div>
        <div className="relative">
          <textarea value={note} onChange={(e) => b.setNote(e.target.value)} rows={note.length > 300 ? 11 : 5} placeholder="" className="w-full p-4 text-sm leading-relaxed text-ink-secondary focus:outline-none resize-y" aria-label={t('Notes de la soumission')} />
          {rewriting && (
            <div className="absolute inset-0 bg-white/75 flex items-center justify-center gap-2 text-sm text-ink-mute">
              <LoaderCircle className="w-4 h-4 animate-spin" />
              {t('Rédaction…')}
            </div>
          )}
        </div>
      </div>
    </BuilderSection>
  )
}

/** Attached files and photos. */
export function AutresSection({ b }: { b: Builder }) {
  return (
    <BuilderSection id="autres" title={t('Autres')}>
      <div className="grid lg:grid-cols-2 gap-5 [&>*]:min-w-0">
        <div className="space-y-3">
          <p className="label-caps">{t('Fichiers')}</p>
          <div className="rounded-lg border border-hairline divide-y divide-hairline">
            {b.attachments.map((f, i) => (
              <div key={f.name} className="px-3 py-2.5 flex items-center gap-3 text-sm">
                <span className="text-2xs font-bold text-ink-mute bg-sand rounded px-1.5 py-0.5">{f.ext}</span>
                <span className="flex-1 min-w-0 truncate text-ink-secondary">{f.name}</span>
                <label className="flex items-center gap-1.5 text-xs text-ink-mute whitespace-nowrap">
                  <input type="checkbox" checked={f.email} onChange={() => b.setAttachments((prev) => prev.map((x, k) => (k === i ? { ...x, email: !x.email } : x)))} className="accent-[var(--color-primary)]" />
                  {t('Courriel')}
                </label>
              </div>
            ))}
          </div>
          <button
            className="w-full h-16 rounded-lg border-2 border-dashed border-hairline-strong flex items-center justify-center gap-2 text-sm font-semibold text-ink-mute hover:border-primary hover:text-primary-press"
            onClick={() => {
              b.setAttachments((prev) => [...prev, { name: t("Plan d'implantation.pdf"), ext: 'PDF', email: false }])
              toast(t('Fichier téléversé'))
            }}
          >
            <Upload className="w-4 h-4" />
            {t('Ajouter un fichier')}
          </button>
        </div>
        <div className="space-y-3">
          <p className="label-caps">{t('Photos')}</p>
          <PhotoGrid b={b} />
        </div>
      </div>
    </BuilderSection>
  )
}
