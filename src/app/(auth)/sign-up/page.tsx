import { SignUpForm } from '@/components/auth/SignUpForm'

export default function SignUpPage() {
  return (
    <>
      <h2
        className="text-xl font-semibold mb-6"
        style={{ color: 'var(--text-primary)' }}
      >
        Create account
      </h2>
      <SignUpForm />
    </>
  )
}
