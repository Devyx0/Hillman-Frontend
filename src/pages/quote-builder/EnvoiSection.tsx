import { Check, Clock, Mail, MessageSquare, PenLine, Send, Workflow } from 'lucide-react'
import { Badge, CompanyLogo, Field } from '../../components/ui'
import { fullName, repById } from '../../data/mock'
import { toast } from '../../lib/toast'
import { cn, money } from '../../lib/utils'
import { CONSUMER_RESOLUTION_TEXT, CONTRACT_CLAUSES } from '../../data/quote-builder'
import { BuilderSection, ToggleChip } from '../../components/quote-shared'
import type { Builder } from './useQuoteBuilder'

/** Two-page PDF preview of the quote. */
function PdfPreview({ b }: { b: Builder }) {
  const { quote, client, company, checked, paidAddons } = b
  return (
    <div className="rounded-lg bg-stone p-3">
      <div className="bg-white rounded shadow-card p-4 text-[11px] leading-snug text-ink-secondary space-y-3 aspect-[8.5/11] overflow-hidden">
        <div className="flex items-start justify-between gap-2 pb-2 border-b-2 border-ink">
          <div>
            <CompanyLogo id={quote.company} className="h-9 max-w-[170px]" />
            <p className="text-ink-mute mt-1">RBQ {company.rbq}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-ink">{company.phone}</p>
            <p className="text-ink-mute">Soumission {quote.no}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-ink-mute">Client</p>
            <p className="font-semibold text-ink">{fullName(client)}</p>
            <p>
              {client.no}, {client.street}
            </p>
            <p>
              {client.city} {client.postal}
            </p>
          </div>
          <div>
            <p className="text-ink-mute">Représentant</p>
            <p className="font-semibold text-ink">{repById(b.repId)!.name}</p>
            <p className="text-ink-mute mt-1">Date</p>
            <p>16 octobre 2026</p>
          </div>
        </div>
        <div>
          <p className="bg-ink text-white font-bold px-2 py-0.5 uppercase">Travaux</p>
          <ul className="mt-1 space-y-0.5">
            {[...checked].slice(0, 7).map((line) => (
              <li key={line} className="truncate">
                • {line}
              </li>
            ))}
            {checked.size > 7 && <li className="text-ink-mute">… et {checked.size - 7} autres lignes</li>}
          </ul>
        </div>
        {paidAddons.length > 0 && (
          <div>
            <p className="bg-sand font-bold px-2 py-0.5 uppercase">Ajout</p>
            {paidAddons.map((a) => (
              <p key={a.id} className="flex justify-between gap-2 mt-0.5">
                <span className="truncate">{a.desc}</span>
                <span className="tnum">{money(a.price)}</span>
              </p>
            ))}
          </div>
        )}
        {b.pdfShow.coutant && <p className="text-tone-critical-ink">Coûtant : {money(b.realCost, false)} (usage interne)</p>}
        <div className="ml-auto w-1/2 space-y-0.5 tnum">
          <p className="flex justify-between">
            <span>Sous-total</span>
            <span>{money(b.subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>TPS</span>
            <span>{money(b.gst)}</span>
          </p>
          <p className="flex justify-between">
            <span>TVQ</span>
            <span>{money(b.qst)}</span>
          </p>
          <p className="flex justify-between font-bold text-ink border-t border-ink pt-0.5">
            <span>TOTAL</span>
            <span>{money(b.total)}</span>
          </p>
        </div>
        <p className="text-center text-ink-mute pt-2 border-t border-hairline">
          Prix valide {b.warranties.offre} · RBQ {company.rbq} · page 1 / 2
        </p>
      </div>
      <div className="bg-white rounded shadow-card p-4 mt-3 text-[11px] leading-snug text-ink-secondary space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-ink">
          <CompanyLogo id={quote.company} className="h-6 max-w-[120px]" />
          <span className="text-ink-mute">Soumission {quote.no} · page 2 / 2</span>
        </div>
        <p className="bg-ink text-white font-bold px-2 py-0.5 uppercase">Termes et conditions</p>
        <p className="text-ink">{CONSUMER_RESOLUTION_TEXT}</p>
        <ul className="space-y-0.5">
          {CONTRACT_CLAUSES.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-4 pt-3">
          <div className="border-t border-ink pt-1 text-ink-mute">Signature du client</div>
          <div className="border-t border-ink pt-1 text-ink-mute">Pour {company.name}</div>
        </div>
      </div>
    </div>
  )
}

/** PDF preview, send form, sent e-mails, signature status and auto follow-up. */
export function EnvoiSection({ b }: { b: Builder }) {
  const { quote, client, company, isDemo, status, sendVia, pdfShow } = b
  const rep = repById(b.repId)!
  const kindLabel = quote.company === 'sg' ? 'gouttière' : quote.company === 'toit' ? 'toiture' : 'rénovation'
  const signed = status === 'Signé'
  const signatureSteps: [string, string, boolean][] = [
    ['Envoyée', quote.views > 0 ? 'Ven. 16 oct. · 15 h 12' : '—', quote.views > 0],
    [`Consultée${quote.views ? ` (${quote.views} fois)` : ''}`, quote.views > 0 ? (isDemo ? "Aujourd'hui · 8 h 23" : 'Récemment') : '—', quote.views > 0],
    ['Signée par le client', signed ? 'En ligne' : '—', signed],
  ]
  const followUps: [string, string, 'done' | 'next', string][] = [
    ['J+2', 'Texto du représentant', isDemo ? 'done' : 'next', isDemo ? 'Envoyé dim. 18 oct.' : 'Prévu'],
    ['J+6', 'Courriel de suivi', 'next', isDemo ? 'Prévu jeu. 22 oct.' : 'Prévu'],
  ]
  return (
    <BuilderSection id="envoi" title="Envoi">
      <div className="grid lg:grid-cols-2 gap-5 [&>*]:min-w-0">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex-1" />
            <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <input type="checkbox" checked={pdfShow.coutant} onChange={() => b.setPdfShow({ ...pdfShow, coutant: !pdfShow.coutant })} className="accent-[var(--color-primary)]" />
              Avec coûtant
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <input type="checkbox" checked={pdfShow.prixTravaux} onChange={() => b.setPdfShow({ ...pdfShow, prixTravaux: !pdfShow.prixTravaux })} className="accent-[var(--color-primary)]" />
              Avec prix travaux
            </label>
          </div>
          <PdfPreview b={b} />
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <ToggleChip active={sendVia.email} onClick={() => b.setSendVia({ ...sendVia, email: !sendVia.email })}>
              <Mail className="w-3.5 h-3.5" />
              Courriel
            </ToggleChip>
            <ToggleChip active={sendVia.sms} onClick={() => b.setSendVia({ ...sendVia, sms: !sendVia.sms })}>
              <MessageSquare className="w-3.5 h-3.5" />
              Texto
            </ToggleChip>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="À">
              <input className="form-input" defaultValue={client.email} />
            </Field>
            <Field label="Cc">
              <input className="form-input" placeholder="—" />
            </Field>
            <Field label="Objet" className="col-span-2">
              <input className="form-input" defaultValue={`Soumission ${kindLabel} ${quote.no}`} />
            </Field>
            <Field label="Message" className="col-span-2">
              <textarea className="form-input h-auto py-2" rows={4} defaultValue={`Bonjour ${client.first},\n\nVoici votre soumission. Vous pouvez la consulter et la signer en ligne avec le lien ci-dessous.\n\n${rep.name}\n${company.name} · ${company.phone}`} />
            </Field>
          </div>
          <p className="text-xs text-ink-mute truncate">
            Joints : PDF
            {b.attachments
              .filter((f) => f.email)
              .map((f) => ` · ${f.name}`)
              .join('')}
          </p>
          <div className="flex gap-2">
            <button className="btn btn-sm btn-primary flex-1" onClick={() => toast(`Soumission ${quote.no} envoyée par ${[sendVia.email && 'courriel', sendVia.sms && 'texto'].filter(Boolean).join(' et ')}`)}>
              <Send className="w-4 h-4" />
              {quote.views > 0 ? 'Renvoyer' : 'Envoyer'}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => b.setComposeKind('sms')}>
              <MessageSquare className="w-4 h-4" />
              Texto perso
            </button>
          </div>
          <div className="rounded-xl border border-hairline p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Courriels envoyés
              </p>
              <span className="text-2xs text-ink-mute tnum">{quote.views > 0 || isDemo ? 2 : 1}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-xs">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="th pl-0 py-1.5">Date</th>
                    <th className="th py-1.5">Type</th>
                    <th className="th py-1.5">Envoyé par</th>
                    <th className="th py-1.5 pr-0">Objet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  <tr>
                    <td className="py-1.5 pr-2 tnum text-ink whitespace-nowrap">16 oct. · 15 h 12</td>
                    <td className="py-1.5">
                      <Badge tone="neutral">Soumission</Badge>
                    </td>
                    <td className="py-1.5 pr-2 text-ink-secondary whitespace-nowrap">{rep.first}</td>
                    <td className="py-1.5 text-ink-secondary truncate max-w-[180px]">
                      Soumission {kindLabel} {quote.no}
                    </td>
                  </tr>
                  <tr className="text-ink-mute">
                    <td className="py-1.5 pr-2 tnum whitespace-nowrap">22 oct. · 13 h 00</td>
                    <td className="py-1.5">
                      <Badge tone="info">Rappel · auto</Badge>
                    </td>
                    <td className="py-1.5">Système</td>
                    <td className="py-1.5 truncate max-w-[180px]">Suivi soumission #{quote.no}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-xl border border-hairline p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                Signature
              </p>
              <Badge tone={signed ? 'good' : 'warn'} dot>
                {signed ? 'Signée' : 'En attente'}
              </Badge>
            </div>
            <ol className="space-y-2 text-sm">
              {signatureSteps.map(([label, when, ok]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center', ok ? 'bg-tone-good text-white' : 'bg-sand text-ink-faint')}>{ok ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}</span>
                  <span className={cn('flex-1', ok ? 'text-ink' : 'text-ink-mute')}>{label}</span>
                  <span className="text-xs text-ink-mute">{when}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-hairline p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink flex items-center gap-2">
                <Workflow className="w-4 h-4" />
                Relance auto
              </p>
              <Badge tone="info">Active</Badge>
            </div>
            <ol className="space-y-2">
              {followUps.map(([day, label, state, when]) => (
                <li key={day} className="flex items-center gap-3 text-sm">
                  <span className={cn('w-10 shrink-0 text-center text-2xs font-bold rounded px-1 py-0.5 tnum', state === 'done' ? 'bg-tone-good-soft text-tone-good-ink' : 'bg-sand text-ink-mute')}>{day}</span>
                  <span className={cn('flex-1', state === 'done' ? 'text-ink' : 'text-ink-mute')}>{label}</span>
                  <span className="text-xs text-ink-mute">{when}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </BuilderSection>
  )
}
