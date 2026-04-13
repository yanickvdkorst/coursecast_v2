import { SignInForm } from '@/components/auth/SignInForm'

export default function SignInPage() {
  return (
    <>
      <h2
        className="text-xl font-semibold mb-6"
        style={{ color: 'var(--text-primary)' }}
      >
        Inloggen
      </h2>
      <SignInForm />
    </>
  )
}
