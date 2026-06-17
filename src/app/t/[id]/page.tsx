import { PublicTournament } from './PublicTournament'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PublicTournamentPage({ params }: Props) {
  const { id } = await params
  return <PublicTournament tournamentId={id} />
}
