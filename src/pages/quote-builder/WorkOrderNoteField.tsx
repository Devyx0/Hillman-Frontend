import { ClipboardList } from 'lucide-react'
import { t } from '../../i18n'
import type { Builder } from './useQuoteBuilder'

/**
 * "Note pour le bon de travail": printed on the work order. Kept apart from the internal note
 * (rep and office only), which never appears on it.
 */
export function WorkOrderNoteField({ b }: { b: Builder }) {
  return (
    <div className="rounded-lg border border-data-4-edge bg-data-4/25 p-3 space-y-1.5">
      <label htmlFor={`work-order-note-${b.quote.id}`} className="flex items-center gap-1.5 label-caps text-data-4-ink">
        <ClipboardList className="w-3.5 h-3.5" />
        {t('Note pour le bon de travail')}
      </label>
      <textarea
        id={`work-order-note-${b.quote.id}`}
        className="form-input h-auto py-2 bg-white"
        rows={3}
        value={b.workOrderNote}
        onChange={(e) => b.setWorkOrderNote(e.target.value)}
        placeholder={t('Instructions de chantier : accès, stationnement, couleur, sortie des descentes…')}
      />
      <p className="text-2xs text-ink-mute">{t('Imprimée sur le bon de travail. Les notes internes n’y apparaissent jamais.')}</p>
    </div>
  )
}
