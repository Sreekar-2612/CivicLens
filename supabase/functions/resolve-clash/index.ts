import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, requireDepartment, errorResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { db: supabase, profile } = await requireActor(req, ['department_officer', 'admin'])
    const { id, status, decisionNotes, jointInspectionDate } = await req.json()
    if (!id) throw new Error('Clash ID is required')
    const { data: clash, error: clashError } = await supabase.from('clashes').select('department_a_id, department_b_id').eq('id', id).single()
    if (clashError || !clash) throw new Error('Clash not found')
    if (profile.role !== 'admin' && profile.department_id !== clash.department_a_id && profile.department_id !== clash.department_b_id) {
      requireDepartment(profile, clash.department_a_id)
    }

    const dbPayload: any = {}
    if (status) dbPayload.status = status
    if (decisionNotes) dbPayload.decision_notes = decisionNotes
    if (jointInspectionDate) dbPayload.joint_inspection_date = jointInspectionDate

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
    return errorResponse(err)
  }
})

