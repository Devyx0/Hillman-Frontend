/** Settings → Équipes (calendar area): crews with members, company, colour; add / edit / deactivate. */
import { useState } from 'react'
import { Check, HardHat, Pencil, Phone, Plus, Power, Trash2, UsersRound } from 'lucide-react'
import { Badge, Card, CompanyBadge, Drawer, Empty, Field } from '../../components/ui'
import { Notice, confirmAction } from '../../components/states'
import { Select } from '../../components/filters'
import { inScope, useApp } from '../../context/AppContext'
import { useAuth } from '../../auth/AuthContext'
import { COMPANIES, JOBS, type CompanyId } from '../../data/mock'
import { useStore } from '../../data/store'
import { CREWS, addCrew, isScheduled, removeCrew, updateCrew, type Crew } from '../../data/crews'
import { toast } from '../../lib/toast'
import { cn } from '../../lib/utils'
import { t } from '../../i18n'

const COLORS = Array.from({ length: 10 }, (_, i) => `data-${i + 1}`)

export function CrewsTab() {
  useStore()
  const { scope } = useApp()
  const { can } = useAuth()
  const canEdit = can('crews.schedule') || can('settings.manage')
  const [editing, setEditing] = useState<Crew | 'new' | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const crews = CREWS.filter((c) => inScope(scope, c.company) && (showInactive || c.active))
  const inactiveCount = CREWS.filter((c) => inScope(scope, c.company) && !c.active).length
  const upcoming = (id: string) => JOBS.filter((j) => j.crewId === id && isScheduled(j) && j.startDay! + j.days > 2).length

  const toggleActive = async (c: Crew) => {
    if (c.active) {
      const n = upcoming(c.id)
      const ok = await confirmAction({
        title: t('Désactiver {name}?', { name: t(c.name) }),
        body: n ? t('{n} travaux à venir restent planifiés avec cette équipe : replanifiez-les dans l’agenda.', { n }) : t('L’équipe ne sera plus proposée pour planifier des travaux.'),
        confirmLabel: t('Désactiver'),
        danger: true,
      })
      if (!ok) return
    }
    updateCrew(c.id, { active: !c.active })
    toast(c.active ? t('Équipe désactivée') : t('Équipe réactivée'))
  }

  return (
    <div className="space-y-4">
      <Card
        title={t('Équipes de travail')}
        icon={HardHat}
        pad={false}
        actions={
          canEdit && (
            <button className="btn btn-sm btn-primary" onClick={() => setEditing('new')}>
              <Plus className="w-4 h-4" />
              {t('Ajouter une équipe')}
            </button>
          )
        }
      >
        <p className="px-5 pt-1 pb-3 text-xs text-ink-mute border-b border-hairline">{t('Les équipes apparaissent dans la bande « Équipes » de l’agenda. On y planifie les travaux signés sur un ou plusieurs jours.')}</p>
        {crews.length === 0 ? (
          <Empty icon={UsersRound} title={t('Aucune équipe')}>
            {t('Ajoutez une équipe pour pouvoir planifier les travaux signés.')}
          </Empty>
        ) : (
          <ul className="divide-y divide-hairline">
            {crews.map((c) => (
              <li key={c.id} className={cn('px-5 py-3.5 flex flex-wrap items-center gap-3', !c.active && 'opacity-60')}>
                <span className={cn('w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center border shrink-0', `bg-${c.color} text-${c.color}-ink border-${c.color}-edge`)}>{c.code}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink flex flex-wrap items-center gap-2">
                    {t(c.name)}
                    <CompanyBadge id={c.company} />
                    {!c.active && <Badge>{t('Inactive')}</Badge>}
                  </p>
                  <p className="text-xs text-ink-mute mt-0.5">
                    {t('Chef : {name}', { name: c.lead })} · {t('{n} membres', { n: c.members.length })}
                    {c.phone && (
                      <>
                        {' · '}
                        <Phone className="w-3 h-3 inline -mt-0.5" /> {c.phone}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-ink-secondary mt-0.5 truncate">{c.members.join(', ')}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-1.5">
                    <button className="btn btn-xs btn-secondary" onClick={() => setEditing(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                      {t('Modifier')}
                    </button>
                    <button className="btn btn-xs btn-ghost" onClick={() => toggleActive(c)}>
                      <Power className="w-3.5 h-3.5" />
                      {c.active ? t('Désactiver') : t('Réactiver')}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {inactiveCount > 0 && (
          <button className="w-full py-2.5 text-xs font-semibold text-primary-press border-t border-hairline hover:bg-sand/60" onClick={() => setShowInactive((v) => !v)}>
            {showInactive ? t('Masquer les équipes inactives') : t('Afficher les équipes inactives ({n})', { n: inactiveCount })}
          </button>
        )}
      </Card>
      {!canEdit && <Notice tone="info">{t('Lecture seule : seuls les administrateurs et la coordonnatrice modifient les équipes.')}</Notice>}
      {editing && <CrewForm key={editing === 'new' ? 'new' : editing.id} crew={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function CrewForm({ crew, onClose }: { crew?: Crew; onClose: () => void }) {
  const { scope } = useApp()
  const [name, setName] = useState(crew ? t(crew.name) : '')
  const [code, setCode] = useState(crew?.code ?? '')
  const [company, setCompany] = useState<CompanyId>(crew?.company ?? (scope === 'all' ? 'toit' : scope))
  const [lead, setLead] = useState(crew?.lead ?? '')
  const [members, setMembers] = useState((crew?.members ?? []).join('\n'))
  const [phone, setPhone] = useState(crew?.phone ?? '')
  const [color, setColor] = useState(crew?.color ?? COLORS[CREWS.length % COLORS.length])
  const [error, setError] = useState('')
  const hasJobs = !!crew && JOBS.some((j) => j.crewId === crew.id)

  const save = () => {
    const list = members
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean)
    if (!name.trim()) return setError(t('Donnez un nom à l’équipe.'))
    if (!lead.trim()) return setError(t('Indiquez le chef d’équipe.'))
    const fields = {
      name: crew && name === t(crew.name) ? crew.name : name.trim(),
      code: (code.trim() || name.trim().slice(0, 2)).toUpperCase().slice(0, 3),
      company,
      lead: lead.trim(),
      members: list.includes(lead.trim()) ? list : [lead.trim(), ...list],
      phone: phone.trim() || undefined,
      color,
    }
    if (crew) updateCrew(crew.id, fields)
    else addCrew({ ...fields, active: true })
    toast(crew ? t('Équipe mise à jour') : t('Équipe ajoutée'))
    onClose()
  }
  const remove = async () => {
    if (!crew) return
    if (!(await confirmAction({ title: t('Supprimer {name}?', { name: t(crew.name) }), body: t('Cette action est définitive.'), confirmLabel: t('Supprimer'), danger: true }))) return
    removeCrew(crew.id)
    toast(t('Équipe supprimée'))
    onClose()
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <HardHat className="w-4 h-4" />
          {crew ? t('Modifier l’équipe') : t('Nouvelle équipe')}
        </span>
      }
    >
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
          <Field label={t('Nom')}>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Ex. : Gouttières F3')} />
          </Field>
          <Field label={t('Code')}>
            <input className="form-input uppercase" maxLength={3} value={code} onChange={(e) => setCode(e.target.value)} placeholder="F3" />
          </Field>
        </div>
        <Field label={t('Compagnie')}>
          <Select value={company} onChange={(v) => setCompany(v as CompanyId)} options={COMPANIES.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={t('Chef d’équipe')}>
            <input className="form-input" value={lead} onChange={(e) => setLead(e.target.value)} />
          </Field>
          <Field label={t('Téléphone')}>
            <input className="form-input tnum" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="418 555-0000" />
          </Field>
        </div>
        <Field label={t('Membres (un par ligne)')}>
          <textarea rows={4} className="form-input h-auto py-2.5" value={members} onChange={(e) => setMembers(e.target.value)} />
        </Field>
        <div>
          <p className="label-caps mb-1.5">{t('Couleur dans l’agenda')}</p>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)} className={cn('w-8 h-8 rounded-md border-2 flex items-center justify-center', `bg-${c} text-${c}-ink`, color === c ? `border-${c}-ink` : 'border-transparent')}>
                {color === c && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
        {error && <Notice tone="critical">{error}</Notice>}
        <div className="flex gap-2">
          <button className="btn btn-md btn-primary flex-1" onClick={save}>
            {t('Enregistrer')}
          </button>
          {crew && !hasJobs && (
            <button className="btn btn-md btn-ghost hover:text-tone-critical-ink" onClick={remove}>
              <Trash2 className="w-4 h-4" />
              {t('Supprimer')}
            </button>
          )}
        </div>
        {crew && hasJobs && <p className="text-xs text-ink-mute">{t('Cette équipe a des travaux dans l’historique : désactivez-la plutôt que de la supprimer.')}</p>}
      </div>
    </Drawer>
  )
}
