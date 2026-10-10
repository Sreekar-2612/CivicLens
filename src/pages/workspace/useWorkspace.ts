import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getWorkspace } from '../../services/workflowService'

export function useWorkspace() {
  const { user } = useAuth()
  const [data, setData] = useState<Awaited<ReturnType<typeof getWorkspace>>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const identity = `${user?.id}:${user?.role}:${user?.departmentId}`
  const activeIdentity = useRef(identity)
  activeIdentity.current = identity
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    const handleUpdate = () => {
      setRevision(v => v + 1)
    }
    window.addEventListener('civic-data-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      mounted.current = false
      window.removeEventListener('civic-data-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])
  useEffect(() => {
    let active = true
    setData(undefined); setError(''); setLoading(true)
    if (!user) { setLoading(false); return }
    getWorkspace(user).then(result => { if (active) setData(result) })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load workspace.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [identity, revision])
  return { user, data, loading, error, refresh: () => setRevision(value => value + 1), isCurrent: () => mounted.current && activeIdentity.current === identity }
}
