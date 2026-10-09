import { describe, it, expect } from 'vitest'
import {
  validateProjectCreation,
  validateDeadlineRevision,
  validateProgressUpdate,
} from '../projectValidation'
import type { Project } from '../../types'

describe('Project Validation & Lifecycle Constraints', () => {
  const sampleProject: Project = {
    id: 'proj-test-1',
    title: 'JM Road Water Pipe Repair',
    purpose: 'Repair burst pipeline',
    departmentId: 'dept-water',
    contractor: 'WaterTech Inc',
    category: 'water_pipeline',
    status: 'in_progress',
    confidenceIndicator: 'on_track',
    road: 'JM Road',
    locality: 'Shivajinagar',
    ward: 'Ward 14',
    location: { lat: 18.5256, lng: 73.8438 },
    startDate: '2026-06-01',
    originalEndDate: '2026-09-30',
    progressPercent: 40,
    isPublished: true,
    createdAt: '2026-05-01T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
  }

  describe('Project Creation Validation', () => {
    it('accepts a valid project creation payload', () => {
      const res = validateProjectCreation({
        title: 'New Flyover Construction',
        road: 'Airport Road',
        departmentId: 'dept-roads',
        contractor: 'L&T',
        startDate: '2026-01-01',
        originalEndDate: '2026-12-31',
        progressPercent: 0,
      })
      expect(res.isValid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('rejects project when deadline is earlier than start date', () => {
      const res = validateProjectCreation({
        title: 'Invalid Timeline Project',
        road: 'Airport Road',
        departmentId: 'dept-roads',
        contractor: 'L&T',
        startDate: '2026-12-01',
        originalEndDate: '2026-06-01', // End before start!
      })
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('Original completion deadline cannot be earlier')
    })

    it('rejects project with missing title or road', () => {
      const res = validateProjectCreation({
        title: '',
        road: '',
        departmentId: 'dept-roads',
        contractor: 'L&T',
        startDate: '2026-01-01',
        originalEndDate: '2026-06-01',
      })
      expect(res.isValid).toBe(false)
      expect(res.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Deadline Revision & Immutability Rules', () => {
    it('strictly rejects deadline extension when delay reason is missing', () => {
      const res = validateDeadlineRevision(
        sampleProject,
        '2026-11-30', // Extended by 2 months
        '' // No delay reason!
      )
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('justification/delay reason')
    })

    it('strictly rejects deadline extension when delay reason is too short', () => {
      const res = validateDeadlineRevision(
        sampleProject,
        '2026-11-30',
        'rain' // Too short (< 5 chars)
      )
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('justification/delay reason')
    })

    it('accepts deadline revision when valid reason is provided', () => {
      const res = validateDeadlineRevision(
        sampleProject,
        '2026-11-30',
        'Subsurface rock formation encountered requiring hydraulic breakers.'
      )
      expect(res.isValid).toBe(true)
      expect(res.errors).toHaveLength(0)
    })

    it('rejects revised deadline that is earlier than project start date', () => {
      const res = validateDeadlineRevision(
        sampleProject,
        '2026-05-01', // Earlier than 2026-06-01 start date!
        'Attempting to backdate target'
      )
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('earlier than project start date')
    })
  })

  describe('Progress Update Validation', () => {
    it('rejects invalid percentage outside 0-100 range', () => {
      const res = validateProgressUpdate(sampleProject, 120)
      expect(res.isValid).toBe(false)
    })

    it('rejects marking project completed when progress is less than 100%', () => {
      const res = validateProgressUpdate(sampleProject, 85, 'completed')
      expect(res.isValid).toBe(false)
      expect(res.errors[0]).toContain('Cannot set status to completed')
    })

    it('accepts valid 100% completed status', () => {
      const res = validateProgressUpdate(sampleProject, 100, 'completed')
      expect(res.isValid).toBe(true)
    })
  })
})
