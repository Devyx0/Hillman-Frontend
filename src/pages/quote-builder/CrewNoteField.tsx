import { HardHat } from 'lucide-react'
import { t } from '../../i18n'
import type { Builder } from './useQuoteBuilder'

/**
 * "Note pour l'équipe": printed on the work order and shown in the field-crew view. Kept apart from the
 * internal note (rep and office only), which never reaches the crew.
 */
export function CrewNoteField({ b }: { b: Builder }) {
  return (
    <div className="rounded-lg border border-data-4-edge bg-data-4/25 p-3 space-y-1.5">
      <label htmlFor={`crew-note-${b.quote.id}`} className="flex items-center gap-1.5 label-caps text-data-4-ink">
        <HardHat className="w-3.5 h-3.5" />
        {t("Note pour l'équipe")}
      </label>
      <textarea
        id={`crew-note-${b.quote.id}`}
        className="form-input h-auto py-2 bg-white"
        rows={3}
        value={b.crewNote}
        onChange={(e) => b.setCrewNote(e.target.value)}
        placeholder={t('Instructions de chantier : accès, stationnement, couleur, sortie des descentes…')}
      />
      <p className="text-2xs text-ink-mute">{t("Imprimée sur le bon de travail et visible par l'équipe terrain. Les notes internes ne sont jamais montrées à l'équipe.")}</p>
    </div>
  )
}
