import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, requireDepartment, errorResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { db: supabase, profile } = await requireActor(req, ['department_officer', 'admin'])
    const { id, status, officerResponse } = await req.json()
    if (!id) throw new Error('Grievance ID is required')
    const { data: grievance, error: grievanceError } = await supabase.from('grievances')
      .select('project_id').eq('id', id).single()
    if (grievanceError || !grievance) throw new Error('Grievance not found')
    if (profile.role !== 'admin') {
      if (!grievance.project_id) throw new Error('Only admins can review unlinked reports')
      const { data: project, error: projectError } = await supabase.from('projects')
        .select('department_id').eq('id', grievance.project_id).single()
      if (projectError || !project) throw new Error('Project not found')
      requireDepartment(profile, project.department_id)
    }

    const dbPayload: any = {}
    if (status) dbPayload.status = status
    if (officerResponse) dbPayload.officer_response = officerResponse
    dbPayload.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('grievances')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, grievance: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return errorResponse(err)
  }
})

