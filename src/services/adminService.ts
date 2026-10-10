import { supabase } from './supabaseClient'
import { dataRepository } from './dataRepository'
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

const LOCAL_ADMIN_USERS_KEY = 'quicksort_admin_users_v1'

const INITIAL_DEMO_USERS: AdminUserRosterItem[] = [
  {
    id: 'usr-demo-admin',
    displayName: 'Sreekar Tirumala (Chief Administrator)',
    role: 'admin',
    email: 'sreekartirumala0706@gmail.com',
    assignments: [],
    submissionCount: 0,
    reviewCount: 0,
    createdAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'usr-demo-officer',
    displayName: 'Rajesh Patil (Roads Department)',
    role: 'officer',
    departmentId: 'dept-roads',
    email: 'officer.roads@civiclens.gov.in',
    assignments: [],
    submissionCount: 0,
    reviewCount: 0,
    createdAt: '2026-10-02T09:30:00Z',
  },
  {
    id: 'usr-demo-contractor',
    displayName: 'Premier Road Works Contractor',
    role: 'contractor',
    departmentId: 'dept-roads',
    email: 'contractor.premier@civiclens.gov.in',
    assignments: [
      {
        project_id: 'proj-001',
        assignment_role: 'contractor',
        project_title: 'MG Road Resurfacing — Sector 4 to Station Link',
        road: 'MG Road',
        status: 'in_progress',
        progress_percent: 65,
      },
      {
        project_id: 'proj-004',
        assignment_role: 'contractor',
        project_title: 'Station Main Road Conduit Trenching',
        road: 'Station Road',
        status: 'delayed',
        progress_percent: 45,
      },
    ],
    submissionCount: 4,
    reviewCount: 0,
    createdAt: '2026-10-03T11:00:00Z',
  },
  {
    id: 'usr-demo-auditor',
    displayName: 'V. K. Sen (Independent Quality Auditor)',
    role: 'auditor',
    departmentId: 'dept-roads',
    email: 'auditor.roads@civiclens.gov.in',
    assignments: [
      {
        project_id: 'proj-001',
        assignment_role: 'auditor',
        project_title: 'MG Road Resurfacing — Sector 4 to Station Link',
        road: 'MG Road',
        status: 'in_progress',
        progress_percent: 65,
      },
      {
        project_id: 'proj-004',
        assignment_role: 'auditor',
        project_title: 'Station Main Road Conduit Trenching',
        road: 'Station Road',
        status: 'delayed',
        progress_percent: 45,
      },
    ],
    submissionCount: 0,
    reviewCount: 3,
    createdAt: '2026-10-03T11:30:00Z',
  },
  {
    id: 'usr-resident-01',
    displayName: 'M Naga Venkata Sai',
    role: 'resident',
    email: 'venkatasaimeka2006@gmail.com',
    assignments: [],
    submissionCount: 0,
    reviewCount: 0,
    createdAt: '2026-10-05T14:15:00Z',
  },
]

function getStoredLocalUsers(): AdminUserRosterItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_USERS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to parse local admin users', e)
  }
  return INITIAL_DEMO_USERS
}

function saveStoredLocalUsers(users: AdminUserRosterItem[]) {
  try {
    localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(users))
  } catch (e) {
    console.warn('Failed to save local admin users', e)
  }
}

export const adminService = {
  async getRosterData(): Promise<AdminRosterResponse> {
    if (supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('admin-users', {
          method: 'GET',
        })
        if (!error && data?.success) {
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
            departments: data.departments || await dataRepository.getDepartments(),
            projects: data.projects || await dataRepository.getProjects(),
          }
        }
      } catch (err) {
        console.warn('Edge function admin-users call failed, falling back to local/DB query', err)
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
    let dbSuccess = false
    let statusMessage = ''

    if (supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('admin-users', {
          method: 'POST',
          body: {
            targetUserId,
            newRole,
            newDepartmentId: departmentId || null,
            projectIds,
          },
        })

        if (!error && data?.success) {
          dbSuccess = true
          statusMessage = 'User role and assignments successfully saved to database.'
        }
      } catch (err: any) {
        console.warn('Edge function update failed, attempting direct DB query', err)
      }

      if (!dbSuccess) {
        try {
          const { error: rpcErr } = await supabase.rpc('admin_update_user_assignment', {
            p_target_user_id: targetUserId,
            p_new_role: newRole === 'officer' ? 'department_officer' : newRole,
            p_new_department_id: departmentId || null,
            p_project_ids: projectIds,
          })
          if (!rpcErr) {
            dbSuccess = true
            statusMessage = 'User assignments successfully updated in Supabase database.'
          }
        } catch (rpcEx) {
          console.warn('Direct RPC also failed', rpcEx)
        }
      }
    }

    // Always synchronize local simulation state so UI immediately reflects everywhere
    const users = getStoredLocalUsers()
    const index = users.findIndex(u => u.id === targetUserId)
    const projects = await dataRepository.getProjects()
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

    if (index >= 0) {
      users[index] = {
        ...users[index],
        role: newRole,
        departmentId: departmentId || undefined,
        assignments: assignedObjects,
      }
    } else {
      users.push({
        id: targetUserId,
        displayName: 'Assigned User',
        role: newRole,
        departmentId: departmentId || undefined,
        assignments: assignedObjects,
        submissionCount: 0,
        reviewCount: 0,
      })
    }
    saveStoredLocalUsers(users)

    // Synchronize workflow service state
    try {
      const workflowKey = 'civiclens_workflow_v1'
      const rawWf = globalThis.localStorage?.getItem(workflowKey)
      const wfState = rawWf ? JSON.parse(rawWf) : { submissions: [], reviews: [] }
      wfState.projectIds = projectIds
      globalThis.localStorage?.setItem(workflowKey, JSON.stringify(wfState))
    } catch (e) {
      console.warn('Failed to sync workflow store', e)
    }

    // Dispatch global notification event so website components immediately re-render
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('civic-data-updated', {
        detail: { targetUserId, newRole, projectIds, timestamp: Date.now() }
      }))
    }

    return {
      success: true,
      message: dbSuccess
        ? statusMessage
        : 'Assignment updated and synchronized in workspace.',
    }
  },
}
