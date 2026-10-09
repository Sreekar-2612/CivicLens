import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { projectId, update } = await req.json()
    if (!projectId) throw new Error('projectId is required')
    if (!update) throw new Error('update payload is required')

    const dbPayload = {
      project_id: projectId,
      update_type: update.type || 'progress',
      progress_percent: update.newValue ? parseInt(update.newValue) : undefined,
      notes: update.description || update.title || 'Progress Update',
      delay_reason_description: update.delayReason,
      previous_end_date: update.previousValue,
      revised_end_date: update.newValue,
      evidence_path: update.evidenceUrl,
      created_by_name: update.authorName || 'Field Engineer',
    }

    const supabase = getSupabaseClient()
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
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
