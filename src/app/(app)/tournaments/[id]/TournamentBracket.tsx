import Link from 'next/link'
import { roundName, type BracketBox } from '@/lib/bracket'

function Side({ name, won, placeholder }: { name?: string; won?: boolean; placeholder?: string }) {
  return (
    <div
      className="px-3 py-2 text-sm truncate"
      style={{
        color: won ? 'var(--accent)' : name ? 'var(--text-primary)' : 'var(--text-muted)',
        fontWeight: won ? 700 : 500,
      }}
    >
      {name ?? placeholder ?? '—'}
    </div>
  )
}

function Box({ box }: { box: BracketBox }) {
  const inner = (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
      <Side name={box.a?.name} won={box.a?.won} placeholder={box.aPlaceholder} />
      <div style={{ borderTop: '1px solid var(--border-color)' }} />
      <Side name={box.b?.name} won={box.b?.won} placeholder={box.bPlaceholder} />
    </div>
  )
  return box.matchId ? <Link href={`/matches/${box.matchId}`} className="block">{inner}</Link> : inner
}

export function TournamentBracket({ rounds }: { rounds: BracketBox[][] }) {
  const total = rounds.length
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
        {rounds.map((boxes, ri) => (
          <div key={ri} className="flex flex-col justify-around gap-3 w-40 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {roundName(ri + 1, total)}
            </p>
            {boxes.map((box, bi) => <Box key={bi} box={box} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
