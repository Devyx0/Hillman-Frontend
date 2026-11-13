import { LEAD_STAGES, leadStage } from '../data/leads'
import type { Lead } from '../data/mock'
import { t } from '../i18n'
import { Badge } from './ui'

/** Stage pill for a lead (mockup: `Td`). */
export function LeadStageBadge({ lead }: { lead: Lead }) {
  const stage = leadStage(lead)
  if (stage < 0)
    return (
      <Badge tone="neutral" dot>
        {t('Non qualifié')}
      </Badge>
    )
  return (
    <Badge tone={stage === 3 ? 'good' : stage === 0 ? 'warn' : 'info'} dot>
      {t(LEAD_STAGES[stage])}
    </Badge>
  )
}
