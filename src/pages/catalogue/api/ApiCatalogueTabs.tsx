/**
 * Catalogue tabs in API mode. Reads the company's whole catalogue once (deactivated rows included) and its work
 * types, and hands them to the tab shown. The company follows the left-panel scope (else the first company the
 * user belongs to) and can be changed with the « Compagnie » picker of each tab.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import * as api from '../../../api/endpoints'
import { ApiError, errorMessage } from '../../../api/http'
import type { ApiCatalogue, ApiWorkType, CatalogueEntityKey, Uuid } from '../../../api/types'
import { Field } from '../../../components/ui'
import { Dropdown } from '../../../components/dropdown'
import { ErrorState, Loading, Notice, confirmAction } from '../../../components/states'
import { useApp } from '../../../context/AppContext'
import { companyUuid, invalidateCatalogue, isCostViewer, refreshWorkTypes, roleIn } from '../../../data/api-sync'
import { COMPANIES, type CompanyId } from '../../../data/mock'
import { toast } from '../../../lib/toast'
import { t } from '../../../i18n'
import { useCanEditCatalogue } from '../context'
import { CatalogueApiContext, type CatalogueApi } from './shared'
import { ApiWorkLinesTab } from './ApiWorkLinesTab'
import { ApiExpertisesTab } from './ApiExpertisesTab'
import { ApiCostItemsTab } from './ApiCostItemsTab'
import { ApiTemplatesTab } from './ApiTemplatesTab'
import { ApiWarrantiesTab } from './ApiWarrantiesTab'

export type ApiCatalogueTab = 'travaux' | 'expertises' | 'items' | 'modeles' | 'garanties'

type Data = { cat: ApiCatalogue; workTypes: ApiWorkType[] }
type State = { key: string; status: 'loading' | 'ready' | 'error'; data?: Data; error?: string }

async function fetchAll(uuid: Uuid): Promise<Data> {
  const [cat, workTypes] = await Promise.all([api.getCatalogue(uuid, true), api.listWorkTypes(uuid, true)])
  return { cat, workTypes }
}

export function ApiCatalogueTabs({ tab }: { tab: ApiCatalogueTab }) {
  const { scope } = useApp()
  const globalEdit = useCanEditCatalogue()
  // Companies the user is a member of (the API answers only for these).
  const members = COMPANIES.filter((c) => roleIn(c.id))
  const fromScope = (s: typeof scope): CompanyId | undefined => (s !== 'all' && members.some((m) => m.id === s) ? s : members[0]?.id)
  const [picked, setPicked] = useState<{ scope: typeof scope; company: CompanyId | undefined }>(() => ({ scope, company: fromScope(scope) }))
  // A new left-panel scope wins over the company picked here.
  const slug = picked.scope === scope ? picked.company : fromScope(scope)
  const uuid = companyUuid(slug)

  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<State>({ key: '', status: 'loading' })
  const [busy, setBusy] = useState(false)
  const latest = useRef(0)

  useEffect(() => {
    if (!uuid) return
    const req = ++latest.current
    fetchAll(uuid).then(
      (data) => req === latest.current && setState({ key: uuid, status: 'ready', data }),
      (e) => req === latest.current && setState({ key: uuid, status: 'error', error: errorMessage(e) }),
    )
  }, [uuid, attempt])

  const refresh = useCallback(
    async (opts: { workTypes?: boolean } = {}) => {
      if (!slug || !uuid) return
      invalidateCatalogue(slug)
      // The app-wide list of work types (pickers of leads and quotes); its failure must not hide this screen's.
      if (opts.workTypes) await refreshWorkTypes(slug).catch(() => undefined)
      const req = ++latest.current
      try {
        const data = await fetchAll(uuid)
        if (req === latest.current) setState({ key: uuid, status: 'ready', data })
      } catch (e) {
        if (req === latest.current) toast(errorMessage(e))
      }
    },
    [slug, uuid],
  )

  const run = useCallback<CatalogueApi['run']>(
    async (work, done, opts) => {
      setBusy(true)
      try {
        await work()
        if (done) toast(done)
        await refresh(opts)
        return true
      } catch (e) {
        toast(errorMessage(e))
        // Part of a multi-row change may have been saved: show what the server has.
        await refresh(opts)
        return false
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const remove = useCallback<CatalogueApi['remove']>(
    async (key: CatalogueEntityKey, id: Uuid, o) => {
      if (!(await confirmAction({ title: o.title, body: o.body, confirmLabel: t('Supprimer'), danger: true }))) return false
      setBusy(true)
      try {
        await api.deleteCatalogueRow(key, id)
        toast(o.done)
        await refresh(o)
        return true
      } catch (e) {
        if (e instanceof ApiError && e.status === 409 && e.code === 'IN_USE') {
          const deactivate = await confirmAction({ title: t('Suppression impossible'), body: errorMessage(e), confirmLabel: t('Désactiver') })
          if (deactivate) {
            try {
              await api.updateCatalogueRow(key, id, { is_active: false })
              toast(t('Désactivé : il n’est plus proposé dans les nouvelles soumissions.'))
              await refresh(o)
            } catch (e2) {
              toast(errorMessage(e2))
            }
          }
        } else toast(errorMessage(e))
        return false
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const companyPicker: ReactNode = (
    <Field label={t('Compagnie')}>
      <Dropdown className="form-input w-52" value={slug ?? ''} onChange={(e) => setPicked({ scope, company: e.target.value as CompanyId })} aria-label={t('Compagnie')}>
        {members.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Dropdown>
    </Field>
  )

  const role = slug ? roleIn(slug) : undefined
  const canEdit = globalEdit && (role === 'admin' || role === 'coordination')

  if (!slug || !uuid) return <Notice tone="info">{t('Vous n’êtes membre d’aucune compagnie : aucun catalogue à afficher.')}</Notice>
  if (state.status === 'error' && state.key === uuid)
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">{companyPicker}</div>
        <div className="card">
          <ErrorState
            onRetry={() => {
              setState({ key: uuid, status: 'loading' })
              setAttempt((n) => n + 1)
            }}
          >{state.error}</ErrorState>
        </div>
      </div>
    )
  if (state.key !== uuid || !state.data) return <Loading />

  const value: CatalogueApi = {
    slug,
    uuid,
    cat: state.data.cat,
    workTypes: state.data.workTypes,
    canEdit,
    canDelete: canEdit && role === 'admin',
    showCosts: isCostViewer(slug),
    busy,
    run,
    remove,
    refresh,
    companyPicker,
  }
  return (
    <CatalogueApiContext.Provider value={value}>
      <div className="space-y-4">
        {globalEdit && !canEdit && <Notice tone="info">{t('Lecture seule pour cette compagnie : seules l’administration et la coordination modifient son catalogue.')}</Notice>}
        {tab === 'travaux' && <ApiWorkLinesTab />}
        {tab === 'expertises' && <ApiExpertisesTab />}
        {tab === 'items' && <ApiCostItemsTab />}
        {tab === 'modeles' && <ApiTemplatesTab />}
        {tab === 'garanties' && <ApiWarrantiesTab />}
      </div>
    </CatalogueApiContext.Provider>
  )
}
