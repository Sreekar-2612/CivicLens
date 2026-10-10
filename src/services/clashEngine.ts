import type { AlertReason, CoordinationAlert, Project } from '../types'

const excavationCategories = new Set([
  'road_construction', 'road_resurfacing', 'water_pipeline', 'drainage',
  'electricity', 'telecom', 'gas_pipeline',
])
const utilityCategories = new Set(['water_pipeline', 'drainage', 'electricity', 'telecom', 'gas_pipeline'])
const DAY_MS = 24 * 60 * 60 * 1000

const roadKey = (road: string) => road.toLowerCase().replace(/[^a-z0-9]/g, '')
const date = (value: string) => Date.parse(`${value.slice(0, 10)}T00:00:00Z`)

function distanceMetres(a: Project, b: Project): number {
  const lat = (a.location.lat + b.location.lat) / 2 * Math.PI / 180
  const north = (a.location.lat - b.location.lat) * 111_320
  const east = (a.location.lng - b.location.lng) * 111_320 * Math.cos(lat)
  return Math.hypot(north, east)
}

function isRecentResurfacing(resurfacing: Project, excavation: Project): boolean {
  if (resurfacing.status !== 'completed' || !resurfacing.actualEndDate ||
      !['road_resurfacing', 'road_construction'].includes(resurfacing.category) ||
      !utilityCategories.has(excavation.category)) return false
  const elapsed = date(excavation.startDate) - date(resurfacing.actualEndDate)
  return elapsed >= 0 && elapsed <= 365 * DAY_MS
}

export function detectProjectClash(a: Project, b: Project): CoordinationAlert | null {
  if (a.id === b.id || a.departmentId === b.departmentId ||
      a.status === 'cancelled' || b.status === 'cancelled') return null

  const sameRoad = Boolean(roadKey(a.road)) && roadKey(a.road) === roadKey(b.road)
  const nearby = distanceMetres(a, b) <= 200
  if (!sameRoad && !nearby) return null

  const endA = date(a.revisedEndDate || a.originalEndDate)
  const endB = date(b.revisedEndDate || b.originalEndDate)
  const overlap = a.status !== 'completed' && b.status !== 'completed' &&
    date(a.startDate) <= endB && date(b.startDate) <= endA
  const recent = isRecentResurfacing(a, b) || isRecentResurfacing(b, a)
  if (!overlap && !recent) return null

  const interfering = a.category !== b.category &&
    excavationCategories.has(a.category) && excavationCategories.has(b.category)
  const reasons: AlertReason[] = []
  if (sameRoad) reasons.push({ type: 'same_road', description: `Both projects are recorded on ${a.road}`, score: 35 })
  else reasons.push({ type: 'nearby_location', description: 'Project points are within 200 metres', score: 20 })
  if (overlap) reasons.push({ type: 'overlapping_dates', description: 'Scheduled work dates overlap', score: 30 })
  if (interfering) reasons.push({ type: 'interfering_categories', description: 'Different excavation work is scheduled on the corridor', score: 25 })
  if (recent) reasons.push({ type: 'recent_excavation', description: 'Utility work starts within 365 days of recorded resurfacing', score: 45 })
  const score = Math.min(100, reasons.reduce((sum, reason) => sum + reason.score, 0))
  if (score < 60) return null

  const [first, second] = [a.id, b.id].sort()
  const now = new Date().toISOString()
  return {
    id: `clash-auto-${first}--${second}`,
    projectAId: first,
    projectBId: second,
    score,
    severity: score >= 90 ? 'critical' : score >= 70 ? 'high' : 'medium',
    reasons,
    status: 'pending_review',
    createdAt: now,
    updatedAt: now,
  }
}

export function detectClashes(projects: Project[]): CoordinationAlert[] {
  const alerts: CoordinationAlert[] = []
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const alert = detectProjectClash(projects[i], projects[j])
      if (alert) alerts.push(alert)
    }
  }
  return alerts
}
