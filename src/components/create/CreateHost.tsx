import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { leadById } from '../../data/leads'
import { onCreate, type CreateKind, type CreatePrefill } from '../../lib/create'
import { t } from '../../i18n'
import { Drawer } from '../ui'
import ClientForm from './ClientForm'
import LeadForm from './LeadForm'
import { leadClientPrefill } from './prefill'
import QuoteFlow from './QuoteFlow'

/** Mounted once in the layout; renders the create flow requested through `openCreate()`. */
export default function CreateHost() {
  const navigate = useNavigate()
  const [state, setState] = useState<{ kind: CreateKind; prefill: CreatePrefill; key: number } | null>(null)
  useEffect(() => {
    onCreate((kind, prefill) => setState({ kind, prefill, key: Date.now() }))
    return () => onCreate(null)
  }, [])
  const close = useCallback(() => setState(null), [])

  // Any navigation (link, back button, a flow finishing) closes the drawer so it never sits over another page.
  const location = useLocation()
  const route = location.pathname + location.search
  const [lastRoute, setLastRoute] = useState(route)
  if (route !== lastRoute) {
    setLastRoute(route)
    if (state) setState(null)
  }

  const title = state?.kind === 'quote' ? t('Nouvelle soumission') : state?.kind === 'client' ? t('Nouveau client') : t('Nouveau lead')
  return (
    <Drawer open={!!state} onClose={close} title={title}>
      {state?.kind === 'quote' && <QuoteFlow key={state.key} prefill={state.prefill} onClose={close} />}
      {state?.kind === 'client' && (
        <ClientForm
          key={state.key}
          prefill={state.prefill.leadId ? leadClientPrefill(leadById(state.prefill.leadId), state.prefill) : state.prefill}
          existingLabel={t('Ouvrir la fiche existante')}
          onUseExisting={(c) => {
            close()
            navigate(`/clients/${c.id}`)
          }}
          onCreated={(c) => {
            close()
            navigate(`/clients/${c.id}`)
          }}
          onCancel={close}
        />
      )}
      {state?.kind === 'lead' && (
        <LeadForm
          key={state.key}
          prefill={state.prefill}
          onCreated={(l) => {
            close()
            navigate(`/leads/${l.id}`)
          }}
          onCancel={close}
        />
      )}
    </Drawer>
  )
}
