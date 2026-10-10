import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireActor, errorResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  try {
    const { db, user, profile } = await requireActor(req, ['contractor', 'auditor'])
    const { data: assignments, error } = await db.from('project_assignments').select('*')
      .eq('user_id', user.id).eq('assignment_role', profile.role)
    if (error) throw error
    if (!profile.department_id) return Response.json({ success: true, projects: [], assignments: [], submissions: [], reviews: [] }, { headers: corsHeaders })
    const ids = (assignments || []).map(a => a.project_id)
    if (!ids.length) return Response.json({ success: true, projects: [], assignments: [], submissions: [], reviews: [] }, { headers: corsHeaders })
    const { data: projects, error: projectError } = await db.from('projects').select('*')
      .in('id', ids).eq('department_id', profile.department_id)
    if (projectError) throw projectError
    const allowedIds = (projects || []).map(p => p.id)
    let submissions: any[] = []
    let reviews: any[] = []
    if (allowedIds.length) {
      let query = db.from('task_submissions').select('*').in('project_id', allowedIds).order('created_at', { ascending: false })
      if (profile.role === 'contractor') query = query.eq('submitted_by', user.id)
      const { data, error: submissionError } = await query
      if (submissionError) throw submissionError
      submissions = data || []
      if (submissions.length) {
        const { data, error: reviewError } = await db.from('task_reviews').select('*').in('submission_id', submissions.map(s => s.id)).order('created_at', { ascending: false })
        if (reviewError) throw reviewError
        reviews = data || []
      }
    }
    const { data: reports, error: reportError } = await db.from('grievances')
      .select('id,reference_id,project_id,category,title,description,road_name,locality,ward,latitude,longitude,evidence_url,status,officer_response,created_at,updated_at')
      .in('project_id', allowedIds.length ? allowedIds : ['__none__']).order('created_at', { ascending: false })
    if (reportError) throw reportError
    let unlinkedReports: any[] = []
    let contractors: any[] = []
    if (profile.role === 'auditor') {
      const { data: unlinked, error: unlinkedError } = await db.from('public_grievances').select('*').is('project_id', null).neq('status', 'resolved')
      if (unlinkedError) throw unlinkedError
      unlinkedReports = unlinked || []
      const { data: roster, error: rosterError } = await db.from('profiles').select('id,display_name,department_id').eq('role', 'contractor').eq('department_id', profile.department_id)
      if (rosterError) throw rosterError
      contractors = roster || []
    }
    return Response.json({ success: true, projects, assignments: (assignments || []).filter(a => allowedIds.includes(a.project_id)), submissions, reviews, reports: [...(reports || []), ...unlinkedReports], contractors }, { headers: corsHeaders })
  } catch (err) { return errorResponse(err) }
})
