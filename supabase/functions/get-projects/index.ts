import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    let body: any = {}
    if (req.method === 'POST') {
      try {
        body = await req.json()
      } catch {
        body = {}
      }
    }

    const supabase = getSupabaseClient()
    let query = supabase
      .from('projects')
      .select('*')
      .eq('publication_status', 'published')
      .order('created_at', { ascending: false })

    if (body.status && body.status !== 'all') {
      query = query.eq('status', body.status)
    }
    if (body.departmentId && body.departmentId !== 'all') {
      query = query.eq('department_id', body.departmentId)
    }
    if (body.category && body.category !== 'all') {
      query = query.eq('category', body.category)
    }
    if (body.ward && body.ward !== 'all') {
      query = query.eq('ward', body.ward)
    }

    const { data, error } = await query
    if (error) throw error

    let projects = data || []
    if (body.search) {
      const s = body.search.toLowerCase()
      projects = projects.filter((p: any) =>
        p.title.toLowerCase().includes(s) ||
        p.road_name.toLowerCase().includes(s) ||
        p.contractor_name.toLowerCase().includes(s) ||
        p.locality.toLowerCase().includes(s)
      )
    }

    return new Response(JSON.stringify({ success: true, projects }), {
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
