import { useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export function useRealtimeSubscriptions(
  onTableChange: (tableName: 'projects' | 'clashes' | 'grievances' | 'project_updates', payload: any) => void
) {
  useEffect(() => {
    if (!supabase) return

    const client = supabase

    const channel = client
      .channel('spadework-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, (payload) => {
        console.log('⚡ Realtime project update:', payload)
        onTableChange('projects', payload)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clashes' }, (payload) => {
        console.log('⚡ Realtime clash update:', payload)
        onTableChange('clashes', payload)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grievances' }, (payload) => {
        console.log('⚡ Realtime grievance update:', payload)
        onTableChange('grievances', payload)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_updates' }, (payload) => {
        console.log('⚡ Realtime audit log update:', payload)
        onTableChange('project_updates', payload)
      })
      .subscribe((status) => {
        console.log('⚡ Supabase Realtime Channel Status:', status)
      })

    return () => {
      client.removeChannel(channel)
    }
  }, [onTableChange])
}
