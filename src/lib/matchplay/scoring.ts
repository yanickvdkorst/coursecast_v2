import type { HoleResult, MatchStatus } from '@/types/match'

export function computeMatchStatus(
  holeResults: HoleResult[],
  playerAId: string,
  playerBId: string,
  totalHoles = 18
): MatchStatus {
  let aWins = 0
  let bWins = 0
  let holesPlayed = 0

  for (const hr of holeResults) {
    holesPlayed++
    if (hr.result === 'player_a') aWins++
    else if (hr.result === 'player_b') bWins++
  }

  const holesRemaining = totalHoles - holesPlayed
  const diff = aWins - bWins
  const leaderId = diff > 0 ? playerAId : diff < 0 ? playerBId : null
  const holesUp = Math.abs(diff)

  const isDormie = holesUp > 0 && holesUp === holesRemaining
  const isComplete = holesUp > holesRemaining || holesPlayed === totalHoles

  let resultSummary = ''
  if (isComplete) {
    if (diff === 0) {
      resultSummary = 'AS'
    } else if (holesRemaining === 0) {
      resultSummary = '1UP'
    } else {
      resultSummary = `${holesUp}&${holesRemaining}`
    }
  } else if (holesPlayed === 0) {
    resultSummary = 'All Square'
  } else if (diff === 0) {
    resultSummary = 'All Square'
  } else {
    resultSummary = `${holesUp}UP`
    if (isDormie) resultSummary += ' (Dormie)'
  }

  return {
    leaderId,
    holesUp,
    holesPlayed,
    holesRemaining,
    isComplete,
    isDormie,
    resultSummary,
  }
}

export function getHoleResult(
  holeResults: HoleResult[],
  holeNumber: number
): HoleResult | undefined {
  return holeResults.find(hr => hr.hole_number === holeNumber)
}
