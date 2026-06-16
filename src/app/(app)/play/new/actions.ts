'use server'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// Local guest match: the opponent has no device and no account. We create a
// throwaway guest profile (flagged is_guest so it stays out of player lists)
// via the service role, then the match. The host scores everything locally.
export async function createLocalGuestMatch(name: string, courseId: string | null) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Naam is verplicht')

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // Dedicated admin client (service role, no session) — independent of the
  // host's cookies, so the host stays logged in.
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  // Create the guest auth user → handle_new_user trigger makes the profile.
  const email = `guest_${crypto.randomUUID()}@guest.local`
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: trimmed },
  })
  if (cErr || !created.user) throw new Error(cErr?.message ?? 'Kon gast niet aanmaken')
  const guestId = created.user.id

  // Admin-created users aren't anonymous, so the trigger left is_guest = false.
  await admin.from('profiles').update({ is_guest: true, full_name: trimmed }).eq('id', guestId)

  const { data: match, error: mErr } = await admin
    .from('matches')
    .insert({ player_a_id: user.id, player_b_id: guestId, course_id: courseId, status: 'pending' })
    .select('id')
    .single()
  if (mErr || !match) throw new Error(mErr?.message ?? 'Kon wedstrijd niet aanmaken')

  redirect(`/matches/${match.id}`)
}
