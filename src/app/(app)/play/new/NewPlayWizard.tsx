'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Profile, Course } from '@/types/match'

type GameFormat = 'match' | 'series' | 'tournament'

interface Props {
  friends: Profile[]
  allPlayers: Profile[]
  courses: Course[]
  currentUserId: string
}

const FORMAT_OPTIONS: { value: GameFormat; title: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'match',
    title: 'Wedstrijd',
    description: '1 partij tegen 1 vriend',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312" />
      </svg>
    ),
  },
  {
    value: 'series',
    title: 'Reeks',
    description: 'Doorlopend tegen één of meer vrienden',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.691v-4.992m0 0h-4.991" />
      </svg>
    ),
  },
  {
    value: 'tournament',
    title: 'Toernooi',
    description: 'Event met formaat en datums',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172" />
      </svg>
    ),
  },
]

export function NewPlayWizard({ friends, allPlayers, courses, currentUserId }: Props) {
  const router = useRouter()
  const [format, setFormat] = useState<GameFormat>('match')
  const [search, setSearch] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [name, setName] = useState('')
  const [tournamentFormat, setTournamentFormat] = useState<'round_robin' | 'bracket'>('round_robin')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [courseId, setCourseId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const playerPool = format === 'match' ? allPlayers : friends

  const filteredPlayers = useMemo(() => {
    const q = search.toLowerCase()
    return playerPool.filter(p =>
      p.username.toLowerCase().includes(q) || (p.full_name ?? '').toLowerCase().includes(q)
    )
  }, [playerPool, search])

  const togglePlayer = (id: string) => {
    if (format === 'match') {
      setSelectedPlayers(prev => (prev[0] === id ? [] : [id]))
    } else {
      setSelectedPlayers(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
    }
  }

  const minPlayers = format === 'match' ? 1 : format === 'series' ? 1 : 2
  const requiresName = format !== 'match'
  const requiresDates = format === 'tournament'

  const isValid =
    selectedPlayers.length >= minPlayers &&
    (!requiresName || name.trim().length > 0) &&
    (!requiresDates || (startDate && endDate))

  const submitLabel = (() => {
    if (loading) return 'Bezig…'
    if (selectedPlayers.length < minPlayers) return format === 'match' ? 'Kies een tegenstander' : `Kies minimaal ${minPlayers} ${minPlayers === 1 ? 'speler' : 'spelers'}`
    if (requiresName && !name.trim()) return 'Geef het een naam'
    if (requiresDates && (!startDate || !endDate)) return 'Vul start- en einddatum in'
    if (format === 'match') return 'Start wedstrijd'
    if (format === 'series') return 'Start reeks'
    return 'Maak toernooi aan'
  })()

  const handleSubmit = async () => {
    if (!isValid) return
    setLoading(true)
    setError(null)
    const supabase = getSupabaseBrowserClient()

    if (format === 'match') {
      const { data, error: e } = await supabase
        .from('matches')
        .insert({
          player_a_id: currentUserId,
          player_b_id: selectedPlayers[0],
          course_id: courseId || null,
          status: 'pending',
        })
        .select('id')
        .single()
      if (e || !data) {
        setError(e?.message ?? 'Kon wedstrijd niet aanmaken')
        setLoading(false)
        return
      }
      router.push(`/matches/${data.id}`)
      return
    }

    if (format === 'series') {
      const { data, error: e } = await supabase
        .from('competitions')
        .insert({
          name: name.trim(),
          format: 'winsonly',
          status: 'active',
          created_by: currentUserId,
          ends_at: null,
        })
        .select('id')
        .single()
      if (e || !data) {
        setError(e?.message ?? 'Kon reeks niet aanmaken')
        setLoading(false)
        return
      }
      const ids = [currentUserId, ...selectedPlayers]
      await supabase.from('competition_players').insert(
        ids.map(pid => ({ competition_id: data.id, player_id: pid }))
      )
      router.push(`/competitions/${data.id}`)
      return
    }

    // tournament
    const { data, error: e } = await supabase
      .from('tournaments')
      .insert({
        name: name.trim(),
        format: tournamentFormat,
        status: 'draft',
        course_id: courseId || null,
        created_by: currentUserId,
        starts_at: new Date(startDate).toISOString(),
        ends_at: new Date(endDate).toISOString(),
      })
      .select('id')
      .single()
    if (e || !data) {
      setError(e?.message ?? 'Kon toernooi niet aanmaken')
      setLoading(false)
      return
    }
    const ids = [currentUserId, ...selectedPlayers]
    await supabase.from('tournament_players').insert(
      ids.map((pid, i) => ({ tournament_id: data.id, player_id: pid, seed: i + 1 }))
    )
    router.push(`/tournaments/${data.id}`)
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors focus:border-[var(--accent)]'
  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }

  return (
    <div className="space-y-7">
      {/* Format selection */}
      <section>
        <Label>Wat ga je spelen?</Label>
        <div className="space-y-2">
          {FORMAT_OPTIONS.map(opt => {
            const active = format === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setFormat(opt.value); setSelectedPlayers([]) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-colors"
                style={{
                  background: active ? 'var(--accent-soft)' : 'var(--bg-card)',
                  borderColor: active ? 'var(--accent)' : 'var(--border-color)',
                }}
              >
                <span style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{opt.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.description}</p>
                </div>
                {active && <span className="text-lg" style={{ color: 'var(--accent)' }}>✓</span>}
              </button>
            )
          })}
        </div>
      </section>

      {/* Name (series + tournament) */}
      {requiresName && (
        <section>
          <Label>Naam</Label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={inputClass}
            style={inputStyle}
            placeholder={format === 'series' ? 'bijv. Eeuwig duel' : 'bijv. Zomerkampioenschap'}
          />
        </section>
      )}

      {/* Tournament format */}
      {format === 'tournament' && (
        <section>
          <Label>Formaat</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['round_robin', 'bracket'] as const).map(f => {
              const active = tournamentFormat === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTournamentFormat(f)}
                  className="py-3 rounded-xl border text-sm font-semibold transition-colors"
                  style={
                    active
                      ? { background: 'var(--accent)', color: 'var(--on-accent)', borderColor: 'transparent' }
                      : { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
                  }
                >
                  {f === 'round_robin' ? 'Iedereen vs iedereen' : 'Knock-out'}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Dates (tournament only) */}
      {requiresDates && (
        <section>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startdatum</Label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div>
              <Label>Einddatum</Label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
          </div>
        </section>
      )}

      {/* Players */}
      <section>
        <Label>
          {format === 'match' ? 'Tegen wie?' : 'Speel tegen'}
        </Label>
        {format === 'match' && (
          <input
            type="text"
            placeholder="Zoek een speler…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`${inputClass} mb-3`}
            style={inputStyle}
          />
        )}
        {playerPool.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
            {format === 'match'
              ? 'Geen andere spelers gevonden.'
              : 'Geen vrienden gevonden. Voeg eerst vrienden toe via je profiel.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {filteredPlayers.map(p => {
              const selected = selectedPlayers.includes(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlayer(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors"
                  style={
                    selected
                      ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)' }
                      : { background: 'var(--bg-card)', borderColor: 'var(--border-color)' }
                  }
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
                  >
                    {(p.full_name || p.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {p.full_name || p.username}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{p.username}</p>
                  </div>
                  {selected && <span className="text-lg" style={{ color: 'var(--accent)' }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Course (optional, for match + tournament) */}
      {format !== 'series' && courses.length > 0 && (
        <section>
          <Label optional>Baan</Label>
          <div className="space-y-2">
            {courses.map(c => {
              const selected = courseId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCourseId(selected ? '' : c.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors"
                  style={
                    selected
                      ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)' }
                      : { background: 'var(--bg-card)', borderColor: 'var(--border-color)' }
                  }
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.holes} holes</p>
                  </div>
                  {selected && <span className="text-lg" style={{ color: 'var(--accent)' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {error && <p className="text-sm" style={{ color: 'var(--status-danger)' }}>{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="w-full py-4 rounded-2xl font-semibold text-base transition-opacity disabled:opacity-40"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {submitLabel}
      </button>
    </div>
  )
}

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
      {children}
      {optional && <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>(optioneel)</span>}
    </p>
  )
}
