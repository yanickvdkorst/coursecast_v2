'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { createLocalGuestMatch, createDirectMatch } from './actions'
import { h2hLabel, type H2HRecord } from '@/lib/headToHead'
import type { Profile, Course } from '@/types/match'

type GameFormat = 'match' | 'series' | 'tournament'

interface Props {
  friends: Profile[]
  allPlayers: Profile[]
  courses: Course[]
  currentUserId: string
  h2hMap: Record<string, H2HRecord>
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

export function NewPlayWizard({ friends, allPlayers, courses, currentUserId, h2hMap }: Props) {
  const router = useRouter()
  const [format, setFormat] = useState<GameFormat>('match')
  const [opponentMode, setOpponentMode] = useState<'registered' | 'guest'>('registered')
  const [guestKind, setGuestKind] = useState<'local' | 'remote'>('local')
  const [guestName, setGuestName] = useState('')
  const [search, setSearch] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [name, setName] = useState('')
  const [tournamentFormat, setTournamentFormat] = useState<'round_robin' | 'bracket'>('round_robin')
  const [tournamentVisibility, setTournamentVisibility] = useState<'public' | 'private'>('public')
  const [tournamentRegDeadline, setTournamentRegDeadline] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [courseId, setCourseId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default list shows your friends; searching looks through ALL registered
  // players (friends no longer required to play someone).
  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q) {
      return allPlayers.filter(p =>
        p.username.toLowerCase().includes(q) || (p.full_name ?? '').toLowerCase().includes(q)
      )
    }
    // No search → friends, plus any already-selected non-friends so picks stay visible.
    const friendIds = new Set(friends.map(f => f.id))
    const extraSelected = allPlayers.filter(p => selectedPlayers.includes(p.id) && !friendIds.has(p.id))
    return [...extraSelected, ...friends]
  }, [friends, allPlayers, search, selectedPlayers])

  const togglePlayer = (id: string) => {
    if (format === 'match') {
      setSelectedPlayers(prev => (prev[0] === id ? [] : [id]))
    } else {
      setSelectedPlayers(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
    }
  }

  // Tournaments no longer require pre-selected players — they enroll or are
  // invited afterwards.
  const minPlayers = format === 'tournament' ? 0 : 1
  const requiresName = format !== 'match'
  const requiresDates = format === 'tournament'
  const isGuestMatch = format === 'match' && opponentMode === 'guest'

  const isValid = isGuestMatch
    ? (guestKind === 'local' ? guestName.trim().length > 0 : true)
    : selectedPlayers.length >= minPlayers &&
      (!requiresName || name.trim().length > 0) &&
      (!requiresDates || (startDate && endDate))

  const submitLabel = (() => {
    if (loading) return 'Bezig…'
    if (isGuestMatch) {
      if (guestKind === 'remote') return 'Gast uitnodigen'
      return guestName.trim() ? 'Start wedstrijd' : 'Vul de naam in'
    }
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

    if (isGuestMatch) {
      // Local guest → create the match on this device (server action redirects).
      if (guestKind === 'local') {
        try {
          await createLocalGuestMatch(guestName, courseId || null)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Kon wedstrijd niet aanmaken')
          setLoading(false)
        }
        return
      }
      // Remote guest → create an invite with a join code, then show the host
      // waiting screen. The match itself is created once the guest joins.
      const { data, error: e } = await supabase.rpc('create_guest_invite', { p_course_id: courseId || null })
      const invite = data as { invite_id: string; code: string } | null
      if (e || !invite) {
        setError(e?.message ?? 'Kon gast-uitnodiging niet aanmaken')
        setLoading(false)
        return
      }
      router.push(`/play/guest/${invite.invite_id}`)
      return
    }

    if (format === 'match') {
      try {
        const matchId = await createDirectMatch(selectedPlayers[0], courseId || null)
        router.push(`/matches/${matchId}`)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kon wedstrijd niet aanmaken')
        setLoading(false)
      }
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
        visibility: tournamentVisibility,
        registration_deadline: tournamentRegDeadline || null,
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
                onClick={() => { setFormat(opt.value); setSelectedPlayers([]); setOpponentMode('registered') }}
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

          <div className="mt-5">
            <Label>Zichtbaarheid</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'public', label: 'Openbaar', hint: 'Iedereen kan zich inschrijven' },
                { value: 'private', label: 'Privé', hint: 'Alleen op uitnodiging / acceptatie' },
              ] as const).map(v => {
                const active = tournamentVisibility === v.value
                return (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setTournamentVisibility(v.value)}
                    className="py-3 px-3 rounded-xl border text-left transition-colors"
                    style={
                      active
                        ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)' }
                        : { background: 'var(--bg-card)', borderColor: 'var(--border-color)' }
                    }
                  >
                    <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{v.label}</span>
                    <span className="block text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{v.hint}</span>
                  </button>
                )
              })}
            </div>
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
          <div className="mt-3">
            <Label optional>Inschrijven tot</Label>
            <input type="date" value={tournamentRegDeadline} onChange={e => setTournamentRegDeadline(e.target.value)} className={inputClass} style={inputStyle} />
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Uiterlijke datum waarop spelers zich kunnen inschrijven.
            </p>
          </div>
        </section>
      )}

      {/* Players */}
      <section>
        <Label optional={format === 'tournament'}>
          {format === 'match' ? 'Tegen wie?' : format === 'tournament' ? 'Spelers' : 'Speel tegen'}
        </Label>

        {/* Registered vs guest toggle (match only) */}
        {format === 'match' && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {([
              { value: 'registered', label: 'Speler' },
              { value: 'guest', label: 'Gast' },
            ] as const).map(o => {
              const active = opponentMode === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { setOpponentMode(o.value); setSelectedPlayers([]) }}
                  className="py-2.5 rounded-xl border text-sm font-semibold transition-colors"
                  style={
                    active
                      ? { background: 'var(--accent)', color: 'var(--on-accent)', borderColor: 'transparent' }
                      : { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
                  }
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        )}

        {isGuestMatch ? (
          <div className="space-y-3">
            {/* Local (this device) vs remote (own phone) */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'local', label: 'Lokaal' },
                { value: 'remote', label: 'Online' },
              ] as const).map(o => {
                const active = guestKind === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setGuestKind(o.value)}
                    className="py-2.5 rounded-xl border text-sm font-semibold transition-colors"
                    style={
                      active
                        ? { background: 'var(--accent)', color: 'var(--on-accent)', borderColor: 'transparent' }
                        : { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }
                    }
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>

            {guestKind === 'local' ? (
              <div>
                <input
                  type="text"
                  placeholder="Naam van je gast"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  autoComplete="off"
                />
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Je speelt en scoort op je eigen telefoon. Je tegenstander hoeft niets te doen.
                </p>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Je krijgt een deelbare link met code. Je gast opent &apos;m op zijn eigen telefoon, vult zijn naam in,
                  en speelt live mee. Geen account nodig.
                </p>
              </div>
            )}
          </div>
        ) : (
        <>
        <input
          type="text"
          placeholder="Zoek een speler…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${inputClass} mb-3`}
          style={inputStyle}
        />
        {filteredPlayers.length === 0 ? (
          <p className="text-sm py-2" style={{ color: 'var(--text-muted)' }}>
            {search.trim()
              ? 'Geen speler gevonden.'
              : format === 'tournament'
              ? 'Optioneel — zoek hierboven om spelers toe te voegen, of nodig ze later uit.'
              : 'Je hebt nog geen vrienden. Zoek hierboven om een speler te vinden.'}
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {filteredPlayers.map(p => {
              const selected = selectedPlayers.includes(p.id)
              const rec = h2hMap[p.id]
              const h2hShort = rec && rec.wins + rec.losses + rec.draws > 0 ? `${rec.wins}-${rec.draws}-${rec.losses}` : null
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
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      @{p.username}{h2hShort && <span className="ml-2">· {h2hShort}</span>}
                    </p>
                  </div>
                  {selected && <span className="text-lg" style={{ color: 'var(--accent)' }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
        </>
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
