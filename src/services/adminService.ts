import { supabase } from './supabaseClient'
import { dataRepository } from './dataRepository'
import { mapDbDepartmentToDomain, mapDbProjectToDomain } from './supabaseRepository'
import { getStoredLocalUsers, saveStoredLocalUsers } from './localAdminRoster'
import type { Department, Project, UserRole } from '../types'

export interface AdminUserRosterItem {
  id: string
  displayName: string
  role: UserRole
  departmentId?: string
  email?: string
  createdAt?: string
  assignments: {
    project_id: string
    assignment_role: string
    project_title: string
    road?: string
    status?: string
    progress_percent?: number
  }[]
  submissionCount: number
  reviewCount: number
}

export interface AdminRosterResponse {
  roster: AdminUserRosterItem[]
  departments: Department[]
  projects: Project[]
}

function notifyAssignmentChange(targetUserId?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('civic-data-updated', { detail: { targetUserId } }))
  }
}

async function invokeAdmin(method: 'GET' | 'POST', body?: Record<string, unknown>) {
  if (!supabase) throw new Error('Supabase is unavailable')
  const { data, error } = await supabase.functions.invoke('admin-users', { method, ...(body ? { body } : {}) })
  if (error || !data?.success) throw new Error(data?.error || error?.message || 'Administrator request failed. No changes were saved.')
  return data
}

export const adminService = {
  async getRosterData(): Promise<AdminRosterResponse> {
    if (supabase) {
        const data = await invokeAdmin('GET')
          const rawRoster: any[] = Array.isArray(data.roster) ? data.roster : []
          const roster: AdminUserRosterItem[] = rawRoster.map(item => ({
            id: item.id,
            displayName: item.display_name || item.email?.split('@')[0] || 'User',
            role: (item.role === 'department_officer' ? 'officer' : item.role) as UserRole,
            departmentId: item.department_id || undefined,
            email: item.email || undefined,
            createdAt: item.created_at,
            assignments: Array.isArray(item.assignments) ? item.assignments : [],
            submissionCount: Number(item.submission_count || 0),
            reviewCount: Number(item.review_count || 0),
          }))

          return {
            roster,
            departments: (data.departments || []).map(mapDbDepartmentToDomain),
            projects: (data.projects || []).map(mapDbProjectToDomain),
          }
    }

    // Fallback: Local demo simulation
    const [departments, projects] = await Promise.all([
      dataRepository.getDepartments(),
      dataRepository.getProjects(),
    ])
    return {
      roster: getStoredLocalUsers(),
      departments,
      projects,
    }
  },

  async updateUserAssignment(
    targetUserId: string,
    newRole: UserRole,
    departmentId?: string,
    projectIds: string[] = []
  ): Promise<{ success: boolean; message?: string }> {
    if (supabase) {
        await invokeAdmin('POST', {
            targetUserId,
            newRole,
            newDepartmentId: departmentId || null,
            projectIds,
        })
        notifyAssignmentChange(targetUserId)
        return { success: true, message: 'User role and assignments successfully saved to database.' }
    }

    const users = getStoredLocalUsers()
    const index = users.findIndex(u => u.id === targetUserId)
    if (index < 0) throw new Error('Target user profile not found')
    if (!['resident', 'officer', 'contractor', 'auditor', 'admin'].includes(newRole)) throw new Error('Invalid role')
    if (['officer', 'contractor', 'auditor'].includes(newRole) && !departmentId) throw new Error('A department is required for this role')
    if (!['contractor', 'auditor'].includes(newRole) && projectIds.length) throw new Error('Only contractors and auditors can receive project assignments')
    const projects = await dataRepository.getProjects()
    if (projectIds.some(id => !projects.some(p => p.id === id && p.departmentId === departmentId))) {
      throw new Error('Every assigned project must exist in the selected department')
    }
    if (departmentId && !(await dataRepository.getDepartments()).some(d => d.id === departmentId)) throw new Error('Department not found')
    const assignedObjects = projects
      .filter(p => projectIds.includes(p.id))
      .map(p => ({
        project_id: p.id,
        assignment_role: newRole,
        project_title: p.title,
        road: p.road,
        status: p.status,
        progress_percent: p.progressPercent,
      }))

      users[index] = {
        ...users[index],
        role: newRole,
        departmentId: departmentId || undefined,
        assignments: assignedObjects,
      }
    saveStoredLocalUsers(users)
    notifyAssignmentChange(targetUserId)

    return {
      success: true,
      message: 'Assignment saved in this browser’s demo workspace.',
    }
  },
}
