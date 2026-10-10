import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, getSupabaseClient, errorResponse } from '../_shared/supabase.ts'
Deno.serve(async req => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    await requireActor(req, ['auditor'])
    const { projectId, contractorId, reportId } = await req.json()
    if (!projectId || !contractorId) throw new Error('Project and contractor are required')
    const { error } = await getSupabaseClient(req).rpc('auditor_assign_contractor', { p_project_id: projectId, p_contractor_id: contractorId, p_grievance_id: reportId || null })
    if (error) throw error
    return Response.json({ success: true }, { headers: corsHeaders })
  } catch (error) { return errorResponse(error) }
})
