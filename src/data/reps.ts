/**
 * Sales reps of a company, for the « Représentant / Responsable » pickers. With the backend the list comes from
 * GET /companies/:id/representatives (a rep may work for several companies); in the demo it is REPS by company.
 */
import { API_MODE } from '../api/config'
import { repsOf } from './api-sync'
import { REPS, type CompanyId, type Rep } from './mock'

export function companyReps(company: CompanyId | undefined): Rep[] {
  if (!company) return []
  return API_MODE ? repsOf(company) : REPS.filter((r) => r.company === company)
}

/** Reps of the companies in scope ('all' = every company of the user). */
export function scopeReps(scope: CompanyId | 'all'): Rep[] {
  if (!API_MODE) return REPS.filter((r) => r.company !== 'all' && (scope === 'all' || r.company === scope))
  const ids = new Set<string>()
  const out: Rep[] = []
  for (const c of scope === 'all' ? (['toit', 'sg', 'reno'] as CompanyId[]) : [scope])
    for (const r of repsOf(c))
      if (!ids.has(r.id)) {
        ids.add(r.id)
        out.push(r)
      }
  return out
}
