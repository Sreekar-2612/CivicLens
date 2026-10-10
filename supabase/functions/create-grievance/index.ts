import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, errorResponse, validEvidencePath } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { db: supabase, user } = await requireActor(req)
    const data = await req.json()
    if (!data.title || data.title.trim().length < 5) throw new Error('Title must be at least 5 characters')
    if (!data.description || data.description.trim().length < 10) throw new Error('Description must be at least 10 characters')
    if (!data.road || !data.road.trim()) throw new Error('Road name is required')
    if (data.evidenceUrl && !(
      typeof data.evidenceUrl === 'string' && (
        validEvidencePath(data.evidenceUrl, user.id, ['grievances']) ||
        /^https:\/\/images\.unsplash\.com\//.test(data.evidenceUrl)
      )
    )) throw new Error('Evidence must belong to the signed-in reporter')

    const referenceId = `GRV-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const dbPayload = {
      reference_id: referenceId,
      project_id: data.projectId || null,
      category: data.category || 'other',
      title: data.title.trim(),
      description: data.description.trim(),
      road_name: data.road.trim(),
      locality: data.locality?.trim() || 'Central Zone',
      ward: data.ward || 'Ward 1',
      reporter_name: data.reporterName || 'Anonymous Resident',
      reporter_contact: data.reporterContact || null,
      evidence_url: data.evidenceUrl || null,
      status: 'submitted',
      owner_id: user.id,
    }

    const { data: inserted, error } = await supabase
      .from('grievances')
      .insert(dbPayload)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, grievance: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (err) {
    return errorResponse(err)
  }
})
