export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-2">⛳</div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-gold-500)' }}
        >
          MatchPlay
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Golf matchplay scoring
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6 border"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
