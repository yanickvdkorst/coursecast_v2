export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10" style={{ color: 'var(--color-gold-500)' }}>
            {/* Golf flag (course) */}
            <path d="M8 20V4.5" />
            <path d="M8 4.5l7 2.25L8 9" />
            <path d="M5.5 20h5" />
            {/* Broadcast waves (cast) */}
            <path d="M16.4 4a4.5 4.5 0 0 1 1.9 3.5" />
            <path d="M18 2.1a7.5 7.5 0 0 1 3 5.4" />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--color-gold-500)' }}
        >
          Coursecast
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
