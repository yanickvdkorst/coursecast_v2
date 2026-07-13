'use client'

import Link from 'next/link'

export interface ScheduleRow {
  round: number
  a: string
  b: string
  status: string
  winner: string
  score: string
  scheduled: string
  date: string
}

function toCsv(rows: ScheduleRow[]): string {
  const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`
  const header = ['Ronde', 'Speler A', 'Speler B', 'Gepland', 'Status', 'Winnaar', 'Score', 'Voltooid']
  const lines = [header.map(esc).join(',')]
  for (const r of rows) {
    lines.push([String(r.round), r.a, r.b, r.scheduled, r.status, r.winner, r.score, r.date].map(esc).join(','))
  }
  return '﻿' + lines.join('\r\n') // BOM for Excel
}

export function TournamentExport({ rows, tournamentName, printHref }: { rows: ScheduleRow[]; tournamentName: string; printHref: string }) {
  const downloadCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tournamentName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'toernooi'}-planning.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
        Planning exporteren
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadCsv}
          className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M12 3v13m0 0l-4-4m4 4l4-4M4 21h16" />
          </svg>
          CSV
        </button>
        <Link
          href={printHref}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--accent)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-4a2 2 0 012-2h16a2 2 0 012 2v4a2 2 0 01-2 2h-2M6 14h12v7H6z" />
          </svg>
          PDF / printen
        </Link>
      </div>
    </section>
  )
}
