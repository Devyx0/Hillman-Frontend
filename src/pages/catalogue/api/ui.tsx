/** Small pieces shared by the catalogue tabs in API mode. */
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Badge } from '../../../components/ui'
import { cn } from '../../../lib/utils'
import { t } from '../../../i18n'

export function InactiveBadge() {
  return <Badge tone="neutral">{t('Inactif')}</Badge>
}

/** Deactivate / reactivate icon button. */
export function ActiveButton({ active, onClick, disabled, className }: { active: boolean; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" aria-label={active ? t('Désactiver') : t('Réactiver')} title={active ? t('Désactiver') : t('Réactiver')} disabled={disabled} onClick={onClick} className={cn('p-1.5 rounded-md hover:bg-stone disabled:opacity-30', !active && 'text-primary-press', className)}>
      {active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
    </button>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('w-4 h-4 animate-spin text-ink-mute', className)} />
}
