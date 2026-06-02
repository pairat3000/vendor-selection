// Edge Function: admin-users
// Privileged user-management operations (create / delete / reset password).
// Only callable by an authenticated user whose profile.role = 'admin'.
// Uses the service_role key (never exposed to the browser).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreatePayload {
  action: 'create'
  email: string
  password: string
  full_name: string
  role: 'admin' | 'it_user' | 'scorer' | 'approver'
}
interface DeletePayload { action: 'delete'; user_id: string }
interface ResetPayload { action: 'reset_password'; user_id: string; password: string }
type Payload = CreatePayload | DeletePayload | ResetPayload

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

    // ── Verify caller ──────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await callerClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Invalid session' }, 401)

    // ── Check caller is admin ──────────────────────────────────
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return json({ error: 'Forbidden — admin only' }, 403)
    }

    // ── Perform action ─────────────────────────────────────────
    const payload = (await req.json()) as Payload

    if (payload.action === 'create') {
      const { email, password, full_name, role } = payload
      if (!email || !password || !role) return json({ error: 'email, password, role required' }, 400)
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // skip confirmation email
        user_metadata: { full_name, role },
      })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true, user_id: data.user.id })
    }

    if (payload.action === 'delete') {
      if (payload.user_id === user.id) return json({ error: 'ลบตัวเองไม่ได้' }, 400)
      const { error } = await admin.auth.admin.deleteUser(payload.user_id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (payload.action === 'reset_password') {
      if (!payload.password) return json({ error: 'password required' }, 400)
      const { error } = await admin.auth.admin.updateUserById(payload.user_id, {
        password: payload.password,
      })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500)
  }
})
