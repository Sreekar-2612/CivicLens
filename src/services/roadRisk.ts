import type { Project } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

/** Flags a schedule for review when utility work starts within 365 days of recorded resurfacing. */
export function hasRepeatExcavationRisk(
  completedRoadWorks: Project[],
  plannedOrActiveWorks: Project[],
): boolean {
  return completedRoadWorks
    .filter(project => project.category === 'road_resurfacing' || project.category === 'road_construction')
    .some(resurfacing => {
      if (!resurfacing.actualEndDate) return false
      const completedAt = Date.parse(`${resurfacing.actualEndDate}T00:00:00Z`)
      if (Number.isNaN(completedAt)) return false

      return plannedOrActiveWorks
        .filter(project => ['water_pipeline', 'gas_pipeline', 'drainage', 'telecom'].includes(project.category))
        .some(excavation => {
          const excavationAt = Date.parse(`${excavation.startDate}T00:00:00Z`)
          return excavationAt >= completedAt && excavationAt - completedAt <= 365 * DAY_MS
        })
    })
}
