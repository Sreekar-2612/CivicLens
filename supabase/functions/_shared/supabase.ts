import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://xrpqgszwigdrcwbkpdtt.supabase.co'
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''
  return createClient(supabaseUrl, supabaseServiceKey)
}
