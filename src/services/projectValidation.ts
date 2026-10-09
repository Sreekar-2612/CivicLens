// ============================================================
// CivicLens — Project Lifecycle Validation Rules
// Enforces Stage 1 constraints on data consistency and deadline immutability
// ============================================================
import type { Project, ProjectCategory, ProjectStatus } from '../types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function validateProjectCreation(data: Partial<Project>): ValidationResult {
  const errors: string[] = []

  if (!data.title || data.title.trim().length < 3) {
    errors.push('Project title is required and must be at least 3 characters.')
  }

  if (!data.road || data.road.trim().length === 0) {
    errors.push('Road or street name is required.')
  }

  if (!data.departmentId || data.departmentId.trim().length === 0) {
    errors.push('Authorizing department is required.')
  }

  if (!data.contractor || data.contractor.trim().length === 0) {
    errors.push('Contractor name is required.')
  }

  if (!data.startDate) {
    errors.push('Sanctioned start date is required.')
  }

  if (!data.originalEndDate) {
    errors.push('Original contractual completion date is required.')
  }

  if (data.startDate && data.originalEndDate) {
    const start = new Date(data.startDate).getTime()
    const end = new Date(data.originalEndDate).getTime()
    if (isNaN(start) || isNaN(end)) {
      errors.push('Start date and end date must be valid ISO dates.')
    } else if (end < start) {
      errors.push('Original completion deadline cannot be earlier than the sanctioned start date.')
    }
  }

  if (data.progressPercent !== undefined) {
    if (data.progressPercent < 0 || data.progressPercent > 100) {
      errors.push('Progress percentage must be between 0% and 100%.')
    }
  }

  if (data.location) {
    if (data.location.lat < -90 || data.location.lat > 90) {
      errors.push('Latitude must be between -90 and 90 degrees.')
    }
    if (data.location.lng < -180 || data.location.lng > 180) {
      errors.push('Longitude must be between -180 and 180 degrees.')
    }
  }

  if (data.budgetLakhs !== undefined && data.budgetLakhs < 0) {
    errors.push('Budget cannot be negative.')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateDeadlineRevision(
  currentProject: Project,
  newEndDate: string,
  delayReason?: string
): ValidationResult {
  const errors: string[] = []
  const effectiveCurrentEnd = currentProject.revisedEndDate || currentProject.originalEndDate

  if (!newEndDate) {
    errors.push('Revised deadline date is required.')
    return { isValid: false, errors }
  }

  const newTime = new Date(newEndDate).getTime()
  const startTime = new Date(currentProject.startDate).getTime()

  if (isNaN(newTime)) {
    errors.push('Revised deadline must be a valid date.')
  } else if (newTime < startTime) {
    errors.push('Revised deadline cannot be earlier than project start date.')
  }

  // If the deadline is actually changed, a delay reason is strictly mandatory
  if (newEndDate !== effectiveCurrentEnd) {
    if (!delayReason || delayReason.trim().length < 5) {
      errors.push('A valid justification/delay reason (minimum 5 characters) is required when modifying project completion deadlines.')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function validateProgressUpdate(
  currentProject: Project,
  newProgressPercent: number,
  newStatus?: ProjectStatus
): ValidationResult {
  const errors: string[] = []

  if (newProgressPercent < 0 || newProgressPercent > 100) {
    errors.push('Progress percentage must be between 0 and 100.')
  }

  if (newStatus === 'completed' && newProgressPercent < 100) {
    errors.push('Cannot set status to completed while progress is under 100%.')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
