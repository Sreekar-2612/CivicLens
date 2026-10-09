import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const data = await req.json()
    if (!data.title || data.title.trim().length < 5) throw new Error('Title must be at least 5 characters')
    if (!data.description || data.description.trim().length < 10) throw new Error('Description must be at least 10 characters')
    if (!data.road || !data.road.trim()) throw new Error('Road name is required')

    const referenceId = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`
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
    }

    const supabase = getSupabaseClient()
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
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
