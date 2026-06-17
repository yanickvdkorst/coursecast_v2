import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { Competition, Tournament } from '@/types/match'

const TOURNAMENT_FORMAT_LABEL: Record<string, string> = {
  round_robin: 'Iedereen vs iedereen',
  bracket:     'Knock-out',
}

export default async function PlayPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const [matchesRes, competitionsRes, tournamentsRes] = await Promise.all([
    supabase
      .from('matches')
      .select('*, player_a:profiles!matches_player_a_id_fkey(username, full_name), player_b:profiles!matches_player_b_id_fkey(username, full_name)')
      .or(`player_a_id.eq.${user.id},player_b_id.eq.${user.id}`)
      .is('competition_id', null)
      .is('tournament_id', null)
      .order('created_at', { ascending: false }),
    supabase.from('competitions').select('*').order('created_at', { ascending: false }),
    supabase.from('tournaments').select('*').order('created_at', { ascending: false }),
  ])

  const matches = matchesRes.data ?? []
  const competitions = (competitionsRes.data ?? []) as Competition[]
  const tournaments = (tournamentsRes.data ?? []) as Tournament[]

  const activeMatches = matches.filter(m => m.status === 'active' || m.status === 'pending')
  const completedMatches = matches.filter(m => m.status === 'complete' || m.status === 'conceded')

  const isEmpty =
    activeMatches.length === 0 &&
    completedMatches.length === 0 &&
    competitions.length === 0 &&
    tournaments.length === 0

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Spelen</h1>
        <Link
          href="/play/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuw
        </Link>
      </div>

      {isEmpty && <EmptyState />}

      {activeMatches.length > 0 && (
        <Section title="Lopend">
          <List>
            {activeMatches.map((m, i) => (
              <MatchRow key={m.id as string} match={m} userId={user.id} isFirst={i === 0} />
            ))}
          </List>
        </Section>
      )}

      {competitions.length > 0 && (
        <Section title="Reeksen">
          <List>
            {competitions.map((c, i) => (
              <CompetitionRow key={c.id} competition={c} isFirst={i === 0} />
            ))}
          </List>
        </Section>
      )}

      {tournaments.length > 0 && (
        <Section title="Toernooien">
          <List>
            {tournaments.map((t, i) => (
              <TournamentRow key={t.id} tournament={t} isFirst={i === 0} />
            ))}
          </List>
        </Section>
      )}

      {completedMatches.length > 0 && (
        <Section title="Gespeeld">
          <List>
            {completedMatches.map((m, i) => (
              <MatchRow key={m.id as string} match={m} userId={user.id} isFirst={i === 0} />
            ))}
          </List>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        {title}
      </p>
      {children}
    </section>
  )
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div
      className="py-12 px-6 rounded-2xl text-center mt-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nog niets gespeeld</p>
      <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
        Tik op &ldquo;Nieuw&rdquo; om een wedstrijd, reeks of toernooi te starten
      </p>
      <Link
        href="/play/new"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Begin een spel
      </Link>
    </div>
  )
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function MatchRow({ match, userId, isFirst }: { match: Record<string, unknown>; userId: string; isFirst: boolean }) {
  const playerA = match.player_a as { username: string; full_name: string } | null
  const playerB = match.player_b as { username: string; full_name: string } | null
  const opponent = match.player_a_id === userId ? playerB : playerA
  const won = match.winner_id === userId
  const lost = match.winner_id && match.winner_id !== userId
  const initial = (opponent?.full_name || opponent?.username || '?')[0].toUpperCase()

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-3 px-4 py-4"
      style={{ background: 'var(--bg-card)', borderTop: isFirst ? undefined : '1px solid var(--border-color)' }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          vs {opponent?.full_name || opponent?.username || 'Onbekend'}
        </p>
        {(match.status === 'active' || match.status === 'pending') ? (
          <p className="text-xs mt-0.5" style={{ color: match.status === 'active' ? 'var(--status-success)' : 'var(--text-muted)' }}>
            {match.status === 'pending' ? 'Nog niet begonnen' : 'Bezig'}
          </p>
        ) : match.result_summary ? (
          <p className="text-xs mt-0.5 font-medium" style={{ color: won ? 'var(--accent)' : lost ? 'var(--status-danger)' : 'var(--text-muted)' }}>
            {won ? 'Gewonnen' : lost ? 'Verloren' : 'Gelijk'} · {String(match.result_summary)}
          </p>
        ) : null}
      </div>
      <ChevronRight />
    </Link>
  )
}

function CompetitionRow({ competition, isFirst }: { competition: Competition; isFirst: boolean }) {
  return (
    <Link
      href={`/competitions/${competition.id}`}
      className="flex items-center gap-3 px-4 py-4"
      style={{ background: 'var(--bg-card)', borderTop: isFirst ? undefined : '1px solid var(--border-color)' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" style={{ color: 'var(--accent)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691v-4.992m0 0h-4.991" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{competition.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Reeks <span className="mx-1.5">·</span>
          <span style={{ color: competition.status === 'active' ? 'var(--status-success)' : 'var(--text-muted)' }}>
            {competition.status === 'active' ? 'Actief' : 'Gestopt'}
          </span>
        </p>
      </div>
      <ChevronRight />
    </Link>
  )
}

function TournamentRow({ tournament, isFirst }: { tournament: Tournament; isFirst: boolean }) {
  const STATUS_LABEL: Record<string, string> = { draft: 'Open', active: 'Bezig', complete: 'Gespeeld' }
  const STATUS_COLOR: Record<string, string> = {
    draft: 'var(--text-muted)',
    active: 'var(--status-success)',
    complete: 'var(--accent)',
  }
  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="flex items-center gap-3 px-4 py-4"
      style={{ background: 'var(--bg-card)', borderTop: isFirst ? undefined : '1px solid var(--border-color)' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" style={{ color: 'var(--accent)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{tournament.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Toernooi <span className="mx-1.5">·</span>
          {TOURNAMENT_FORMAT_LABEL[tournament.format] ?? tournament.format}
          <span className="mx-1.5">·</span>
          <span style={{ color: STATUS_COLOR[tournament.status] ?? 'var(--text-muted)' }}>
            {STATUS_LABEL[tournament.status] ?? tournament.status}
          </span>
        </p>
      </div>
      <ChevronRight />
    </Link>
  )
}
