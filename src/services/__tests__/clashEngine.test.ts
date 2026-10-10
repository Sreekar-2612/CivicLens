import { describe, expect, it } from 'vitest'
import { projects } from '../../data/projects'
import { detectProjectClash } from '../clashEngine'

const base = projects[0]
const roadWork = {
  ...base,
  id: 'road-work', departmentId: 'roads', road: 'Test Road',
  category: 'road_resurfacing' as const, status: 'planned' as const,
  startDate: '2026-01-01', originalEndDate: '2026-02-01',
  location: { lat: 18.5204, lng: 73.8567 },
}
const utilityWork = {
  ...base,
  id: 'utility-work', departmentId: 'water', road: 'Test Road',
  category: 'water_pipeline' as const, status: 'planned' as const,
  startDate: '2026-01-15', originalEndDate: '2026-03-01',
  location: { lat: 18.5205, lng: 73.8567 },
}

describe('project clash detection', () => {
  it('scores overlapping cross-department excavation on one road', () => {
    const alert = detectProjectClash(roadWork, utilityWork)
    expect(alert?.score).toBe(90)
    expect(alert?.severity).toBe('critical')
    expect(alert?.reasons.map(reason => reason.type)).toContain('overlapping_dates')
  })

  it('ignores work on the same road when dates do not overlap', () => {
    expect(detectProjectClash(roadWork, { ...utilityWork, startDate: '2027-01-01', originalEndDate: '2027-02-01' })).toBeNull()
  })

  it('detects work within 200 metres despite different road labels', () => {
    const alert = detectProjectClash(roadWork, { ...utilityWork, road: 'Side Lane' })
    expect(alert?.reasons.some(reason => reason.type === 'nearby_location')).toBe(true)
  })

  it('flags utility work within 365 days after completed resurfacing', () => {
    const resurfacing = { ...roadWork, status: 'completed' as const, actualEndDate: '2026-02-01' }
    const alert = detectProjectClash(resurfacing, { ...utilityWork, startDate: '2026-12-01', originalEndDate: '2027-01-01' })
    expect(alert?.reasons.some(reason => reason.type === 'recent_excavation')).toBe(true)
  })

  it('does not flag work within the same department', () => {
    expect(detectProjectClash(roadWork, { ...utilityWork, departmentId: 'roads' })).toBeNull()
  })
})
