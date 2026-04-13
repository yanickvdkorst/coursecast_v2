export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10" style={{ color: 'var(--color-gold-500)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.5 1.5M3 3h5.25M3 3v5.25M21 3l-1.5 1.5M21 3h-5.25M21 3v5.25M3 21l1.5-1.5M3 21h5.25M3 21v-5.25M21 21l-1.5-1.5M21 21h-5.25M21 21v-5.25M12 8v8M8 12h8" />
          </svg>
        </div>
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
