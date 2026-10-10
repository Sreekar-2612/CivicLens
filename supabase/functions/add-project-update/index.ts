import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, requireDepartment, errorResponse, validEvidencePath } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { db: supabase, user, profile } = await requireActor(req, ['department_officer', 'admin'])
    const { projectId, update } = await req.json()
    if (!projectId) throw new Error('projectId is required')
    if (!update) throw new Error('update payload is required')
    if (update.type === 'completion' || update.type === 'status_change' || Number(update.newValue) >= 100) {
      throw new Error('Completion and approval must use the audited task workflow')
    }
    const { data: project, error: projectError } = await supabase.from('projects').select('department_id').eq('id', projectId).single()
    if (projectError || !project) throw new Error('Project not found')
    requireDepartment(profile, project.department_id)
    if (update.evidenceUrl && (
      typeof update.evidenceUrl !== 'string' ||
      !validEvidencePath(update.evidenceUrl, user.id, ['projects', 'inspections'])
    )) throw new Error('Evidence must belong to the signed-in officer')

    const dbPayload = {
      project_id: projectId,
      update_type: update.type || 'progress',
      progress_percent: update.type === 'progress' && update.newValue ? parseInt(update.newValue, 10) : undefined,
      notes: update.description || update.title || 'Progress Update',
      delay_reason_description: update.delayReason,
      previous_end_date: update.type === 'deadline_revision' ? update.previousValue : undefined,
      revised_end_date: update.type === 'deadline_revision' ? update.newValue : undefined,
      evidence_path: update.evidenceUrl,
      created_by: user.id,
      created_by_name: profile.display_name,
    }

    const { data, error } = await supabase
      .from('project_updates')
      .insert(dbPayload)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, update: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (err) {
    return errorResponse(err)
  }
})

