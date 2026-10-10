import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, requireDepartment, errorResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const { db: supabase, user, profile } = await requireActor(req, ['department_officer', 'admin'])
    const data = await req.json()
    if (data.status === 'completed' || data.status === 'pending_audit' || data.progressPercent === 100) {
      throw new Error('Completion must be submitted by an assigned contractor and approved by an auditor')
    }

    // Validation rules
    if (!data.title || data.title.trim().length < 3) throw new Error('Title must be at least 3 characters')
    if (!data.departmentId) throw new Error('Department ID is required')
    requireDepartment(profile, data.departmentId)
    if (!data.contractor || !data.contractor.trim()) throw new Error('Contractor name is required')
    if (!data.road || !data.road.trim()) throw new Error('Road name is required')
    if (!data.startDate) throw new Error('Start date is required')
    if (!data.originalEndDate) throw new Error('Original end date is required')
    if (new Date(data.originalEndDate) < new Date(data.startDate)) {
      throw new Error('Original deadline cannot be before start date')
    }

    const id = `proj-${Date.now().toString().slice(-6)}`
    const dbPayload = {
      id,
      title: data.title.trim(),
      purpose: data.purpose?.trim() || 'Municipal capital works',
      department_id: data.departmentId,
      contractor_name: data.contractor.trim(),
      category: data.category || 'road_construction',
      road_name: data.road.trim(),
      locality: data.locality?.trim() || 'Central Zone',
      ward: data.ward || 'Ward 1',
      latitude: data.location?.lat || 18.5204,
      longitude: data.location?.lng || 73.8567,
      budget: data.budgetLakhs || 0,
      status: data.status || 'planned',
      publication_status: 'published',
      start_date: data.startDate,
      original_end_date: data.originalEndDate,
      revised_end_date: null,
      progress_percent: data.progressPercent || 0,
      confidence_indicator: data.confidenceIndicator || 'on_track',
      created_by: user.id,
    }

    const { data: inserted, error } = await supabase
      .from('projects')
      .insert(dbPayload)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, project: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (err) {
    return errorResponse(err)
  }
})

