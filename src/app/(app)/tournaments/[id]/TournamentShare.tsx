'use client'

import { useEffect, useState } from 'react'

export function TournamentShare({ tournamentId }: { tournamentId: string }) {
  const [url, setUrl] = useState('')
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setUrl(`${window.location.origin}/tournaments/${tournamentId}`)
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [tournamentId])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* clipboard unavailable */ }
  }
  const share = async () => {
    try { await navigator.share({ title: 'Doe mee met dit toernooi', url }) } catch { /* cancelled */ }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--accent)' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Deel inschrijflink
      </button>

      {open && (
        <div className="mt-3 rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <span className="flex-1 min-w-0 truncate text-sm" style={{ color: 'var(--text-secondary)' }}>{url}</span>
            <button onClick={copy} className="text-sm font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
              {copied ? 'Gekopieerd!' : 'Kopieer'}
            </button>
          </div>
          {canShare && (
            <button onClick={share} className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Deel…</button>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Iedereen met deze link kan het toernooi bekijken en zich inschrijven.
          </p>
        </div>
      )}
    </div>
  )
}
