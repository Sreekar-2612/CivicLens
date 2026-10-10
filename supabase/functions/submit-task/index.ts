import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, errorResponse, validEvidencePath } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { db, user } = await requireActor(req, ['contractor'])
    const input = await req.json()
    if (typeof input.projectId !== 'string' || !input.projectId) throw new Error('Project is required')
    if (typeof input.title !== 'string' || input.title.trim().length < 3 || input.title.length > 200) throw new Error('Title must contain 3 to 200 characters')
    if (typeof input.description !== 'string' || input.description.trim().length < 10 || input.description.length > 10000) throw new Error('Description must contain 10 to 10000 characters')
    if (!Number.isInteger(input.progressPercent) || input.progressPercent < 0 || input.progressPercent > 100) throw new Error('Progress must be an integer from 0 to 100')
    if (!['progress', 'milestone', 'completion'].includes(input.submissionType)) throw new Error('Invalid submission type')
    if (input.submissionType === 'completion' && (input.progressPercent !== 100 || !input.evidencePath)) throw new Error('Completion requires 100% progress and evidence')
    if (input.evidencePath && (typeof input.evidencePath !== 'string' || !validEvidencePath(input.evidencePath, user.id, ['projects']))) throw new Error('Evidence must belong to the signed-in contractor')
    const { data, error } = await db.rpc('submit_task', {
      p_actor: user.id, p_project_id: input.projectId, p_title: input.title.trim(),
      p_description: input.description.trim(), p_progress_percent: input.progressPercent,
      p_submission_type: input.submissionType, p_evidence_path: input.evidencePath || null,
    })
    if (error) throw new Error(error.message)
    return Response.json({ success: true, submission: data }, { headers: corsHeaders, status: 201 })
  } catch (err) { return errorResponse(err) }
})
