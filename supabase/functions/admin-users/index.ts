import { corsHeaders } from '../_shared/cors.ts'
import { requireActor, errorResponse } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { db, user, profile } = await requireActor(req, ['admin'])

    if (req.method === 'GET') {
      const { data: roster, error: rosterErr } = await db.rpc('admin_get_user_roster')
      if (rosterErr) throw rosterErr

      const { data: departments } = await db.from('departments').select('*').order('name')
      const { data: projects } = await db.from('projects').select('id, title, road, locality, department_id, status, progress_percent').order('title')

      return new Response(JSON.stringify({
        success: true,
        roster: roster || [],
        departments: departments || [],
        projects: projects || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { targetUserId, newRole, newDepartmentId, projectIds } = body

      if (!targetUserId) throw new Error('targetUserId is required')
      if (!newRole) throw new Error('newRole is required')

      const { data: result, error: updateErr } = await db.rpc('admin_update_user_assignment', {
        p_target_user_id: targetUserId,
        p_new_role: newRole,
        p_new_department_id: newDepartmentId || null,
        p_project_ids: Array.isArray(projectIds) ? projectIds : [],
      })

      if (updateErr) throw updateErr

      return new Response(JSON.stringify({
        success: true,
        result,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  } catch (err) {
    return errorResponse(err)
  }
})
