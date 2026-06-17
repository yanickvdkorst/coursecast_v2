import { WatchMatch } from '@/app/watch/[token]/WatchMatch'

interface Props {
  params: Promise<{ id: string; matchId: string }>
}

export default async function PublicTournamentMatchPage({ params }: Props) {
  const { id, matchId } = await params
  return <WatchMatch matchId={matchId} backHref={`/t/${id}`} />
}
