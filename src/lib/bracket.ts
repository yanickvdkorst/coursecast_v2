// Single-elimination bracket helpers (pure, no I/O).

export function nextPow2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return Math.max(p, 2)
}

// Standard seeding slot order for a bracket of `size` (power of 2).
// Returns seed numbers (1-based) in slot order, e.g. size 8 → [1,8,4,5,2,7,3,6].
export function seedSlots(size: number): number[] {
  let rounds = [1, 2]
  while (rounds.length < size) {
    const sum = rounds.length * 2 + 1
    const next: number[] = []
    for (const r of rounds) { next.push(r); next.push(sum - r) }
    rounds = next
  }
  return rounds
}

// Ordered player ids (best seed first) → round-1 slot array (length = bracketSize),
// with `null` for byes (missing seeds go to the strongest players).
export function buildRound1Slots(orderedIds: string[]): (string | null)[] {
  const n = orderedIds.length
  const size = nextPow2(n)
  return seedSlots(size).map(seed => (seed <= n ? orderedIds[seed - 1] : null))
}

export interface BracketMatchRow {
  round: number
  bracket_pos: number
  winner_id: string | null
  status: string
}

const isDecided = (m?: BracketMatchRow) =>
  !!m && (m.status === 'complete' || m.status === 'conceded') && !!m.winner_id

// Winner of each pair per round: an id, or undefined if not yet decided.
// Round-1 pairs resolve to the bye player when one slot is null.
export function computeWinners(
  round1Slots: (string | null)[],
  matches: BracketMatchRow[]
): Record<number, (string | undefined)[]> {
  const size = round1Slots.length
  const totalRounds = Math.round(Math.log2(size))
  const at = (r: number, p: number) => matches.find(m => m.round === r && m.bracket_pos === p)
  const winners: Record<number, (string | undefined)[]> = { 1: [] }

  for (let p = 0; p < size / 2; p++) {
    const a = round1Slots[2 * p], b = round1Slots[2 * p + 1]
    if (a && b) winners[1][p] = isDecided(at(1, p)) ? at(1, p)!.winner_id! : undefined
    else winners[1][p] = a || b || undefined // bye
  }

  for (let r = 1; r < totalRounds; r++) {
    const pairs = size / Math.pow(2, r + 1)
    winners[r + 1] = []
    for (let p = 0; p < pairs; p++) {
      const m = at(r + 1, p)
      winners[r + 1][p] = isDecided(m) ? m!.winner_id! : undefined
    }
  }
  return winners
}

// Next-round matches that can now be created (both feeders known, not yet made).
export function pendingNextMatches(
  round1Slots: (string | null)[],
  matches: BracketMatchRow[]
): { round: number; pos: number; a: string; b: string }[] {
  const size = round1Slots.length
  const totalRounds = Math.round(Math.log2(size))
  const winners = computeWinners(round1Slots, matches)
  const at = (r: number, p: number) => matches.find(m => m.round === r && m.bracket_pos === p)
  const toCreate: { round: number; pos: number; a: string; b: string }[] = []

  for (let r = 1; r < totalRounds; r++) {
    const pairs = size / Math.pow(2, r + 1)
    for (let p = 0; p < pairs; p++) {
      const a = winners[r][2 * p]
      const b = winners[r][2 * p + 1]
      if (a && b && !at(r + 1, p)) {
        toCreate.push({ round: r + 1, pos: p, a, b })
        winners[r + 1][p] = undefined // created, undecided — don't cascade this pass
      }
    }
  }
  return toCreate
}

export interface BracketBox {
  matchId?: string
  a?: { name: string; won: boolean }
  b?: { name: string; won: boolean }
  aPlaceholder?: string
  bPlaceholder?: string
}

// Build a per-round view model of the whole bracket tree (incl. not-yet-created
// matches as placeholders).
export function buildBracketView(
  slots: (string | null)[],
  matches: (BracketMatchRow & { id: string; player_a_id: string; player_b_id: string })[],
  nameOf: (id: string) => string
): BracketBox[][] {
  const size = slots.length
  const totalRounds = Math.round(Math.log2(size))
  const winners = computeWinners(slots, matches)
  const at = (r: number, p: number) => matches.find(m => m.round === r && m.bracket_pos === p)
  const rounds: BracketBox[][] = []

  for (let r = 1; r <= totalRounds; r++) {
    const count = size / Math.pow(2, r)
    const boxes: BracketBox[] = []
    for (let p = 0; p < count; p++) {
      const m = at(r, p)
      if (m) {
        boxes.push({
          matchId: m.id,
          a: { name: nameOf(m.player_a_id), won: m.winner_id === m.player_a_id },
          b: { name: nameOf(m.player_b_id), won: m.winner_id === m.player_b_id },
        })
      } else if (r === 1) {
        const sa = slots[2 * p], sb = slots[2 * p + 1]
        boxes.push({ aPlaceholder: sa ? nameOf(sa) : 'vrij', bPlaceholder: sb ? nameOf(sb) : 'vrij' })
      } else {
        const wa = winners[r - 1][2 * p], wb = winners[r - 1][2 * p + 1]
        boxes.push({
          aPlaceholder: wa ? nameOf(wa) : `Winnaar ${roundName(r - 1, totalRounds).toLowerCase()}`,
          bPlaceholder: wb ? nameOf(wb) : `Winnaar ${roundName(r - 1, totalRounds).toLowerCase()}`,
        })
      }
    }
    rounds.push(boxes)
  }
  return rounds
}

export const roundName = (round: number, totalRounds: number): string => {
  const fromEnd = totalRounds - round
  if (fromEnd === 0) return 'Finale'
  if (fromEnd === 1) return 'Halve finale'
  if (fromEnd === 2) return 'Kwartfinale'
  return `Ronde ${round}`
}
