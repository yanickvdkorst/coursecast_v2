import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Nog niet begonnen',
  active: 'Bezig',
  complete: 'Afgerond',
  conceded: 'Opgegeven',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--text-muted)',
  active: 'var(--status-success)',
  complete: 'var(--accent)',
  conceded: 'var(--status-danger)',
}

type PlayerRef = { username: string; full_name: string | null } | null

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : null

export default async function AdminMatchesPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  // RLS policy `matches_select_participants_or_admin` lets an admin read every match.
  const { data: matchesData } = await supabase
    .from('matches')
    .select('*, player_a:profiles!matches_player_a_id_fkey(username, full_name), player_b:profiles!matches_player_b_id_fkey(username, full_name)')
    .order('created_at', { ascending: false })

  const matches = matchesData ?? []

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        Alle wedstrijden
      </h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        {matches.length} {matches.length === 1 ? 'wedstrijd' : 'wedstrijden'} van alle spelers
      </p>

      {matches.length === 0 ? (
        <div className="py-12 px-6 rounded-2xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nog geen wedstrijden gespeeld</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
          {matches.map((m, i) => {
            const a = m.player_a as PlayerRef
            const b = m.player_b as PlayerRef
            const nameA = a?.full_name || a?.username || 'Onbekend'
            const nameB = b?.full_name || b?.username || 'Onbekend'
            const status = m.status as string
            const isDone = status === 'complete' || status === 'conceded'
            const aWon = m.winner_id === m.player_a_id
            const bWon = m.winner_id === m.player_b_id
            const winnerName = aWon ? nameA : bWon ? nameB : null
            const date = fmtDate(isDone ? (m.completed_at as string) ?? (m.created_at as string) : (m.created_at as string))

            return (
              <Link
                key={m.id as string}
                href={`/matches/${m.id}`}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ background: 'var(--bg-card)', borderTop: i === 0 ? undefined : '1px solid var(--border-color)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span style={{ color: aWon ? 'var(--accent)' : 'var(--text-primary)', fontWeight: aWon ? 700 : 500 }}>{nameA}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 300 }}> vs </span>
                    <span style={{ color: bWon ? 'var(--accent)' : 'var(--text-primary)', fontWeight: bWon ? 700 : 500 }}>{nameB}</span>
                  </p>

                  {/* Status + date */}
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: STATUS_COLOR[status] ?? 'var(--text-muted)', fontWeight: 600 }}>
                      {STATUS_LABEL[status] ?? status}
                    </span>
                    {date ? <span> · {date}</span> : null}
                  </p>

                  {/* Winner / result */}
                  {isDone && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {winnerName ? `🏆 ${winnerName}` : 'Gelijkspel'}
                      {m.result_summary ? <span style={{ color: 'var(--text-muted)' }}> · {String(m.result_summary)}</span> : null}
                    </p>
                  )}
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
