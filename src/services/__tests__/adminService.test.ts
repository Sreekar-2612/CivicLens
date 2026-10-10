import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.hoisted(() => vi.fn())
const rpc = vi.hoisted(() => vi.fn())
vi.mock('../supabaseClient', () => ({ supabase: { functions: { invoke }, rpc } }))
vi.mock('../dataRepository', () => ({ dataRepository: { getProjects: vi.fn(), getDepartments: vi.fn() } }))
import { adminService } from '../adminService'
import { getWorkspace, submitTask, reviewTask, assignContractor } from '../workflowService'

const contractor = { id: 'contractor-id', role: 'contractor', departmentId: 'dept-roads', displayName: 'Contractor', isDemoUser: false }
const auditor = { ...contractor, id: 'auditor-id', role: 'auditor' }

beforeEach(() => {
  vi.clearAllMocks()
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store.get(key) || null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
  })
})

describe('live administrator requests', () => {
  it('lets only auditors request contractor dispatch and propagates backend denials', async () => {
    await expect(assignContractor(contractor, 'project-a', 'contractor-id', 'report-a')).rejects.toThrow('permissions')
    expect(invoke).not.toHaveBeenCalled()
    invoke.mockResolvedValue({ data: { success: false, error: 'Department access denied' }, error: null })
    await expect(assignContractor(auditor, 'project-a', 'contractor-id', 'report-a')).rejects.toThrow('Department access denied')
    expect(invoke).toHaveBeenCalledWith('assign-contractor', { body: { projectId: 'project-a', contractorId: 'contractor-id', reportId: 'report-a' } })
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })

  it('loads actual assigned resident issues and verified contractor options', async () => {
    invoke.mockResolvedValue({ error: null, data: { success: true, projects: [], assignments: [], submissions: [], reviews: [],
      reports: [{ id: 'report-a', reference_id: 'GRV-A', title: 'Open pit', latitude: 18.5, longitude: 73.8 }],
      contractors: [{ id: 'contractor-id', display_name: 'Registered contractor', department_id: 'dept-roads' }],
    } })
    const workspace = await getWorkspace(auditor)
    expect(workspace.reports?.[0].location).toEqual({ lat: 18.5, lng: 73.8 })
    expect(workspace.contractors).toEqual([{ id: 'contractor-id', displayName: 'Registered contractor', departmentId: 'dept-roads' }])
  })
  it('never substitutes sample staff after an authorization failure', async () => {
    invoke.mockResolvedValue({ data: { success: false, error: 'Administrator access denied' }, error: null })
    await expect(adminService.getRosterData()).rejects.toThrow('Administrator access denied')
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })
  it('never reports a rejected assignment as a local success or retries a write', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Network unavailable') })
    await expect(adminService.updateUserAssignment('user-id', 'contractor', 'dept-roads', ['project-a'])).rejects.toThrow('Network unavailable')
    expect(rpc).not.toHaveBeenCalled()
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })
  it('maps database projects and departments for the assignment form', async () => {
    invoke.mockResolvedValue({ error: null, data: { success: true,
      roster: [{ id: 'staff', role: 'department_officer', display_name: 'Officer', department_id: 'dept-roads' }],
      departments: [{ id: 'dept-roads', name: 'Roads', short_name: 'RD' }],
      projects: [{ id: 'project-a', title: 'Road works', department_id: 'dept-roads', road_name: 'Main Road', progress_percent: 30 }],
    } })
    const result = await adminService.getRosterData()
    expect(result.roster[0]).toMatchObject({ role: 'officer', departmentId: 'dept-roads' })
    expect(result.departments[0].shortName).toBe('RD')
    expect(result.projects[0]).toMatchObject({ departmentId: 'dept-roads', road: 'Main Road', progressPercent: 30 })
  })
  it('accepts an empty live roster without injecting demo users', async () => {
    invoke.mockResolvedValue({ error: null, data: { success: true, roster: [], departments: [], projects: [] } })
    expect((await adminService.getRosterData()).roster).toEqual([])
  })
  it('saves successfully without writing to the demo assignment store', async () => {
    invoke.mockResolvedValue({ error: null, data: { success: true } })
    expect((await adminService.updateUserAssignment('user-id', 'auditor', 'dept-roads', [])).success).toBe(true)
    expect(invoke).toHaveBeenCalledWith('admin-users', { method: 'POST', body: {
      targetUserId: 'user-id', newRole: 'auditor', newDepartmentId: 'dept-roads', projectIds: [],
    } })
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })
})

describe('live staff requests', () => {
  beforeEach(() => invoke.mockResolvedValue({ data: { success: false, error: 'Project access denied' }, error: null }))
  it('fails closed when workspace access is rejected', async () => {
    localStorage.setItem('civiclens_workflow_v1', JSON.stringify({ projectIds: ['project-a'], submissions: [], reviews: [] }))
    vi.mocked(localStorage.setItem).mockClear()
    await expect(getWorkspace(contractor)).rejects.toThrow('Project access denied')
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })
  it('does not simulate a rejected contractor submission', async () => {
    await expect(submitTask(contractor, { projectId: 'project-a', title: 'Road works', description: 'The road surface is prepared.',
      progressPercent: 50, submissionType: 'progress' })).rejects.toThrow('Project access denied')
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })
  it('does not simulate a rejected auditor approval', async () => {
    await expect(reviewTask(auditor, 'submission-id', 'approved', '')).rejects.toThrow('Project access denied')
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })
})
