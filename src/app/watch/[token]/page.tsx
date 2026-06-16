import { WatchMatch } from './WatchMatch'

interface Props {
  params: Promise<{ token: string }>
}

export default async function WatchPage({ params }: Props) {
  const { token } = await params
  return <WatchMatch token={token} />
}
