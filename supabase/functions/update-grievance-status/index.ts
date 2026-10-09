import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { id, status, officerResponse } = await req.json()
    if (!id) throw new Error('Grievance ID is required')

    const dbPayload: any = {}
    if (status) dbPayload.status = status
    if (officerResponse) dbPayload.officer_response = officerResponse
    dbPayload.updated_at = new Date().toISOString()

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('grievances')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, grievance: data }), {
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
