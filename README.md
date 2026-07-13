# Coursecast

Golf match‑play scoring — real‑time, mobile‑first, installable as a PWA.

Built with **Next.js 16** (App Router) and **Supabase** (Postgres, Auth, Row Level Security, Realtime). Styled with Tailwind; theming via CSS variables (light/dark).

## Features

- **Match‑play scoring** — hole‑by‑hole, live two‑device sync via Supabase Realtime, with an offline scoring queue.
- **Guests (no account)** — play against a guest via a join‑code lobby (live, own phone) or a quick local guest (just a name, scored on your device). Guests use anonymous auth and can later claim their matches by creating an account.
- **Spectator links** — share a read‑only `/watch/<token>` link to any match; no account needed.
- **Tournaments** — round‑robin or knock‑out, public or private, with self‑enrolment (public), request‑to‑join (private), organiser invitations (accept/decline), a registration deadline, a shareable enrol link, and a public live overview at `/t/<id>` where every match is followable.
- **Competitions / series** — ongoing standings between players.
- **Friends, head‑to‑head** — friend requests; win‑draw‑loss record between any two players shown on cards, the picker and the scorecard.
- **Push notifications** — friend requests, accepted requests, new matches, tournament invites/requests (Web Push + VAPID).
- **Notifications screen** — action‑oriented inbox (`/notifications`) with a bell + count on the dashboard.
- **Admin** — one promoted account manages all tournaments, competitions and matches.

## Getting started

```bash
npm install
npm run dev    # http://localhost:3000
```

### Environment (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...           # server‑only (guest/tournament/push actions)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...        # web push (also set in the deploy env)
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

Generate VAPID keys with `npx web-push generate-vapid-keys`.

## Supabase setup

Run the SQL in `supabase/migrations/` in order (001 → 020) via the Supabase SQL editor (or the CLI). Highlights:

- `001`–`009` — schema, RLS, realtime, friendships, creator/competition/tournament policies, delete function.
- `010` — promote your admin account (edit the email first).
- `011` — pin `search_path` on `SECURITY DEFINER` functions (fixes user deletion).
- `012` — admin manage (delete) policies.
- `013` — guest players (anonymous auth) + `guest_invites` + RPCs.
- `014` — match spectator share tokens + RPCs.
- `015` — flag guest profiles (`is_guest`).
- `016` — `push_subscriptions`.
- `017`–`020` — tournaments: visibility, enrolment status, registration deadline, public live RPCs.

Also required in the Supabase dashboard:

- **Authentication → Providers → Anonymous sign‑ins**: enable (for guests).
- **Authentication → URL Configuration**: allowlist the redirect URLs (`/auth/callback`).
- **Authentication → Email Templates**: paste the styled templates from `supabase/email-templates/` (Confirm signup, Magic Link, Reset Password).

## Project layout

- `src/app/(app)/` — authenticated app (dashboard, play, matches, tournaments, competitions, profile).
- `src/app/(auth)/` — sign‑in/up, password reset, guest join, guest upgrade.
- `src/app/t/`, `src/app/watch/` — public spectator views.
- `src/app/admin/` — admin area.
- `src/lib/` — Supabase clients, scoring, push, head‑to‑head, notifications.
- `middleware.ts` — auth gating, public‑route allowlist, anonymous‑guest restrictions.
- `supabase/migrations/` — database schema & policies.

## Deploy

Deployed on Vercel. Before/after a deploy: set the env vars (incl. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` at build time), run any new migrations, and re‑add the home‑screen install if the icon changed.
