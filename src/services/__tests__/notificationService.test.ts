import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dataRepository } from '../dataRepository'
import { NotificationService } from '../notificationService'
import type { AuthUser } from '../../context/AuthContext'
import type { CoordinationAlert, Project, Report } from '../../types'

vi.mock('../supabaseClient', () => ({ supabase: null }))
vi.mock('../dataRepository', () => ({ dataRepository: {
  getAlerts: vi.fn(), getReports: vi.fn(), getProjects: vi.fn(),
} }))

const officer: AuthUser = {
  id: 'officer', displayName: 'Roads Officer', role: 'officer',
  departmentId: 'roads', isDemoUser: true,
}

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
  })
  vi.mocked(dataRepository.getProjects).mockResolvedValue([
    { id: 'road-project', departmentId: 'roads' },
    { id: 'water-project', departmentId: 'water' },
  ] as Project[])
  vi.mocked(dataRepository.getAlerts).mockResolvedValue([{
    id: 'clash-one', projectAId: 'road-project', projectBId: 'water-project',
    status: 'pending_review', severity: 'high', score: 80, reasons: [],
    createdAt: '2026-10-10T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z',
  }] as CoordinationAlert[])
  vi.mocked(dataRepository.getReports).mockResolvedValue([{
    id: 'report-one', referenceId: 'GRV-1', projectId: 'water-project',
    status: 'submitted', createdAt: '2026-10-10T00:00:00Z',
  }] as Report[])
})

describe('demo notification inbox', () => {
  it('shows only alerts assigned to the officer department and persists read state', async () => {
    const inbox = await NotificationService.getInbox(officer)
    expect(inbox.map(item => item.kind)).toEqual(['clash'])
    await NotificationService.markRead(inbox[0].id)
    expect((await NotificationService.getInbox(officer))[0].readAt).toBeTruthy()
  })

  it('shows cross-department reports to an admin', async () => {
    const inbox = await NotificationService.getInbox({ ...officer, role: 'admin', departmentId: undefined })
    expect(inbox.map(item => item.kind).sort()).toEqual(['clash', 'grievance'])
  })
})
