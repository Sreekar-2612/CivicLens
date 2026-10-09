import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xrpqgszwigdrcwbkpdtt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycHFnc3p3aWdkcmN3YmtwZHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NzAxOTIsImV4cCI6MjEwNzE0NjE5Mn0.ahFaf2jxd1j3FfXT-EaFM-ausFHJVaETtHW3NN39Aa8'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAllTables() {
  const tables = [
    'departments',
    'projects',
    'project_updates',
    'profiles',
    'contractors',
    'clashes',
    'grievances',
    'contractor_evaluations',
    'audit_logs'
  ]

  console.log('--- Testing REST API for all 9 tables ---')
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(5)
    if (error) {
      console.log(`❌ ${t}: ${error.message}`)
    } else {
      console.log(`✅ ${t}: ${data.length} records retrieved.`)
    }
  }
}

testAllTables()
