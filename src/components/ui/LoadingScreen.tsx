// Lightweight centered spinner for route-level loading.tsx files.
export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]" style={{ background: 'var(--bg-primary)' }}>
      <span
        className="inline-block w-8 h-8 rounded-full animate-spin"
        style={{ border: '3px solid var(--border-color)', borderTopColor: 'var(--accent)' }}
        role="status"
        aria-label="Laden"
      />
    </div>
  )
}
