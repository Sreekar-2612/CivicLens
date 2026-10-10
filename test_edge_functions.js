const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for an isolated test project.')

const functions = ['get-departments', 'get-projects', 'get-summary-stats', 'get-clashes', 'get-grievances']
let failures = 0
for (const name of functions) {
  try {
    const response = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const result = await response.json()
    if (!response.ok || !result.success) throw new Error(result.error || `HTTP ${response.status}`)
    console.log(`PASS ${name}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`)
    failures++
  }
}
if (failures) process.exitCode = 1
