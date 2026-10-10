import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../../types'
import { dataRepository, applyDemoWorkflowProjectState } from '../dataRepository'
import { getWorkspace, submitTask, reviewTask } from '../workflowService'

vi.mock('../supabaseClient', () => ({ supabase: null }))
vi.mock('../dataRepository', () => ({ dataRepository: { getProjects: vi.fn(), getProject: vi.fn() }, applyDemoWorkflowProjectState: vi.fn() }))
const contractor = { id: 'usr-demo-contractor', role: 'contractor', departmentId: 'dept-roads', displayName: 'Contractor', isDemoUser: true }
const auditor = { ...contractor, id: 'usr-demo-auditor', role: 'auditor' }
const input = { projectId: 'road-one', title: 'Work completed', description: 'Road surface and drainage completed', progressPercent: 100, submissionType: 'completion' as const, evidencePath: 'data:image/png;base64,example' }
let project: Project
beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) || null, setItem: (key: string, value: string) => store.set(key, value) })
  store.set('civiclens_workflow_v1', JSON.stringify({ submissions: [], reviews: [], projectIds: ['road-one'] }))
  store.set('quicksort_admin_users_v1', JSON.stringify([contractor, auditor].map(user => ({
    ...user, submissionCount: 0, reviewCount: 0,
    assignments: [{ project_id: 'road-one', assignment_role: user.role, project_title: 'Road work' }],
  }))))
  project = { id: 'road-one', departmentId: 'dept-roads', status: 'in_progress', progressPercent: 80 } as Project
  vi.mocked(dataRepository.getProjects).mockImplementation(async () => [project])
  vi.mocked(dataRepository.getProject).mockImplementation(async id => id === project.id ? project : undefined)
  vi.mocked(applyDemoWorkflowProjectState).mockImplementation(async (_id, updates) => { project = { ...project, ...updates } })
})
describe('contractor and auditor workflow', () => {
  it('denies residents and fabricated local accounts', async () => {
    await expect(getWorkspace({ ...contractor, role: 'resident' })).rejects.toThrow('permissions')
    await expect(getWorkspace({ ...contractor, id: 'another-contractor' })).rejects.toThrow('designated demo')
  })
  it('denies unassigned and other-department projects', async () => {
    await expect(submitTask(contractor, { ...input, projectId: 'water-project' })).rejects.toThrow('assignment')
    expect((await getWorkspace({ ...contractor, departmentId: 'dept-water' })).projects).toEqual([])
  })
  it('keeps revocation empty even with legacy shared project ids', async () => {
    const roster = JSON.parse(localStorage.getItem('quicksort_admin_users_v1')!)
    roster[0].assignments = []
    localStorage.setItem('quicksort_admin_users_v1', JSON.stringify(roster))
    expect((await getWorkspace(contractor)).projects).toEqual([])
    expect((await getWorkspace(auditor)).projects).toHaveLength(1)
    await expect(submitTask(contractor, input)).rejects.toThrow('assignment')
  })
  it('rejects a stale role after reassignment', async () => {
    const roster = JSON.parse(localStorage.getItem('quicksort_admin_users_v1')!)
    roster[0].role = 'resident'
    localStorage.setItem('quicksort_admin_users_v1', JSON.stringify(roster))
    expect((await getWorkspace(contractor)).projects).toEqual([])
  })
  it('does not honor an assignment to a different department', async () => {
    project = { ...project, departmentId: 'dept-water' }
    expect((await getWorkspace(contractor)).projects).toEqual([])
  })
  it('requires evidence and reserves completion for auditor approval', async () => {
    await expect(submitTask(contractor, { ...input, evidencePath: undefined })).rejects.toThrow('evidence')
    await submitTask(contractor, input)
    expect(project.status).toBe('pending_audit')
    expect(project.progressPercent).toBe(80)
    const submission = (await getWorkspace(auditor)).submissions[0]
    await expect(reviewTask(contractor, submission.id, 'approved', '')).rejects.toThrow('permissions')
    await reviewTask(auditor, submission.id, 'approved', 'Verified on site')
    expect(project.status).toBe('completed')
    expect(project.progressPercent).toBe(100)
    expect((await getWorkspace(contractor)).reviews[0].reviewedBy).toBe(auditor.id)
    await expect(reviewTask(auditor, submission.id, 'approved', '')).rejects.toThrow('already reviewed')
  })
  it('requires correction comments and allows resubmission after rejection', async () => {
    await submitTask(contractor, input)
    const submission = (await getWorkspace(auditor)).submissions[0]
    await expect(reviewTask(auditor, submission.id, 'changes_requested', '')).rejects.toThrow('Explain')
    await reviewTask(auditor, submission.id, 'changes_requested', 'Upload drainage inspection')
    expect(project.status).toBe('in_progress')
    await submitTask(contractor, input)
    expect((await getWorkspace(contractor)).submissions).toHaveLength(2)
  })
  it('denies self-review even if stored submission has an auditor author', async () => {
    localStorage.setItem('civiclens_workflow_v1', JSON.stringify({ projectIds: ['road-one'], submissions: [{ ...input, id: 'self-submission', submittedBy: auditor.id, status: 'submitted', createdAt: new Date().toISOString() }], reviews: [] }))
    await expect(reviewTask(auditor, 'self-submission', 'approved', '')).rejects.toThrow('own submission')
  })
  it('blocks review after the submitting contractor loses access', async () => {
    await submitTask(contractor, input)
    const submission = (await getWorkspace(auditor)).submissions[0]
    const roster = JSON.parse(localStorage.getItem('quicksort_admin_users_v1')!)
    roster[0].assignments = []
    localStorage.setItem('quicksort_admin_users_v1', JSON.stringify(roster))
    await expect(reviewTask(auditor, submission.id, 'approved', '')).rejects.toThrow('no longer has project access')
    expect(project.status).toBe('pending_audit')
  })
})
