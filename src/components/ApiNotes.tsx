/**
 * Internal notes of a client, a lead or a quote, with the backend (GET / POST /<subject>s/:id/notes,
 * PATCH / DELETE /notes/:id). Whoever sees the subject reads and adds notes; the author or an admin of the
 * subject's company edits or deletes them (the server decides; refused changes show its message).
 */
import { useEffect, useState } from 'react'
import { LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import * as api from '../api/endpoints'
import { errorMessage } from '../api/http'
import type { ApiNote, NoteSubject } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { roleIn } from '../data/api-sync'
import type { CompanyId } from '../data/mock'
import { locale, t } from '../i18n'
import { toast } from '../lib/toast'
import { cn } from '../lib/utils'
import { ErrorState, SkeletonRows, confirmAction } from './states'

const when = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export function ApiNotes({ subject, id, company, className }: { subject: NoteSubject; id: string; company?: CompanyId; className?: string }) {
  const { user } = useAuth()
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; notes: ApiNote[] }>({ status: 'loading', notes: [] })
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null)

  useEffect(() => {
    let live = true
    setState({ status: 'loading', notes: [] })
    api.listNotes(subject, id).then(
      (notes) => live && setState({ status: 'ready', notes }),
      () => live && setState({ status: 'error', notes: [] }),
    )
    return () => {
      live = false
    }
  }, [subject, id, attempt])

  // The server checks it; this only hides buttons that would be refused.
  const canEdit = (n: ApiNote) => n.author_user_id === user?.id || (!!company && roleIn(company) === 'admin')

  const add = async () => {
    const body = draft.trim()
    if (!body || busy) return
    setBusy(true)
    try {
      const note = await api.createNote(subject, id, body)
      setState((s) => ({ ...s, notes: [note, ...s.notes] }))
      setDraft('')
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!editing) return
    const body = editing.body.trim()
    const current = state.notes.find((n) => n.id === editing.id)
    if (!body || body === current?.body) return setEditing(null)
    setBusy(true)
    try {
      const note = await api.updateNote(editing.id, body)
      setState((s) => ({ ...s, notes: s.notes.map((n) => (n.id === note.id ? note : n)) }))
      setEditing(null)
    } catch (e) {
      toast(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (n: ApiNote) => {
    if (!(await confirmAction({ title: t('Supprimer cette note?'), body: t('La note sera retirée pour toute l’équipe.'), confirmLabel: t('Supprimer'), danger: true }))) return
    try {
      await api.deleteNote(n.id)
      setState((s) => ({ ...s, notes: s.notes.filter((x) => x.id !== n.id) }))
      toast(t('Note supprimée'))
    } catch (e) {
      toast(errorMessage(e))
    }
  }

  return (
    <div className={cn('bg-white rounded-xl shadow-card p-5 space-y-4', className)}>
      <div className="flex gap-2 items-start">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void add()
          }}
          rows={2}
          maxLength={5000}
          placeholder={t('Ajouter une note…')}
          className="form-input py-2 min-h-10"
          aria-label={t('Nouvelle note')}
        />
        <button onClick={() => void add()} disabled={!draft.trim() || busy} className="btn btn-md btn-primary">
          {busy && !editing ? <LoaderCircle className="w-4 h-4 animate-spin" /> : null}
          {t('Ajouter')}
        </button>
      </div>
      {state.status === 'loading' && <SkeletonRows rows={2} />}
      {state.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
      {state.status === 'ready' && (
        <ul className="space-y-3">
          {state.notes.map((n) => (
            <li key={n.id} className="group rounded-lg bg-sand px-3.5 py-3">
              <p className="text-2xs text-ink-mute mb-1 flex items-center gap-1">
                <span className="font-semibold text-ink-secondary">{`${n.author_first_name ?? ''} ${n.author_last_name ?? ''}`.trim() || t('Système')}</span> · {when(n.created_at)}
                {n.updated_at !== n.created_at && <span>· {t('modifiée')}</span>}
                {canEdit(n) && editing?.id !== n.id && (
                  <span className="ml-auto flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100">
                    <button onClick={() => setEditing({ id: n.id, body: n.body })} className="p-1 rounded hover:bg-white" aria-label={t('Modifier la note')}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => void remove(n)} className="p-1 rounded hover:bg-white" aria-label={t('Supprimer la note')}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
              </p>
              {editing?.id === n.id ? (
                <div className="space-y-2">
                  <textarea className="form-input py-2 min-h-16 text-sm" maxLength={5000} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} aria-label={t('Modifier la note')} autoFocus />
                  <div className="flex justify-end gap-2">
                    <button className="btn btn-xs btn-ghost" onClick={() => setEditing(null)}>
                      {t('Annuler')}
                    </button>
                    <button className="btn btn-xs btn-primary" disabled={!editing.body.trim() || busy} onClick={() => void save()}>
                      {t('Enregistrer')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-secondary whitespace-pre-wrap">{n.body}</p>
              )}
            </li>
          ))}
          {state.notes.length === 0 && <li className="text-sm text-ink-mute">{t('Aucune note')}</li>}
        </ul>
      )}
    </div>
  )
}
