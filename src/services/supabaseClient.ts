import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://xrpqgszwigdrcwbkpdtt.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycHFnc3p3aWdkcmN3YmtwZHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NzAxOTIsImV4cCI6MjEwNzE0NjE5Mn0.ahFaf2jxd1j3FfXT-EaFM-ausFHJVaETtHW3NN39Aa8'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_SUPABASE_ANON_KEY

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id')
  )
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export async function checkSupabaseConnection(): Promise<{
  configured: boolean
  connected: boolean
  errorMessage?: string
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      configured: false,
      connected: false,
      errorMessage: 'Supabase credentials not configured in environment (.env.local). Operating in local seed-data fallback mode.',
    }
  }

  try {
    const { data, error } = await supabase.from('departments').select('id').limit(1)
    if (error) {
      return {
        configured: true,
        connected: false,
        errorMessage: error.message,
      }
    }
    return {
      configured: true,
      connected: true,
    }
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      errorMessage: err?.message || 'Failed to reach Supabase endpoint',
    }
  }
}
