import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type HoleResult = Database['public']['Tables']['hole_results']['Row']
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type TournamentPlayer = Database['public']['Tables']['tournament_players']['Row']
export type Competition = Database['public']['Tables']['competitions']['Row']
export type CompetitionPlayer = Database['public']['Tables']['competition_players']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']

export interface MatchStatus {
  leaderId: string | null
  holesUp: number
  holesPlayed: number
  holesRemaining: number
  isComplete: boolean
  isDormie: boolean
  resultSummary: string
}

export interface MatchWithProfiles extends Match {
  player_a: Profile
  player_b: Profile
  course: Course | null
}
