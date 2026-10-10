import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, requireDepartment, errorResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { db: supabase, user, profile } = await requireActor(req, ['department_officer', 'admin'])
    const { id, updates, delayReason } = await req.json()
    if (!id) throw new Error('Project ID is required')

    const { data: current, error: fetchErr } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr || !current) throw new Error(`Project ${id} not found`)
    requireDepartment(profile, current.department_id)

    // Enforce original_end_date immutability check
    if (updates.originalEndDate && updates.originalEndDate !== current.original_end_date) {
      throw new Error('original_end_date is immutable once created. Provide revised_end_date instead.')
    }

    let hasDeadlineChange = false
    if (updates.revisedEndDate && updates.revisedEndDate !== (current.revised_end_date || current.original_end_date)) {
      hasDeadlineChange = true
      if (!delayReason || delayReason.trim().length < 5) {
        throw new Error('A detailed delay reason (at least 5 characters) is mandatory when extending a project deadline.')
      }
    }

    const dbPayload: any = {}
    if (updates.status !== undefined) dbPayload.status = updates.status
    if (updates.progressPercent !== undefined) dbPayload.progress_percent = updates.progressPercent
    if (updates.confidenceIndicator !== undefined) dbPayload.confidence_indicator = updates.confidenceIndicator
    if (updates.contractor !== undefined) dbPayload.contractor_name = updates.contractor
    if (updates.budgetLakhs !== undefined) dbPayload.budget = updates.budgetLakhs
    dbPayload.last_updated_by = user.id
    if (hasDeadlineChange) {
      dbPayload.revised_end_date = updates.revisedEndDate
      dbPayload.latest_delay_reason = delayReason.trim()
    }

    const { data: updated, error: updateErr } = await supabase
      .from('projects')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return new Response(JSON.stringify({ success: true, project: updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return errorResponse(err)
  }
})

