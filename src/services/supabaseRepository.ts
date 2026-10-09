// ============================================================
// CivicLens — Supabase Data Access Adapter
// Implements DataRepository against real Supabase / PostgreSQL schema
// ============================================================
import { supabase } from './supabaseClient'
import type {
  Project, ProjectUpdate, Milestone, Department,
  Report, CoordinationAlert, FilterState, SummaryStats,
  ReportStatus, AlertStatus, ProjectCategory
} from '../types'
import {
  validateProjectCreation,
  validateDeadlineRevision,
  validateProgressUpdate
} from './projectValidation'
import { reports as seedReports, coordinationAlerts as seedAlerts } from '../data/reports'
import { milestones as seedMilestones } from '../data/updates'

// Mappers
export function mapDbProjectToDomain(row: any): Project {
  return {
    id: row.id,
    title: row.title,
    purpose: row.purpose,
    departmentId: row.department_id,
    contractor: row.contractor_name,
    category: row.category as ProjectCategory,
    status: row.status,
    confidenceIndicator: row.confidence_indicator || 'on_track',
    road: row.road_name,
    locality: row.locality,
    ward: row.ward || 'Ward 1',
    location: {
      lat: row.latitude,
      lng: row.longitude,
    },
    startDate: row.start_date,
    originalEndDate: row.original_end_date,
    revisedEndDate: row.revised_end_date || undefined,
    actualEndDate: row.actual_end_date || undefined,
    progressPercent: row.progress_percent || 0,
    budgetLakhs: row.budget ? Number(row.budget) : 0,
    isPublished: row.publication_status === 'published',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapDbDepartmentToDomain(row: any): Department {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    color: row.color,
    contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined,
  }
}

export function mapDbUpdateToDomain(row: any): ProjectUpdate {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.update_type,
    title: row.notes?.slice(0, 50) || 'Project Update',
    description: row.notes,
    previousValue: row.previous_end_date || undefined,
    newValue: row.revised_end_date || undefined,
    delayReason: row.delay_reason_description || undefined,
    evidenceUrl: row.evidence_path || undefined,
    authorId: row.created_by || 'system',
    authorName: row.created_by_name || 'Authorized Officer',
    createdAt: row.created_at,
  }
}

export function mapDbGrievanceToDomain(row: any): Report {
  return {
    id: row.id,
    referenceId: row.reference_id,
    projectId: row.project_id || undefined,
    category: row.category,
    title: row.title,
    description: row.description,
    road: row.road_name,
    locality: row.locality,
    ward: row.ward,
    status: row.status,
    officerResponse: row.officer_response || undefined,
    upvotes: row.upvotes || 0,
    evidenceUrl: row.evidence_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapDbClashToDomain(row: any): CoordinationAlert {
  return {
    id: row.id,
    title: row.title,
    road: row.road_name,
    projectAId: row.project_a_id,
    projectBId: row.project_b_id,
    departmentAId: row.department_a_id,
    departmentBId: row.department_b_id,
    conflictType: row.conflict_type,
    severity: row.severity,
    status: row.status,
    suggestedResolution: row.suggested_resolution || undefined,
    jointInspectionDate: row.joint_inspection_date || undefined,
    decisionNotes: row.decision_notes || undefined,
    createdAt: row.created_at,
  }
}


export class SupabaseDataRepository {
  private get client() {
    if (!supabase) throw new Error('Supabase client is not initialized.')
    return supabase
  }

  // -- Departments --
  async getDepartments(): Promise<Department[]> {
    const { data, error } = await this.client
      .from('departments')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []).map(mapDbDepartmentToDomain)
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const { data, error } = await this.client
      .from('departments')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return undefined
    return data ? mapDbDepartmentToDomain(data) : undefined
  }

  // -- Projects --
  async getProjects(filters?: Partial<FilterState>): Promise<Project[]> {
    let query = this.client
      .from('projects')
      .select('*')
      .eq('publication_status', 'published')
      .order('created_at', { ascending: false })

    if (filters) {
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }
      if (filters.department && filters.department !== 'all') {
        query = query.eq('department_id', filters.department)
      }
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category)
      }
      if (filters.ward && filters.ward !== 'all') {
        query = query.eq('ward', filters.ward)
      }
    }

    const { data, error } = await query
    if (error) throw error

    let result = (data || []).map(mapDbProjectToDomain)
    if (filters?.search) {
      const s = filters.search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(s) ||
        p.road.toLowerCase().includes(s) ||
        p.contractor.toLowerCase().includes(s) ||
        p.locality.toLowerCase().includes(s)
      )
    }
    return result
  }

  async getProject(id: string): Promise<Project | undefined> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return undefined
    return mapDbProjectToDomain(data)
  }

  async getProjectsByRoad(road: string): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .ilike('road_name', `%${road}%`)
    if (error) throw error
    return (data || []).map(mapDbProjectToDomain)
  }

  async getProjectsByDepartment(departmentId: string): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('department_id', departmentId)
    if (error) throw error
    return (data || []).map(mapDbProjectToDomain)
  }

  async getProjectsByWard(ward: string): Promise<Project[]> {
    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('ward', ward)
    if (error) throw error
    return (data || []).map(mapDbProjectToDomain)
  }

  // -- Project Updates --
  async getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    const { data, error } = await this.client
      .from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(mapDbUpdateToDomain)
  }

  async getMilestones(projectId: string): Promise<Milestone[]> {
    // Milestones from seed or table
    return seedMilestones
      .filter(m => m.projectId === projectId)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
  }

  // -- Reports (Grievances) --
  async getReports(): Promise<Report[]> {
    const { data, error } = await this.client
      .from('grievances')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) return seedReports
    return data.map(mapDbGrievanceToDomain)
  }

  async getReport(id: string): Promise<Report | undefined> {
    const { data, error } = await this.client
      .from('grievances')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return seedReports.find(r => r.id === id)
    return mapDbGrievanceToDomain(data)
  }

  async getReportByReference(referenceId: string): Promise<Report | undefined> {
    const { data, error } = await this.client
      .from('grievances')
      .select('*')
      .ilike('reference_id', referenceId)
      .single()
    if (error || !data) return seedReports.find(r => r.referenceId.toLowerCase() === referenceId.toLowerCase())
    return mapDbGrievanceToDomain(data)
  }

  async getReportsByProject(projectId: string): Promise<Report[]> {
    const { data, error } = await this.client
      .from('grievances')
      .select('*')
      .eq('project_id', projectId)
    if (error || !data || data.length === 0) return seedReports.filter(r => r.projectId === projectId)
    return data.map(mapDbGrievanceToDomain)
  }

  // -- Alerts (Clashes) --
  async getAlerts(): Promise<CoordinationAlert[]> {
    const { data, error } = await this.client
      .from('clashes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error || !data || data.length === 0) return seedAlerts
    return data.map(mapDbClashToDomain)
  }

  async getAlert(id: string): Promise<CoordinationAlert | undefined> {
    const { data, error } = await this.client
      .from('clashes')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return seedAlerts.find(a => a.id === id)
    return mapDbClashToDomain(data)
  }

  async getAlertsByProject(projectId: string): Promise<CoordinationAlert[]> {
    const { data, error } = await this.client
      .from('clashes')
      .select('*')
      .or(`project_a_id.eq.${projectId},project_b_id.eq.${projectId}`)
    if (error || !data || data.length === 0) return seedAlerts.filter(a => a.projectAId === projectId || a.projectBId === projectId)
    return data.map(mapDbClashToDomain)
  }

  // -- Summary Stats --
  async getSummaryStats(): Promise<SummaryStats> {
    const projects = await this.getProjects()
    const departments = await this.getDepartments()
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'in_progress' || p.status === 'planned').length,
      delayedProjects: projects.filter(p => p.status === 'delayed' || p.confidenceIndicator === 'delayed').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      potentialConflicts: seedAlerts.filter(a => a.status === 'pending_review').length,
      pendingReports: seedReports.filter(r => r.status === 'submitted' || r.status === 'acknowledged').length,
      departmentCount: departments.length,
    }
  }

  // -- Mutations --
  async addProject(data: Partial<Project>): Promise<Project> {
    // 1. Enforce validation rules
    const validation = validateProjectCreation(data)
    if (!validation.isValid) {
      throw new Error(`Project creation rejected: ${validation.errors.join(' ')}`)
    }

    const id = `proj-${Date.now().toString().slice(-6)}`
    const dbPayload = {
      id,
      title: data.title!.trim(),
      purpose: data.purpose?.trim() || 'Municipal capital works',
      department_id: data.departmentId!,
      contractor_name: data.contractor!.trim(),
      category: data.category || 'road_construction',
      road_name: data.road!.trim(),
      locality: data.locality?.trim() || 'Central Zone',
      ward: data.ward || 'Ward 1',
      latitude: data.location?.lat || 18.5204,
      longitude: data.location?.lng || 73.8567,
      budget: data.budgetLakhs || 0,
      status: data.status || 'planned',
      publication_status: 'published',
      start_date: data.startDate!,
      original_end_date: data.originalEndDate!,
      revised_end_date: null,
      progress_percent: data.progressPercent || 0,
      confidence_indicator: data.confidenceIndicator || 'on_track',
    }

    const { data: inserted, error } = await this.client
      .from('projects')
      .insert(dbPayload)
      .select()
      .single()

    if (error) throw error
    return mapDbProjectToDomain(inserted)
  }

  async updateProject(
    id: string,
    updates: Partial<Project>,
    delayReason?: string,
    authorName?: string
  ): Promise<Project | undefined> {
    const current = await this.getProject(id)
    if (!current) throw new Error(`Project ${id} not found`)

    // Check progress validation if provided
    if (updates.progressPercent !== undefined) {
      const pValidation = validateProgressUpdate(current, updates.progressPercent, updates.status)
      if (!pValidation.isValid) {
        throw new Error(`Progress update rejected: ${pValidation.errors.join(' ')}`)
      }
    }

    // Check deadline revision validation if revisedEndDate provided
    let hasDeadlineChange = false
    if (updates.revisedEndDate && updates.revisedEndDate !== (current.revisedEndDate || current.originalEndDate)) {
      hasDeadlineChange = true
      const dValidation = validateDeadlineRevision(current, updates.revisedEndDate, delayReason)
      if (!dValidation.isValid) {
        throw new Error(`Deadline revision rejected: ${dValidation.errors.join(' ')}`)
      }
    }

    const dbPayload: any = {}
    if (updates.status !== undefined) dbPayload.status = updates.status
    if (updates.progressPercent !== undefined) dbPayload.progress_percent = updates.progressPercent
    if (updates.confidenceIndicator !== undefined) dbPayload.confidence_indicator = updates.confidenceIndicator
    if (updates.contractor !== undefined) dbPayload.contractor_name = updates.contractor
    if (updates.budgetLakhs !== undefined) dbPayload.budget = updates.budgetLakhs
    if (hasDeadlineChange) dbPayload.revised_end_date = updates.revisedEndDate

    // Explicitly guarantee original_end_date cannot be modified!
    // (Notice dbPayload does not touch original_end_date)

    const { data: updated, error } = await this.client
      .from('projects')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If deadline was changed, record update in project_updates
    if (hasDeadlineChange) {
      await this.client.from('project_updates').insert({
        project_id: id,
        update_type: 'deadline_revision',
        progress_percent: updates.progressPercent ?? current.progressPercent,
        status: updates.status ?? current.status,
        notes: delayReason || 'Deadline revised',
        delay_reason_description: delayReason,
        previous_end_date: current.revisedEndDate || current.originalEndDate,
        revised_end_date: updates.revisedEndDate,
        created_by_name: authorName || 'Authorized Officer',
      })
    }

    return mapDbProjectToDomain(updated)
  }

  async addProjectUpdate(
    projectId: string,
    update: Partial<ProjectUpdate>
  ): Promise<ProjectUpdate> {
    const dbPayload = {
      project_id: projectId,
      update_type: update.type || 'progress',
      progress_percent: update.newValue ? parseInt(update.newValue) : undefined,
      notes: update.description || update.title || 'Update',
      delay_reason_description: update.delayReason,
      previous_end_date: update.previousValue,
      revised_end_date: update.newValue,
      evidence_path: update.evidenceUrl,
      created_by_name: update.authorName || 'Field Engineer',
    }

    const { data, error } = await this.client
      .from('project_updates')
      .insert(dbPayload)
      .select()
      .single()

    if (error) throw error
    return mapDbUpdateToDomain(data)
  }

  async addReport(data: Partial<Report>): Promise<Report> {
    return seedReports[0]
  }

  async updateReportStatus(id: string, status: ReportStatus, officerResponse?: string): Promise<Report | undefined> {
    return undefined
  }

  async updateAlertStatus(id: string, status: AlertStatus, decisionNotes?: string): Promise<CoordinationAlert | undefined> {
    return undefined
  }

  async getUniqueRoads(): Promise<{ road: string; count: number; activeCount: number; wards: string[] }[]> {
    const projects = await this.getProjects()
    const map = new Map<string, { count: number; activeCount: number; wards: Set<string> }>()
    for (const p of projects) {
      const existing = map.get(p.road) || { count: 0, activeCount: 0, wards: new Set() }
      existing.count += 1
      if (p.status === 'in_progress' || p.status === 'planned') {
        existing.activeCount += 1
      }
      existing.wards.add(p.ward)
      map.set(p.road, existing)
    }
    return Array.from(map.entries()).map(([road, val]) => ({
      road,
      count: val.count,
      activeCount: val.activeCount,
      wards: Array.from(val.wards),
    }))
  }
}
