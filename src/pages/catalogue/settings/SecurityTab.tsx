/** Paramètres → Sécurité + journal des modifications (filterable). */
import { useState } from 'react'
import { Check, FileClock, Lock, Search } from 'lucide-react'
import { Badge, Card, Empty } from '../../../components/ui'
import { Select } from '../../../components/filters'
import { useStore } from '../../../data/store'
import { normalize } from '../../../lib/utils'
import { locale, t } from '../../../i18n'
import { en } from '../../../i18n/en'
import { CHANGE_LOG, type ChangeArea, type ChangeEntry } from './data'

const AREA_LABEL: Record<ChangeArea, string> = { soumissions: 'Soumissions', agenda: 'Agenda', parametres: 'Paramètres', utilisateurs: 'Utilisateurs', catalogue: 'Catalogue' }

/** Translate an entry, including variables that are themselves French labels. */
function describe(e: ChangeEntry) {
  const vars = e.vars && Object.fromEntries(Object.entries(e.vars).map(([k, v]) => [k, typeof v === 'string' && en[v] !== undefined ? t(v) : v]))
  return t(e.what, vars)
}

function when(at: string) {
  const d = new Date(at.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return at
  return d.toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function SecurityTab() {
  useStore()
  const [who, setWho] = useState('all')
  const [area, setArea] = useState<'all' | ChangeArea>('all')
  const [query, setQuery] = useState('')
  const people = [...new Set(CHANGE_LOG.map((e) => e.who))].sort()
  const rows = CHANGE_LOG.filter((e) => (who === 'all' || e.who === who) && (area === 'all' || e.area === area) && (!query.trim() || normalize(describe(e)).includes(normalize(query.trim()))))

  return (
    <div className="grid lg:grid-cols-3 gap-4 items-start">
      <Card title={t('Journal des modifications')} icon={FileClock} pad={false} className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-hairline">
          <label className="relative flex-1 min-w-[10rem]">
            <Search className="w-4 h-4 text-ink-faint absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input className="form-input h-8 pl-8" placeholder={t('Rechercher (ex. H64320)')} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('Rechercher dans le journal')} />
          </label>
          <Select value={who} onChange={setWho} className="w-48" options={[{ value: 'all', label: t('Tout le monde') }, ...people.map((p) => ({ value: p, label: p }))]} />
          <Select<'all' | ChangeArea> value={area} onChange={setArea} searchable={false} className="w-40" options={[{ value: 'all', label: t('Toutes les sections') }, ...(Object.keys(AREA_LABEL) as ChangeArea[]).map((a) => ({ value: a, label: t(AREA_LABEL[a]) }))]} />
        </div>
        {rows.length === 0 ? (
          <Empty icon={FileClock} title={t('Aucune modification')}>
            {t('Aucune entrée ne correspond à ces filtres.')}
          </Empty>
        ) : (
          <div className="divide-y divide-hairline max-h-[65vh] overflow-y-auto">
            {rows.map((e) => (
              <div key={e.id} className="px-5 py-3 flex flex-col sm:flex-row sm:gap-3 text-sm">
                <span className="sm:w-28 shrink-0 text-xs text-ink-mute tnum pt-0.5">{when(e.at)}</span>
                <span className="font-semibold text-ink-secondary sm:w-40 shrink-0 truncate">{e.who}</span>
                <span className="text-ink-mute flex-1">{describe(e)}</span>
                <Badge className="self-start mt-1 sm:mt-0">{t(AREA_LABEL[e.area])}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title={t('Sécurité')} icon={Lock}>
        <ul className="space-y-2.5 text-sm text-ink-secondary">
          {['Connexion chiffrée (HTTPS)', 'Mot de passe par utilisateur', 'Sauvegardes quotidiennes', 'Consentement Loi 25'].map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="w-4 h-4 text-tone-good mt-0.5 shrink-0" />
              {t(item)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
