'use server'

import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

function adminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  // Upsert on endpoint (a device may re-subscribe, or switch user). Admin
  // client so an endpoint previously owned by another user gets reassigned.
  const { error } = await adminClient()
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { onConflict: 'endpoint' }
    )
  return { ok: !error }
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  await adminClient().from('push_subscriptions').delete().eq('endpoint', endpoint)
  return { ok: true }
}
