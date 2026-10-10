import { useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

export function useRealtimeSubscriptions(
  onTableChange: (tableName: 'projects' | 'clashes' | 'grievances' | 'project_updates' | 'project_assignments' | 'task_submissions' | 'task_reviews', payload: any) => void
) {
  useEffect(() => {
    if (!supabase) return

    const client = supabase

    const channel = client
      .channel('quicksort-realtime-changes')
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_assignments' }, (payload) => {
        console.log('⚡ Realtime assignment update:', payload)
        onTableChange('project_assignments', payload)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_submissions' }, (payload) => {
        console.log('⚡ Realtime submission update:', payload)
        onTableChange('task_submissions', payload)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_reviews' }, (payload) => {
        console.log('⚡ Realtime review update:', payload)
        onTableChange('task_reviews', payload)
      })
      .subscribe((status) => {
        console.log('⚡ Supabase Realtime Channel Status:', status)
      })

    return () => {
      client.removeChannel(channel)
    }
  }, [onTableChange])
}
