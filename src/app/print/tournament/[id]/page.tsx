import { notFound, redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { buildBracketView, roundName, type BracketMatchRow } from '@/lib/bracket'
import { PrintButton } from './PrintButton'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Gepland', active: 'Bezig', complete: 'Afgerond', conceded: 'Opgegeven',
}
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

interface Props { params: Promise<{ id: string }> }

export default async function TournamentPrintPage({ params }: Props) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, format, starts_at, ends_at, bracket')
    .eq('id', id)
    .single()
  if (!tournament) notFound()

  const { data: matchesData } = await supabase
    .from('matches')
    .select('id, round, bracket_pos, player_a_id, player_b_id, status, winner_id, result_summary, scheduled_at, completed_at')
    .eq('tournament_id', id)
    .order('round')
  const matches = matchesData ?? []

  const ids = [...new Set(matches.flatMap(m => [m.player_a_id, m.player_b_id]))]
  const nameMap: Record<string, string> = {}
  if (ids.length) {
    const { data } = await supabase.from('profiles').select('id, full_name, username').in('id', ids)
    for (const p of data ?? []) nameMap[p.id] = p.full_name?.trim() || p.username
  }
  const nameOf = (pid: string) => nameMap[pid] ?? '?'

  const isBracket = tournament.format === 'bracket' && !!tournament.bracket
  const bracketView = isBracket
    ? buildBracketView(
        tournament.bracket as (string | null)[],
        matches.map(m => ({
          id: m.id, round: m.round ?? 1, bracket_pos: m.bracket_pos ?? 0,
          winner_id: m.winner_id, status: m.status, result_summary: m.result_summary,
          player_a_id: m.player_a_id, player_b_id: m.player_b_id,
        })) as (BracketMatchRow & { id: string; player_a_id: string; player_b_id: string })[],
        nameOf,
      )
    : null

  const schedById = Object.fromEntries(matches.map(m => [m.id, m.scheduled_at as string | null]))

  const rounds = matches.reduce<Record<number, typeof matches>>((acc, m) => {
    const r = (m.round as number) ?? 1
    ;(acc[r] ??= []).push(m)
    return acc
  }, {})

  const outcome = (m: (typeof matches)[number]) => {
    if (m.status !== 'complete' && m.status !== 'conceded') return STATUS_LABEL[m.status] ?? m.status
    if (!m.winner_id) return 'Gelijk'
    const s = m.result_summary && m.result_summary !== 'Gelijk' && m.result_summary !== 'Handmatig' ? ` (${m.result_summary})` : ''
    return `${nameOf(m.winner_id)}${s}`
  }

  return (
    <div style={{ background: '#fff', color: '#111', minHeight: '100vh', padding: 32, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`@media print { .no-print { display: none !important } } @page { margin: 14mm; size: landscape }`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px' }}>{tournament.name}</h1>
          <p style={{ margin: 0, color: '#555', fontSize: 13 }}>
            {tournament.format === 'round_robin' ? 'Iedereen vs iedereen' : 'Knock-out'}
            {' · '}{fmtDate(tournament.starts_at)} – {fmtDate(tournament.ends_at)}
          </p>
        </div>
        <PrintButton />
      </div>

      {matches.length === 0 ? (
        <p style={{ color: '#555' }}>Nog geen wedstrijden ingepland.</p>
      ) : bracketView ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', overflowX: 'auto' }}>
          {bracketView.map((boxes, ri) => (
            <div key={ri} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 12, minWidth: 170 }}>
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#555', margin: 0 }}>{roundName(ri + 1, bracketView.length)}</p>
              {boxes.map((box, bi) => {
                const sched = box.matchId ? fmtDateTime(schedById[box.matchId] ?? null) : ''
                const side = (name?: string, won?: boolean, score?: string, ph?: string) => (
                  <div style={{ padding: '6px 8px', fontSize: 13, color: won ? '#0a6135' : name ? '#111' : '#888', fontWeight: won ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name ?? ph ?? '—'}{won && score ? ` (${score})` : ''}
                  </div>
                )
                return (
                  <div key={bi}>
                    <div style={{ border: '1px solid #ccc', borderRadius: 8, overflow: 'hidden' }}>
                      {side(box.a?.name, box.a?.won, box.a?.score, box.aPlaceholder)}
                      <div style={{ borderTop: '1px solid #eee' }} />
                      {side(box.b?.name, box.b?.won, box.b?.score, box.bPlaceholder)}
                    </div>
                    {sched && <p style={{ fontSize: 10, color: '#888', margin: '2px 0 0', textAlign: 'center' }}>{sched}</p>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ) : (
        Object.entries(rounds).sort(([a], [b]) => Number(a) - Number(b)).map(([round, ms]) => (
          <div key={round} style={{ marginBottom: 20 }}>
            {tournament.format !== 'round_robin' && (
              <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#555', margin: '0 0 6px' }}>Ronde {round}</h2>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #111', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>Wedstrijd</th>
                  <th style={{ padding: '6px 8px', width: 150 }}>Gepland</th>
                  <th style={{ padding: '6px 8px' }}>Uitslag</th>
                </tr>
              </thead>
              <tbody>
                {ms.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '6px 8px' }}>{nameOf(m.player_a_id)} vs {nameOf(m.player_b_id)}</td>
                    <td style={{ padding: '6px 8px', color: '#555' }}>{fmtDateTime(m.scheduled_at as string | null) || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{outcome(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}
