import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, errorResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { db, user } = await requireActor(req, ['auditor'])
    const { submissionId, decision, comments = '' } = await req.json()
    if (typeof submissionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(submissionId)) throw new Error('Valid submission ID is required')
    if (!['approved', 'changes_requested'].includes(decision)) throw new Error('Invalid review decision')
    if (typeof comments !== 'string' || comments.length > 5000) throw new Error('Comments must contain at most 5000 characters')
    if (decision === 'changes_requested' && comments.trim().length < 5) throw new Error('Explain the changes required (at least 5 characters)')
    const { data, error } = await db.rpc('review_task', { p_actor: user.id, p_submission_id: submissionId, p_decision: decision, p_comments: comments.trim() })
    if (error) throw new Error(error.message)
    return Response.json({ success: true, review: data }, { headers: corsHeaders })
  } catch (err) { return errorResponse(err) }
})
