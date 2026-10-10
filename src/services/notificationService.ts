import { dataRepository } from './dataRepository'
import { supabase } from './supabaseClient'
import type { AuthUser } from '../context/AuthContext'

export interface AppNotification {
  id: string
  kind: 'clash' | 'grievance'
  entityId: string
  title: string
  body: string
  createdAt: string
  readAt?: string
}

const DEMO_READ_KEY = 'civiclens_read_notifications'

function demoReadTimes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(DEMO_READ_KEY) || '{}') }
  catch { return {} }
}

export class NotificationService {
  static async getInbox(user: AuthUser | null): Promise<AppNotification[]> {
    if (!user || !['officer', 'admin'].includes(user.role)) return []
    if (supabase) {
      if (user.isDemoUser) throw new Error('Sign in with an authorized officer account to view live notifications.')
      const { data, error } = await supabase.from('notifications')
        .select('id, kind, entity_id, title, body, created_at, read_at')
        .order('created_at', { ascending: false }).limit(100)
      if (error) throw new Error(`Could not load notifications: ${error.message}`)
      return (data || []).map(row => ({
        id: row.id, kind: row.kind, entityId: row.entity_id,
        title: row.title, body: row.body, createdAt: row.created_at,
        readAt: row.read_at || undefined,
      }))
    }

    const [alerts, reports, projects] = await Promise.all([
      dataRepository.getAlerts(), dataRepository.getReports(), dataRepository.getProjects(),
    ])
    const projectDepartments = new Map(projects.map(project => [project.id, project.departmentId]))
    const canSeeProject = (id?: string) => user.role === 'admin' ||
      Boolean(id && projectDepartments.get(id) === user.departmentId)
    const readTimes = demoReadTimes()
    const clashNotifications: AppNotification[] = alerts
      .filter(alert => alert.status === 'pending_review' && ['high', 'critical'].includes(alert.severity) &&
        (canSeeProject(alert.projectAId) || canSeeProject(alert.projectBId)))
      .map(alert => ({
        id: `demo-clash-${alert.id}`, kind: 'clash', entityId: alert.id,
        title: `Coordination alert (${alert.severity})`,
        body: alert.reasons[0]?.description || 'Two work orders need schedule review.',
        createdAt: alert.createdAt, readAt: readTimes[`demo-clash-${alert.id}`],
      }))
    const grievanceNotifications: AppNotification[] = reports
      .filter(report => ['submitted', 'acknowledged', 'in_review', 'escalated'].includes(report.status) &&
        (report.projectId ? canSeeProject(report.projectId) : user.role === 'admin'))
      .map(report => ({
        id: `demo-grievance-${report.id}`, kind: 'grievance', entityId: report.id,
        title: `New grievance ${report.referenceId}`,
        body: 'A resident report needs review.',
        createdAt: report.createdAt, readAt: readTimes[`demo-grievance-${report.id}`],
      }))
    return [...clashNotifications, ...grievanceNotifications]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  static async markRead(id: string): Promise<void> {
    const readAt = new Date().toISOString()
    if (supabase) {
      const { data, error } = await supabase.from('notifications')
        .update({ read_at: readAt }).eq('id', id).select('id').single()
      if (error) throw new Error(`Could not mark notification read: ${error.message}`)
      if (!data) throw new Error('Notification was not found or is not assigned to this account.')
      return
    }
    localStorage.setItem(DEMO_READ_KEY, JSON.stringify({ ...demoReadTimes(), [id]: readAt }))
  }
}
