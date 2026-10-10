import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
const auth = vi.hoisted(() => ({ user: null as any, loading: false, signInWithGoogle: vi.fn() }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('../adminService', () => ({ adminService: { getRosterData: vi.fn(), updateUserAssignment: vi.fn() } }))
vi.mock('../supabaseClient', () => ({ checkSupabaseConnection: vi.fn() }))
vi.mock('../dataRepository', () => ({ dataRepository: { getSummaryStats: vi.fn() } }))
import { AdminPage } from '../../pages/AdminPage'

describe('administrator page access', () => {
  it.each([null, 'resident', 'officer', 'contractor', 'auditor'])('blocks the assignment screen for %s', role => {
    auth.user = role ? { id: 'demo', role, isDemoUser: true } : null
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={['/admin/assign']}><AdminPage /></MemoryRouter>)
    expect(markup).toContain('Administrator access required')
    expect(markup).not.toContain('Save Role &amp; Project Assignment')
    expect(markup).not.toContain('Personnel &amp; Roles')
  })
  it('allows an administrator to open their workspace', () => {
    auth.user = { id: 'admin', role: 'admin', isDemoUser: false }
    const markup = renderToStaticMarkup(<MemoryRouter><AdminPage /></MemoryRouter>)
    expect(markup).toContain('Administrator Workspace')
    expect(markup).not.toContain('Administrator access required')
  })
})
