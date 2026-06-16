import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { GuestWaiting } from './GuestWaiting'

interface Props {
  params: Promise<{ inviteId: string }>
}

export default async function GuestWaitingPage({ params }: Props) {
  const { inviteId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // RLS only returns the invite to its host.
  const { data: invite } = await supabase
    .from('guest_invites')
    .select('id, code, status, match_id, host_id')
    .eq('id', inviteId)
    .single()

  if (!invite || invite.host_id !== user.id) redirect('/play')

  // Guest already joined → straight to the match.
  if (invite.status === 'joined' && invite.match_id) {
    redirect(`/matches/${invite.match_id}`)
  }
  if (invite.status === 'cancelled') redirect('/play')

  return <GuestWaiting inviteId={invite.id} code={invite.code} />
}
