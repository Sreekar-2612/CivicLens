import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getAnonymousClient, requireActor, hasUserToken, errorResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    let actor: Awaited<ReturnType<typeof requireActor>> | null = null
    if (hasUserToken(req)) actor = await requireActor(req)
    const supabase = actor?.db || getAnonymousClient()
    const staffFields = 'id,reference_id,project_id,category,title,description,road_name,locality,ward,latitude,longitude,evidence_url,status,officer_response,created_at,updated_at'
    let query = actor
      ? supabase.from('grievances').select(['contractor', 'auditor'].includes(actor.profile.role) ? staffFields : '*')
      : supabase.from('public_grievances').select('*')
    if (actor?.profile.role === 'department_officer') {
      const { data: projects, error: projectError } = await supabase.from('projects')
        .select('id').eq('department_id', actor.profile.department_id)
      if (projectError) throw projectError
      const ids = (projects || []).map(p => p.id)
      query = query.in('project_id', ids.length ? ids : ['__none__'])
    } else if (actor && ['contractor', 'auditor'].includes(actor.profile.role)) {
      const { data: assignments, error } = await supabase.from('project_assignments').select('project_id').eq('user_id', actor.user.id).eq('assignment_role', actor.profile.role)
      if (error) throw error
      const ids = (assignments || []).map(a => a.project_id)
      const { data: projects, error: projectError } = await supabase.from('projects').select('id').in('id', ids.length ? ids : ['__none__']).eq('department_id', actor.profile.department_id)
      if (projectError) throw projectError
      query = query.in('project_id', projects?.length ? projects.map(p => p.id) : ['__none__'])
    } else if (actor?.profile.role !== 'admin' && actor) {
      query = query.eq('owner_id', actor.user.id)
    }
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    if (actor?.profile.role === 'resident') {
      const { data: publicRows, error: publicError } = await getAnonymousClient()
        .from('public_grievances').select('*').order('created_at', { ascending: false })
      if (publicError) throw publicError
      const ownIds = new Set((data || []).map(row => row.id))
      return new Response(JSON.stringify({ success: true, grievances: [...(data || []), ...(publicRows || []).filter(row => !ownIds.has(row.id))] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }
    return new Response(JSON.stringify({ success: true, grievances: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
