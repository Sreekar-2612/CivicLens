// ============================================================
// CivicLens — Supabase Data Access Adapter
// Connects frontend actions directly to deployed Supabase Edge Functions
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

function functionResult<T>(name: string, data: { success?: boolean; error?: string } & T, error: Error | null, key: keyof T): T[keyof T] {
  if (error) throw new Error(`${name}: ${error.message}`)
  if (!data?.success || !data[key]) throw new Error(`${name}: ${data?.error || 'Invalid response'}`)
  return data[key]
}

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
    referenceId: row.reference_id || `GRV-${row.id}`,
    projectId: row.project_id || undefined,
    category: (row.category || 'other') as any,
    title: row.title,
    description: row.description,
    location: {
      lat: row.latitude ?? 0,
      lng: row.longitude ?? 0,
    },
    locationDescription: row.road_name
      ? [row.road_name, row.locality, row.ward].filter(Boolean).join(', ')
      : 'Location withheld',
    photoUrl: row.evidence_url || undefined,
    status: row.status as any,
    reporterName: row.reporter_name || undefined,
    reporterContact: row.reporter_contact || undefined,
    officerResponse: row.officer_response || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  }
}

export function mapDbClashToDomain(row: any): CoordinationAlert {
  return {
    id: row.id,
    projectAId: row.project_a_id,
    projectBId: row.project_b_id,
    score: row.severity === 'critical' ? 95 : row.severity === 'high' ? 80 : row.severity === 'medium' ? 60 : 30,
    severity: row.severity as any,
    reasons: [
      {
        type: (row.conflict_type as any) || 'same_road',
        description: row.title || 'Inter-departmental scheduling conflict detected',
        score: 80
      }
    ],
    status: row.status as any,
    decisionNotes: row.decision_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  }
}

export class SupabaseDataRepository {
  private get client() {
    if (!supabase) throw new Error('Supabase client is not initialized.')
    return supabase
  }

  // -- Departments (Edge Function: get-departments) --
  async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await this.client.functions.invoke('get-departments')
      if (!error && data?.success && Array.isArray(data.departments)) {
        return data.departments.map(mapDbDepartmentToDomain)
      }
    } catch (e) {
      console.warn('Edge function get-departments fallback to DB:', e)
    }

    // Direct DB Fallback
    const { data, error } = await this.client
      .from('departments')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []).map(mapDbDepartmentToDomain)
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    const departments = await this.getDepartments()
    return departments.find(d => d.id === id)
  }

  // -- Projects (Edge Function: get-projects) --
  async getProjects(filters?: Partial<FilterState>): Promise<Project[]> {
    try {
      const { data, error } = await this.client.functions.invoke('get-projects', {
        body: filters || {}
      })
      if (!error && data?.success && Array.isArray(data.projects)) {
        return data.projects.map(mapDbProjectToDomain)
      }
    } catch (e) {
      console.warn('Edge function get-projects fallback to DB:', e)
    }

    // Direct DB Fallback
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

  // -- Project Details (Edge Function: get-project-detail) --
  async getProject(id: string): Promise<Project | undefined> {
    try {
      const { data, error } = await this.client.functions.invoke('get-project-detail', {
        body: { id }
      })
      if (!error && data?.success && data.project) {
        return mapDbProjectToDomain(data.project)
      }
    } catch (e) {
      console.warn('Edge function get-project-detail fallback to DB:', e)
    }

    const { data, error } = await this.client
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return undefined
    return mapDbProjectToDomain(data)
  }

  async getProjectsByRoad(road: string): Promise<Project[]> {
    const projects = await this.getProjects()
    return projects.filter(p => p.road.toLowerCase().includes(road.toLowerCase()))
  }

  async getProjectsByDepartment(departmentId: string): Promise<Project[]> {
    const projects = await this.getProjects({ department: departmentId })
    return projects
  }

  async getProjectsByWard(ward: string): Promise<Project[]> {
    const projects = await this.getProjects({ ward })
    return projects
  }

  // -- Project Updates (Edge Function: get-project-updates) --
  async getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    try {
      const { data, error } = await this.client.functions.invoke('get-project-updates', {
        body: { projectId }
      })
      if (!error && data?.success && Array.isArray(data.updates)) {
        return data.updates.map(mapDbUpdateToDomain)
      }
    } catch (e) {
      console.warn('Edge function get-project-updates fallback to DB:', e)
    }

    const { data, error } = await this.client
      .from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(mapDbUpdateToDomain)
  }

  async getMilestones(projectId: string): Promise<Milestone[]> {
    const { data, error } = await this.client
      .from('milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('target_date', { ascending: true })
    if (error) throw error
    return (data || []).map(row => ({
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description || undefined,
      targetDate: row.target_date,
      completedDate: row.completed_date || undefined,
      status: row.status,
    }))
  }

  // -- Reports / Grievances (Edge Function: get-grievances) --
  async getReports(): Promise<Report[]> {
    const { data, error } = await this.client.functions.invoke('get-grievances')
    if (error) throw error
    if (!data?.success || !Array.isArray(data.grievances)) {
      throw new Error(`get-grievances: ${data?.error || 'Invalid response'}`)
    }
    return data.grievances.map(mapDbGrievanceToDomain)
  }

  async getReport(id: string): Promise<Report | undefined> {
    const reports = await this.getReports()
    return reports.find(r => r.id === id)
  }

  async getReportByReference(referenceId: string): Promise<Report | undefined> {
    const reports = await this.getReports()
    return reports.find(r => r.referenceId.toLowerCase() === referenceId.toLowerCase())
  }

  async getReportsByProject(projectId: string): Promise<Report[]> {
    const reports = await this.getReports()
    return reports.filter(r => r.projectId === projectId)
  }

  // -- Alerts / Clashes (Edge Function: get-clashes) --
  async getAlerts(): Promise<CoordinationAlert[]> {
    const { data, error } = await this.client.functions.invoke('get-clashes')
    if (error) throw error
    if (!data?.success || !Array.isArray(data.clashes)) {
      throw new Error(`get-clashes: ${data?.error || 'Invalid response'}`)
    }
    return data.clashes.map(mapDbClashToDomain)
  }

  async getAlert(id: string): Promise<CoordinationAlert | undefined> {
    const alerts = await this.getAlerts()
    return alerts.find(a => a.id === id)
  }

  async getAlertsByProject(projectId: string): Promise<CoordinationAlert[]> {
    const alerts = await this.getAlerts()
    return alerts.filter(a => a.projectAId === projectId || a.projectBId === projectId)
  }

  // -- Summary Stats (Edge Function: get-summary-stats) --
  async getSummaryStats(): Promise<SummaryStats> {
    try {
      const { data, error } = await this.client.functions.invoke('get-summary-stats')
      if (!error && data?.success && data.stats) {
        return data.stats
      }
    } catch (e) {
      console.warn('Edge function get-summary-stats fallback to calculation:', e)
    }

    const projects = await this.getProjects()
    const departments = await this.getDepartments()
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'in_progress' || p.status === 'planned').length,
      delayedProjects: projects.filter(p => p.status === 'delayed' || p.confidenceIndicator === 'delayed').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      potentialConflicts: (await this.getAlerts()).filter(a => a.status === 'pending_review').length,
      pendingReports: (await this.getReports()).filter(r => r.status === 'submitted' || r.status === 'acknowledged').length,
      departmentCount: departments.length,
    }
  }

  // -- Create Project (Edge Function: create-project) --
  async addProject(data: Partial<Project>): Promise<Project> {
    const validation = validateProjectCreation(data)
    if (!validation.isValid) {
      throw new Error(`Project creation rejected: ${validation.errors.join(' ')}`)
    }

    const { data: res, error } = await this.client.functions.invoke('create-project', { body: data })
    return mapDbProjectToDomain(functionResult('create-project', res, error, 'project'))
  }

  // -- Update Project (Edge Function: update-project) --
  async updateProject(
    id: string,
    updates: Partial<Project>,
    delayReason?: string,
    authorName?: string
  ): Promise<Project | undefined> {
    const current = await this.getProject(id)
    if (!current) throw new Error(`Project ${id} not found`)

    if (updates.progressPercent !== undefined) {
      const pValidation = validateProgressUpdate(current, updates.progressPercent, updates.status)
      if (!pValidation.isValid) {
        throw new Error(`Progress update rejected: ${pValidation.errors.join(' ')}`)
      }
    }

    if (updates.revisedEndDate && updates.revisedEndDate !== (current.revisedEndDate || current.originalEndDate)) {
      const dValidation = validateDeadlineRevision(current, updates.revisedEndDate, delayReason)
      if (!dValidation.isValid) {
        throw new Error(`Deadline revision rejected: ${dValidation.errors.join(' ')}`)
      }
    }

    const { data: res, error } = await this.client.functions.invoke('update-project', {
      body: { id, updates, delayReason, authorName }
    })
    return mapDbProjectToDomain(functionResult('update-project', res, error, 'project'))
  }

  // -- Add Progress Update (Edge Function: add-project-update) --
  async addProjectUpdate(
    projectId: string,
    update: Partial<ProjectUpdate>
  ): Promise<ProjectUpdate> {
    const { data: res, error } = await this.client.functions.invoke('add-project-update', {
      body: { projectId, update }
    })
    return mapDbUpdateToDomain(functionResult('add-project-update', res, error, 'update'))
  }

  // -- Add Grievance / Report (Edge Function: create-grievance) --
  async addReport(data: Partial<Report>): Promise<Report> {
    const { data: res, error } = await this.client.functions.invoke('create-grievance', { body: data })
    return mapDbGrievanceToDomain(functionResult('create-grievance', res, error, 'grievance'))
  }

  // -- Update Grievance (Edge Function: update-grievance-status) --
  async updateReportStatus(id: string, status: ReportStatus, officerResponse?: string): Promise<Report | undefined> {
    const { data: res, error } = await this.client.functions.invoke('update-grievance-status', {
      body: { id, status, officerResponse }
    })
    return mapDbGrievanceToDomain(functionResult('update-grievance-status', res, error, 'grievance'))
  }

  // -- Resolve Clash (Edge Function: resolve-clash) --
  async updateAlertStatus(id: string, status: AlertStatus, decisionNotes?: string): Promise<CoordinationAlert | undefined> {
    const { data: res, error } = await this.client.functions.invoke('resolve-clash', {
      body: { id, status, decisionNotes }
    })
    return mapDbClashToDomain(functionResult('resolve-clash', res, error, 'clash'))
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
