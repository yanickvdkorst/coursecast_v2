import { JoinGuestForm } from '@/components/auth/JoinGuestForm'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  const initialCode = (code ?? '').replace(/\D/g, '').slice(0, 4)
  return <JoinGuestForm initialCode={initialCode} />
}
