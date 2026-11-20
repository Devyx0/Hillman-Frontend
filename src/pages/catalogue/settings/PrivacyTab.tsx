/** Paramètres → Loi 25: privacy officer, consent wording, retention, data requests. */
import { useState } from 'react'
import { FileLock2, Inbox, Plus, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { Badge, Card, Drawer, Empty, Field } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { Notice } from '../../../components/states'
import { useAuth } from '../../../auth/AuthContext'
import { DATA_REQUESTS, PRIVACY, addDataRequest, savePrivacy, updateDataRequest, type DataRequest } from '../../../data/settings'
import { useStore } from '../../../data/store'
import { toast } from '../../../lib/toast'
import { cn } from '../../../lib/utils'
import { locale, t } from '../../../i18n'
import { logChange } from './data'
import { TODAY, addDays } from './shared'

const KIND_LABEL: Record<DataRequest['kind'], string> = { acces: 'Accès', rectification: 'Rectification', suppression: 'Suppression' }
const STATUS_LABEL: Record<DataRequest['status'], string> = { nouvelle: 'Nouvelle', en_cours: 'En cours', traitee: 'Traitée' }
const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' })
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000)

export function PrivacyTab() {
  useStore()
  const { user } = useAuth()
  const me = user?.name ?? '—'
  const [p, setP] = useState(() => ({ ...PRIVACY, smsConsentText: t(PRIVACY.smsConsentText), formConsentText: t(PRIVACY.formConsentText) }))
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const requests = DATA_REQUESTS.filter((r) => filter === 'all' || r.status !== 'traitee').sort((a, b) => a.due.localeCompare(b.due))
  const overdue = DATA_REQUESTS.filter((r) => r.status !== 'traitee' && r.due < TODAY).length

  const save = () => {
    if (!p.officer.trim() || !/^\S+@\S+\.\S+$/.test(p.officerEmail)) return toast(t('Nom et courriel du responsable requis'))
    if (!(p.retentionYears >= 1 && p.retentionYears <= 20)) return toast(t('Durée de conservation entre 1 et 20 ans'))
    savePrivacy(p)
    logChange(me, 'parametres', 'A modifié les paramètres Loi 25', {})
    toast(t('Paramètres Loi 25 enregistrés'))
  }

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <Card title={t('Responsable de la protection des renseignements personnels')} icon={UserRoundCheck}>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label={t('Nom')}>
                <input className="form-input" value={p.officer} onChange={(e) => setP({ ...p, officer: e.target.value })} />
              </Field>
              <Field label={t('Courriel public')}>
                <input className="form-input" value={p.officerEmail} onChange={(e) => setP({ ...p, officerEmail: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-ink-mute">{t('Son titre et ses coordonnées doivent être publiés sur le site web de chaque compagnie.')}</p>
            <Field label={t('Durée de conservation des dossiers (années)')}>
              <input className="form-input w-24 tnum" inputMode="numeric" value={p.retentionYears} onChange={(e) => setP({ ...p, retentionYears: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            </Field>
            <p className="text-xs text-ink-mute">{t('Après ce délai sans activité, les clients sont proposés pour anonymisation.')}</p>
          </div>
        </Card>
        <Card title={t('Textes de consentement')} icon={ShieldCheck}>
          <div className="space-y-3">
            <Field label={t('Consentement aux textos')}>
              <textarea rows={3} className="form-input h-auto py-2 text-sm" value={p.smsConsentText} onChange={(e) => setP({ ...p, smsConsentText: e.target.value })} />
            </Field>
            <Field label={t('Formulaire web')}>
              <textarea rows={3} className="form-input h-auto py-2 text-sm" value={p.formConsentText} onChange={(e) => setP({ ...p, formConsentText: e.target.value })} />
            </Field>
            <p className="text-2xs text-ink-mute">{t('{compagnie} est remplacé par le nom de la compagnie.')}</p>
          </div>
        </Card>
      </div>
      <div className="flex justify-end">
        <button className="btn btn-sm btn-primary" onClick={save}>
          {t('Enregistrer')}
        </button>
      </div>
      <Card
        title={t('Demandes d’accès, de rectification et de suppression')}
        icon={Inbox}
        pad={false}
        actions={
          <button className="btn btn-xs btn-secondary" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" />
            {t('Demande')}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-hairline">
          <p className="text-xs text-ink-mute flex-1 min-w-[14rem]">{t('La loi exige une réponse dans les 30 jours suivant la réception de la demande.')}</p>
          <Select<'open' | 'all'>
            value={filter}
            onChange={setFilter}
            searchable={false}
            className="w-40"
            options={[
              { value: 'open', label: t('À traiter') },
              { value: 'all', label: t('Toutes') },
            ]}
          />
        </div>
        {overdue > 0 && <Notice tone="critical" className="m-3">{t('{n} demande(s) en retard', { n: overdue })}</Notice>}
        {requests.length === 0 ? (
          <Empty icon={FileLock2} title={filter === 'open' ? t('Aucune demande à traiter') : t('Aucune demande')} />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-sand/60 border-b border-hairline">
                <tr>
                  {['Client', 'Type', 'Reçue', 'Échéance', 'Statut'].map((h) => (
                    <th key={h} className="th">
                      {t(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {requests.map((r) => {
                  const left = daysBetween(TODAY, r.due)
                  const late = r.status !== 'traitee' && left < 0
                  return (
                    <tr key={r.id}>
                      <td className="td font-semibold text-ink-secondary">{r.client}</td>
                      <td className="td">
                        <Badge tone={r.kind === 'suppression' ? 'critical' : 'info'}>{t(KIND_LABEL[r.kind])}</Badge>
                      </td>
                      <td className="td text-ink-mute tnum whitespace-nowrap">{fmt(r.received)}</td>
                      <td className={cn('td tnum whitespace-nowrap', late ? 'text-tone-critical-ink font-semibold' : 'text-ink-mute')}>
                        {fmt(r.due)}
                        {r.status !== 'traitee' && <span className="block text-2xs">{late ? t('En retard de {n} j', { n: -left }) : t('Dans {n} j', { n: left })}</span>}
                      </td>
                      <td className="td">
                        <Select<DataRequest['status']>
                          value={r.status}
                          searchable={false}
                          className="w-36"
                          onChange={(status) => {
                            updateDataRequest(r.id, { status })
                            logChange(me, 'parametres', 'Demande Loi 25 de {name} : {status}', { name: r.client, status: STATUS_LABEL[status] })
                          }}
                          options={(Object.keys(STATUS_LABEL) as DataRequest['status'][]).map((s) => ({ value: s, label: t(STATUS_LABEL[s]) }))}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <NewRequestDrawer open={adding} onClose={() => setAdding(false)} me={me} />
    </div>
  )
}

function NewRequestDrawer({ open, onClose, me }: { open: boolean; onClose: () => void; me: string }) {
  const [client, setClient] = useState('')
  const [kind, setKind] = useState<DataRequest['kind']>('acces')
  const [received, setReceived] = useState(TODAY)
  const submit = () => {
    if (!client.trim()) return toast(t('Entrez le nom du client'))
    addDataRequest({ client: client.trim(), kind, received })
    logChange(me, 'parametres', 'A enregistré une demande Loi 25 de {name}', { name: client.trim() })
    toast(t('Demande enregistrée — échéance le {d}', { d: fmt(addDays(received, 30)) }))
    setClient('')
    onClose()
  }
  return (
    <Drawer open={open} onClose={onClose} title={t('Nouvelle demande')}>
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label={t('Client')}>
          <input className="form-input" value={client} onChange={(e) => setClient(e.target.value)} autoFocus />
        </Field>
        <Field label={t('Type')}>
          <Select<DataRequest['kind']> value={kind} onChange={setKind} searchable={false} options={(Object.keys(KIND_LABEL) as DataRequest['kind'][]).map((k) => ({ value: k, label: t(KIND_LABEL[k]) }))} />
        </Field>
        <Field label={t('Reçue le')}>
          <input type="date" className="form-input" value={received} max={TODAY} onChange={(e) => setReceived(e.target.value || TODAY)} />
        </Field>
        <p className="text-xs text-ink-mute">{t('Échéance : {d}', { d: fmt(addDays(received, 30)) })}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            {t('Annuler')}
          </button>
          <button className="btn btn-sm btn-primary">{t('Enregistrer')}</button>
        </div>
      </form>
    </Drawer>
  )
}
