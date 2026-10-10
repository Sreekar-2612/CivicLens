import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { NotificationService, type AppNotification } from '../../services/notificationService'

export function OfficerNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loadedFor, setLoadedFor] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const identityKey = `${user?.id || 'none'}:${user?.role || 'none'}:${user?.departmentId || 'none'}`
  const loading = refreshing || loadedFor !== identityKey

  const load = async () => {
    setRefreshing(true)
    setError('')
    try {
      setNotifications(await NotificationService.getInbox(user))
      setLoadedFor(identityKey)
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load notifications.') }
    finally { setRefreshing(false) }
  }

  useEffect(() => {
    let active = true
    NotificationService.getInbox(user)
      .then(items => {
        if (active) { setNotifications(items); setError(''); setLoadedFor(identityKey) }
      })
      .catch(cause => {
        if (active) {
          setNotifications([])
          setError(cause instanceof Error ? cause.message : 'Could not load notifications.')
          setLoadedFor(identityKey)
        }
      })
    return () => { active = false }
  }, [user, identityKey])

  const markRead = async (notification: AppNotification) => {
    try {
      await NotificationService.markRead(notification.id)
      setNotifications(current => current.map(item => item.id === notification.id
        ? { ...item, readAt: new Date().toISOString() } : item))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not mark notification read.')
    }
  }

  if (!user || !['officer', 'admin'].includes(user.role)) {
    return <p className="rounded-xl border bg-white p-6 text-sm">Officer access is required to view notifications.</p>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Bell className="h-6 w-6" /> Notifications</h1>
          <p className="mt-1 text-sm text-slate-600">New coordination alerts and resident reports assigned to your department.</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold" aria-label="Refresh notifications">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? <p className="text-sm text-slate-600">Loading notifications...</p> : notifications.length === 0 ? (
        <p className="rounded-xl border bg-white p-6 text-sm text-slate-600">No notifications yet.</p>
      ) : <ul className="space-y-3">
        {notifications.map(notification => (
          <li key={notification.id} className={`rounded-xl border p-4 ${notification.readAt ? 'bg-white' : 'border-[#e2c09c] bg-[#e2c09c]/15'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{notification.title}</p>
                <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</p>
              </div>
              {!notification.readAt && <button type="button" onClick={() => void markRead(notification)} className="flex shrink-0 items-center gap-1 rounded-lg border bg-white px-2 py-1 text-xs font-semibold">
                <Check className="h-3 w-3" /> Mark read
              </button>}
            </div>
            <Link to={notification.kind === 'clash' ? '/officer/coordination' : '/officer/reports'} className="mt-3 inline-block text-sm font-semibold text-[#021217] hover:text-[#088c2e]">
              Open {notification.kind === 'clash' ? 'coordination' : 'grievance inbox'}
            </Link>
          </li>
        ))}
      </ul>}
    </div>
  )
}
