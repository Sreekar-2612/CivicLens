import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isUserAccessToken } from './requestToken.ts'

const url = () => Deno.env.get('SUPABASE_URL') || ''
const anonKey = () => Deno.env.get('SUPABASE_ANON_KEY') || ''
const serviceKey = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Public endpoints use the caller's JWT and database RLS.
export function getSupabaseClient(req: Request) {
  if (!url() || !anonKey()) throw new Error('Supabase is not configured')
  const authorization = req?.headers.get('Authorization')
  return createClient(url(), anonKey(), {
    global: { headers: authorization ? { Authorization: authorization } : {} },
  })
}

export function getAnonymousClient() {
  if (!url() || !anonKey()) throw new Error('Supabase is not configured')
  return createClient(url(), anonKey())
}

export function hasUserToken(req: Request) {
  const authorization = req.headers.get('Authorization')
  if (!authorization) return false
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  return isUserAccessToken(token, anonKey())
}

export function validEvidencePath(path: string, userId: string, folders: string[]) {
  return folders.some(folder => path.startsWith(`${folder}/${userId}/`)) &&
    /^[a-z]+\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path)
}

function serviceClient() {
  if (!url() || !serviceKey()) throw new Error('Supabase service role is not configured')
  return createClient(url(), serviceKey())
}

export class HttpError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function requireActor(req: Request, roles: string[] = []) {
  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) throw new HttpError('Authentication required', 401)
  const db = serviceClient()
  const { data: { user }, error: authError } = await db.auth.getUser(token)
  if (authError || !user) throw new HttpError('Invalid authentication', 401)
  const { data: profile, error: profileError } = await db.from('profiles')
    .select('id, role, department_id, display_name').eq('id', user.id).single()
  if (profileError || !profile) throw new HttpError('Profile required', 403)
  if (roles.length && !roles.includes(profile.role)) throw new HttpError('Insufficient permissions', 403)
  return { db, user, profile }
}

export function requireDepartment(profile: { role: string; department_id: string | null }, departmentId: string | null) {
  if (profile.role !== 'admin' && (!departmentId || profile.department_id !== departmentId)) {
    throw new HttpError('Department access denied', 403)
  }
}

export function errorResponse(err: unknown) {
  const status = err instanceof HttpError ? err.status : 400
  const message = err instanceof Error ? err.message : 'Request failed'
  return new Response(JSON.stringify({ success: false, error: message }), {
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, status,
  })
}
