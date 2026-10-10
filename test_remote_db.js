import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for an isolated test project.')

const client = createClient(url, key, { auth: { persistSession: false } })
const publicTables = ['departments', 'projects', 'clashes', 'public_grievances']
const privateTables = ['grievances', 'audit_logs', 'notifications']
let failures = 0

for (const table of publicTables) {
  const { error } = await client.from(table).select('*').limit(1)
  if (error) { console.error(`FAIL public read ${table}: ${error.message}`); failures++ }
  else console.log(`PASS public read ${table}`)
}
for (const table of privateTables) {
  const { error } = await client.from(table).select('*').limit(1)
  if (!error) { console.error(`FAIL anonymous access to ${table} was allowed`); failures++ }
  else console.log(`PASS anonymous access denied to ${table}`)
}
if (failures) process.exitCode = 1
