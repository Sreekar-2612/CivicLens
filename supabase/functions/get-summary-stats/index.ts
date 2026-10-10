import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const corsRes = handleCors(req)
  if (corsRes) return corsRes

  try {
    const supabase = getSupabaseClient(req)

    const [projectsRes, deptsRes, clashesRes, grievancesRes] = await Promise.all([
      supabase.from('projects').select('status, confidence_indicator').eq('publication_status', 'published'),
      supabase.from('departments').select('id'),
      supabase.from('clashes').select('id, status').eq('status', 'pending_review'),
      supabase.from('public_grievances').select('id, status').in('status', ['submitted', 'acknowledged', 'in_review', 'escalated']),
    ])
    for (const result of [projectsRes, deptsRes, clashesRes, grievancesRes]) {
      if (result.error) throw result.error
    }

    const projects = projectsRes.data || []
    const stats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'in_progress' || p.status === 'planned').length,
      delayedProjects: projects.filter(p => p.status === 'delayed' || p.confidence_indicator === 'delayed').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      potentialConflicts: (clashesRes.data || []).length,
      pendingReports: (grievancesRes.data || []).length,
      departmentCount: (deptsRes.data || []).length,
    }

    return new Response(JSON.stringify({ success: true, stats }), {
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
