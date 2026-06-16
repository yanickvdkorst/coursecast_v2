'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface Props {
  inviteId: string
  code: string
}

export function GuestWaiting({ inviteId, code }: Props) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [cancelling, setCancelling] = useState(false)
  const [joinUrl, setJoinUrl] = useState('')
  const [canShare, setCanShare] = useState(false)
  const [copied, setCopied] = useState(false)

  // Build the shareable URL on the client (window isn't available on the server).
  useEffect(() => {
    setJoinUrl(`${window.location.origin}/join?code=${code}`)
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [code])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  const share = async () => {
    try {
      await navigator.share({
        title: 'Doe mee met mijn wedstrijd',
        text: `Doe mee met mijn golfwedstrijd (code ${code}):`,
        url: joinUrl,
      })
    } catch { /* user cancelled the share sheet */ }
  }

  useEffect(() => {
    let done = false
    const go = (matchId: string) => {
      if (done) return
      done = true
      router.push(`/matches/${matchId}`)
    }

    // Primary: realtime push when the guest joins.
    const channel = supabase
      .channel(`guest_invite:${inviteId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'guest_invites', filter: `id=eq.${inviteId}` },
        (payload) => {
          const row = payload.new as { status: string; match_id: string | null }
          if (row.status === 'joined' && row.match_id) go(row.match_id)
        }
      )
      .subscribe()

    // Backup: poll every 3s in case a realtime event is missed.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('guest_invites')
        .select('status, match_id')
        .eq('id', inviteId)
        .single()
      if (data?.status === 'joined' && data.match_id) go(data.match_id)
    }, 3000)

    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [inviteId, router, supabase])

  const cancel = async () => {
    setCancelling(true)
    await supabase.from('guest_invites').update({ status: 'cancelled' }).eq('id', inviteId)
    router.push('/play')
  }

  return (
    <div className="px-4 pt-12 pb-24 max-w-lg mx-auto text-center">
      <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
        Gastcode
      </p>
      <div
        className="mx-auto rounded-3xl px-8 py-8 mb-6 inline-block"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <p className="text-6xl font-black tabular-nums tracking-[0.2em]" style={{ color: 'var(--accent)' }}>
          {code}
        </p>
      </div>

      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Wachten op je gast…
      </h1>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Deel deze link met je gast — de code zit er al in.
      </p>

      {/* Shareable join link */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
      >
        <span className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
          {joinUrl || '…'}
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-sm font-semibold shrink-0 px-2 py-1 rounded-lg"
          style={{ color: 'var(--accent)' }}
        >
          {copied ? 'Gekopieerd!' : 'Kopieer'}
        </button>
      </div>

      {canShare && (
        <button
          type="button"
          onClick={share}
          className="w-full py-3 rounded-xl font-semibold text-base mt-3 flex items-center justify-center gap-2"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Deel link
        </button>
      )}

      <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
        Zodra je gast meedoet, begint de wedstrijd vanzelf.
      </p>

      <div className="mt-8 flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
        <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
        <span className="text-sm">Live verbinding actief</span>
      </div>

      <button
        type="button"
        onClick={cancel}
        disabled={cancelling}
        className="mt-10 text-sm font-medium disabled:opacity-60"
        style={{ color: 'var(--status-danger)' }}
      >
        {cancelling ? 'Annuleren…' : 'Uitnodiging annuleren'}
      </button>
    </div>
  )
}
