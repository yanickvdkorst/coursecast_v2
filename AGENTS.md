<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Coursecast — project notes

Golf match-play scoring PWA. Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS, Realtime). See `README.md` for features and setup.

## Conventions

- **Supabase clients** (`src/lib/supabase/`): `getSupabaseServerClient()` (user session, RLS applies) and `getSupabaseServiceClient()`. For operations that must bypass RLS (cross-user writes, anon-guest creation, push), server actions create a dedicated admin client inline: `createClient<Database>(URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })` — always with an explicit ownership/permission check in code first.
- **Mutations** go through `'use server'` actions or `SECURITY DEFINER` RPCs; don't rely on the browser client for privileged writes. Public, account-free reads (spectator/tournament views) use `SECURITY DEFINER` RPCs granted to `anon`.
- **Schema** lives in `supabase/migrations/` (numbered, run in order). Add a new numbered file; never edit an applied one. Mirror new columns/functions in `src/types/database.ts` by hand (generated types aren't regenerated automatically).
- **Auth/routing**: `middleware.ts` gates everything. Public routes (sign-in/up, reset, `/join`, `/watch/`, `/t/`, PWA files) are allow-listed there; anonymous guests are restricted to their match + upgrade.
- **Styling**: Tailwind utilities plus CSS variables (`var(--accent)`, `var(--text-primary)`, …) defined in `globals.css` for light/dark. Player colors are Ryder-Cup red/blue (`--player-a` / `--player-b`).
- **Dutch UI**: user-facing copy is Dutch; admin labels are partly English.
- After changes, run `npm run build` (it type-checks and lints).
