import { describe, expect, it } from 'vitest'
import { projects } from '../../data/projects'
import { hasRepeatExcavationRisk } from '../roadRisk'

const base = projects[0]
const resurfacing = {
  ...base,
  category: 'road_resurfacing' as const,
  status: 'completed' as const,
  actualEndDate: '2025-01-01',
}
const utilityWork = {
  ...base,
  id: 'utility-work',
  category: 'water_pipeline' as const,
  status: 'planned' as const,
  startDate: '2026-01-02',
}

describe('repeat excavation risk', () => {
  it('flags a utility start within 365 days of recorded completion', () => {
    expect(hasRepeatExcavationRisk([resurfacing], [{ ...utilityWork, startDate: '2025-12-31' }])).toBe(true)
  })

  it('does not flag work outside the 365 day window', () => {
    expect(hasRepeatExcavationRisk([resurfacing], [utilityWork])).toBe(false)
  })

  it('requires an actual completion date', () => {
    expect(hasRepeatExcavationRisk([{ ...resurfacing, actualEndDate: undefined }], [utilityWork])).toBe(false)
  })
})
