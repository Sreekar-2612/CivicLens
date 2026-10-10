import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../../types'
vi.mock('../supabaseClient', () => ({ supabase: null }))
vi.mock('../dataRepository', () => ({ dataRepository: {
  getProjects: vi.fn(), getDepartments: vi.fn(), getProject: vi.fn(),
}, applyDemoWorkflowProjectState: vi.fn() }))
import { adminService } from '../adminService'
import { dataRepository } from '../dataRepository'
import { getWorkspace } from '../workflowService'

const contractor = { id: 'usr-demo-contractor', role: 'contractor', departmentId: 'dept-roads', displayName: 'Contractor', isDemoUser: true }
const auditor = { ...contractor, id: 'usr-demo-auditor', role: 'auditor' }
const projects = [{ id: 'road-one', departmentId: 'dept-roads' }, { id: 'road-two', departmentId: 'dept-roads' },
  { id: 'water-one', departmentId: 'dept-water' }] as Project[]
beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) || null, setItem: (key: string, value: string) => store.set(key, value) })
  vi.mocked(dataRepository.getProjects).mockResolvedValue(projects)
  vi.mocked(dataRepository.getProject).mockImplementation(async id => projects.find(p => p.id === id))
  vi.mocked(dataRepository.getDepartments).mockResolvedValue([{ id: 'dept-roads' }, { id: 'dept-water' }] as any)
})
describe('local role assignments', () => {
  it('keeps contractor and auditor assignments independent and preserves revocation', async () => {
    await adminService.updateUserAssignment(contractor.id, 'contractor', 'dept-roads', ['road-one'])
    await adminService.updateUserAssignment(auditor.id, 'auditor', 'dept-roads', ['road-two'])
    expect((await getWorkspace(contractor)).projects.map(p => p.id)).toEqual(['road-one'])
    expect((await getWorkspace(auditor)).projects.map(p => p.id)).toEqual(['road-two'])
    await adminService.updateUserAssignment(contractor.id, 'contractor', 'dept-roads', [])
    expect((await getWorkspace(contractor)).projects).toEqual([])
    expect((await getWorkspace(auditor)).projects.map(p => p.id)).toEqual(['road-two'])
  })
  it('rejects a cross-department batch without overwriting prior assignments', async () => {
    await adminService.updateUserAssignment(contractor.id, 'contractor', 'dept-roads', ['road-one'])
    await expect(adminService.updateUserAssignment(contractor.id, 'contractor', 'dept-roads', ['road-two', 'water-one'])).rejects.toThrow('selected department')
    expect((await getWorkspace(contractor)).projects.map(p => p.id)).toEqual(['road-one'])
  })
  it('rejects a missing department and unknown user', async () => {
    await expect(adminService.updateUserAssignment(contractor.id, 'contractor', undefined, [])).rejects.toThrow('department is required')
    await expect(adminService.updateUserAssignment('unknown', 'resident')).rejects.toThrow('profile not found')
  })
})
