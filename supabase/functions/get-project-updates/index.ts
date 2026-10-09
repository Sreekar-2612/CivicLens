import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    let projectId = ''
    if (req.method === 'POST') {
      const body = await req.json()
      projectId = body.projectId
    } else {
      const url = new URL(req.url)
      projectId = url.searchParams.get('projectId') || ''
    }

    if (!projectId) throw new Error('projectId is required')

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return new Response(JSON.stringify({ success: true, updates: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
