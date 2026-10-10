import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.hoisted(() => vi.fn())
const query = vi.hoisted(() => vi.fn())

vi.mock('../supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    functions: { invoke },
    from: query,
  },
}))

import { dataRepository } from '../dataRepository'
import { SupabaseDataRepository } from '../supabaseRepository'

describe('configured Supabase data routes', () => {
  beforeEach(() => {
    invoke.mockReset()
    query.mockReset()
  })

  it('returns live empty report and alert lists, never sample records', async () => {
    invoke.mockImplementation(async (name: string) => ({
      data: name === 'get-grievances'
        ? { success: true, grievances: [] }
        : { success: true, clashes: [] },
      error: null,
    }))
    expect(await dataRepository.getReports()).toEqual([])
    expect(await dataRepository.getAlerts()).toEqual([])
    expect(invoke).toHaveBeenCalledWith('get-grievances')
    expect(invoke).toHaveBeenCalledWith('get-clashes')
  })

  it('surfaces a failed grievance submission', async () => {
    invoke.mockResolvedValue({ data: { success: false, error: 'Denied' }, error: null })
    await expect(dataRepository.addReport({ title: 'A report' })).rejects.toThrow('Denied')
  })

  it('does not retry a rejected project update as a direct database write', async () => {
    invoke.mockResolvedValue({ data: { success: false, error: 'Access denied' }, error: null })
    const repo = new SupabaseDataRepository()
    repo.getProject = vi.fn().mockResolvedValue({
      id: 'proj-a', progressPercent: 0, status: 'planned',
      originalEndDate: '2026-12-31',
    })
    await expect(repo.updateProject('proj-a', { status: 'in_progress' })).rejects.toThrow('Access denied')
    expect(query).not.toHaveBeenCalled()
  })

  it('loads milestones for the requested project from the database', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: '1', project_id: 'proj-a', title: 'Dig', target_date: '2026-10-01', status: 'pending' }],
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    query.mockReturnValue({ select })

    expect(await new SupabaseDataRepository().getMilestones('proj-a')).toEqual([{
      id: '1', projectId: 'proj-a', title: 'Dig', description: undefined,
      targetDate: '2026-10-01', completedDate: undefined, status: 'pending',
    }])
    expect(query).toHaveBeenCalledWith('milestones')
    expect(eq).toHaveBeenCalledWith('project_id', 'proj-a')
  })
})
