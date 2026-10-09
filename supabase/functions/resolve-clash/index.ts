import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { id, status, decisionNotes, jointInspectionDate } = await req.json()
    if (!id) throw new Error('Clash ID is required')

    const dbPayload: any = {}
    if (status) dbPayload.status = status
    if (decisionNotes) dbPayload.decision_notes = decisionNotes
    if (jointInspectionDate) dbPayload.joint_inspection_date = jointInspectionDate

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('clashes')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, clash: data }), {
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
