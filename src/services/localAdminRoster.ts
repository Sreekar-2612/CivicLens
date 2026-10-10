import type { AdminUserRosterItem } from './adminService'

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

export function getStoredLocalUsers(): AdminUserRosterItem[] {
  try {
    const raw = globalThis.localStorage?.getItem(LOCAL_ADMIN_USERS_KEY)
    if (raw) {
      const users = JSON.parse(raw)
      if (!Array.isArray(users)) throw new Error('Invalid local roster')
      return users
    }
  } catch (e) {
    throw new Error('The local user roster could not be loaded')
  }
  return structuredClone(INITIAL_DEMO_USERS)
}

export function saveStoredLocalUsers(users: AdminUserRosterItem[]) {
  if (!globalThis.localStorage) throw new Error('Local storage is unavailable')
  globalThis.localStorage.setItem(LOCAL_ADMIN_USERS_KEY, JSON.stringify(users))
}

