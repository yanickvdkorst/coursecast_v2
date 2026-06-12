# Gastspeler-functie — implementatieplan

> Status: **nog niet gebouwd**. Dit document beschrijft de volledige aanpak zodat
> het later in één keer uitgevoerd kan worden. Geschreven 2026-06-12.

## Doel

Bij een wedstrijd kun je kiezen voor een **gastspeler** (zonder account):
1. Host kiest "Gastspeler" → er wordt een **4-cijferige code** gegenereerd.
2. Gast opent een join-pagina op zijn eigen telefoon, vult de code + zijn naam in.
3. Gast en host **scoren live mee** vanaf hun eigen toestel.
4. De wedstrijd staat gewoon bij de host in zijn gespeelde wedstrijden.
5. De gast kan verder niets, behalve later een account aanmaken — en dan zijn
   eerder gespeelde gast-wedstrijden **claimen**.

## Belangrijkste inzicht

- **Live tweezijdig scoren bestaat al.** `src/app/(app)/matches/[matchId]/MatchScorecard.tsx`
  abonneert zich al op realtime `hole_results`-wijzigingen (regels ~42–65). Zodra de
  gast als `player_b_id` in de wedstrijd staat, werkt live meescoren vanzelf —
  geen wijziging aan het scorebord nodig.
- **Gast = Supabase anonymous auth.** De gast krijgt een echte (anonieme) sessie
  → RLS werkt normaal, realtime werkt, en bij het later aanmaken van een account
  behoudt de gast hetzelfde `user_id`, dus al zijn wedstrijden gaan automatisch mee.
  Claimen is daardoor in feite gratis.

## ⚠️ Prerequisite (handmatig, vóór alles)

1. **Supabase Dashboard → Authentication → Providers → Anonymous sign-ins → aanzetten.**
   Zonder dit kan een gast geen sessie krijgen en werkt de hele functie niet.
2. Daarna de nieuwe migratie draaien (zie onder).

> Kanttekening: claimen werkt zolang de gast op hetzelfde toestel/dezelfde
> browsersessie blijft. Wist de gast zijn cookies, dan is de anonieme sessie —
> en dus de koppeling — weg. Dit is inherent aan "gast zonder account".

## Architectuurkeuze: aparte `guest_invites`-tabel

We maken **niet** `matches.player_b_id` nullable (dat raakt elke wedstrijd-query,
het `MatchWithProfiles`-type en het scorebord). In plaats daarvan:

- Een aparte **uitnodigings-tabel** houdt de "pending" staat vast.
- De **match-rij wordt pas aangemaakt zodra de gast meedoet** — dan is het een
  doodgewone complete wedstrijd met twee spelers.
- Alle bestaande lijsten/queries/types blijven onaangeroerd. Minimaal risico.

## De flow (stap voor stap)

1. Host: "Nieuwe wedstrijd" → **Gastspeler** → RPC `create_guest_invite` maakt een
   uitnodiging + unieke 4-cijferige code. Host ziet een **wachtscherm met de code**.
2. Gast: opent **`/join`** (publieke route) → typt code → `lookup_guest_invite`
   toont "Je speelt tegen {host}" → gast vult **naam** in → tikt "Meedoen".
   - Client: `supabase.auth.signInAnonymously()` (anonieme sessie + profiel).
   - Daarna RPC `join_guest_match(code, naam)`: zet gast-naam op profiel, maakt de
     match (`player_a` = host, `player_b` = gast), markeert invite `joined`, geeft
     `match_id` terug.
   - Gast wordt doorgestuurd naar `/matches/{id}`.
3. Host's wachtscherm staat via **realtime** op `guest_invites` te luisteren →
   zodra status `joined` → automatisch door naar `/matches/{match_id}`.
4. **Beiden scoren live** — bestaande scorebord-code werkt.
5. Gast ziet op zijn scherm een banner "Maak een account om je wedstrijden te
   bewaren" → koppelt e-mail/wachtwoord aan de anonieme sessie
   (`supabase.auth.updateUser`) → zelfde id → wedstrijden behouden.

## Te bouwen onderdelen

### 1. DB-migratie (`supabase/migrations/013_guest_players.sql`)

- **Tabel `guest_invites`**:
  ```sql
  create table guest_invites (
    id         uuid primary key default gen_random_uuid(),
    code       text not null,
    host_id    uuid not null references profiles(id) on delete cascade,
    guest_id   uuid references profiles(id) on delete set null,
    course_id  uuid references courses(id) on delete set null,
    match_id   uuid references matches(id) on delete set null,
    status     text not null default 'open' check (status in ('open','joined','cancelled')),
    created_at timestamptz not null default now()
  );
  -- Code uniek onder open uitnodigingen (mag later hergebruikt worden):
  create unique index guest_invites_open_code on guest_invites (code) where status = 'open';
  ```
- **RLS** (enable + policies):
  - `select`/`insert`/`update`: `host_id = auth.uid()` (host beheert/polt eigen invites).
  - Gast-lookups en join lopen via `SECURITY DEFINER`-RPC's (bypassen RLS), dus
    de gast heeft geen directe select-policy op de tabel nodig.
- **Realtime**: `alter publication supabase_realtime add table guest_invites;`
- **RPC `create_guest_invite(p_course_id uuid) returns jsonb`** (`SECURITY DEFINER`):
  genereert unieke 4-cijferige code onder open invites, insert met `host_id = auth.uid()`,
  retourneert `{ invite_id, code }`.
- **RPC `lookup_guest_invite(p_code text) returns jsonb`** (`SECURITY DEFINER`,
  execute aan `anon` + `authenticated`): retourneert `{ host_name, course_name }`
  voor een open invite, of null. (Gebruikt zodat de gast de code kan valideren
  vóór er een anonieme user wordt aangemaakt — voorkomt wees-accounts bij typefouten.)
- **RPC `join_guest_match(p_code text, p_guest_name text) returns uuid`**
  (`SECURITY DEFINER`): valideert open invite, zet `profiles.full_name = p_guest_name`
  voor `auth.uid()` (de gast), maakt de match, markeert invite `joined` + vult
  `guest_id`/`match_id`, retourneert `match_id`.
- **Fix `handle_new_user()`-trigger**: anonieme users hebben geen e-mail en geen
  `username` in metadata → huidige trigger zet `username = NULL` → schendt
  `NOT NULL` → anonieme login crasht. Aanpassen naar een veilige, unieke fallback:
  ```sql
  COALESCE(
    NEW.raw_user_meta_data->>'username',
    NULLIF(split_part(COALESCE(NEW.email,''), '@', 1), ''),
    'guest_' || substr(NEW.id::text, 1, 8)
  )
  ```
  (en `SET search_path = public, pg_temp`, conform migratie 011).

### 2. Host-kant

- **`NewPlayWizard.tsx`** (`src/app/(app)/play/new/`): bij de "Wedstrijd"-flow een
  keuze "Geregistreerde speler | Gast" toevoegen. Bij "Gast" → `create_guest_invite`
  aanroepen en navigeren naar het wachtscherm.
- **Wachtscherm** `src/app/(app)/play/guest/[inviteId]/page.tsx` (+ client component):
  toont de grote code, "Wachten op gast…", realtime-subscription op de invite →
  bij `joined` redirect naar `/matches/{match_id}`. Plus een "Annuleren"-knop
  (zet invite `cancelled`).

### 3. Gast-kant

- **Publieke `/join`-pagina** `src/app/(auth)/join/page.tsx` (of eigen route-group):
  - Stap 1: code invoeren → `lookup_guest_invite` → toon host-naam.
  - Stap 2: naam invoeren → `signInAnonymously()` → `join_guest_match` → redirect
    naar `/matches/{id}`.
  - **Middleware**: `/join` als publieke route toevoegen (net als `/forgot-password`).
- **Account aanmaken/claimen** vanuit de anonieme sessie:
  - Banner op het scorebord wanneer `user.is_anonymous` → naar een upgrade-pagina.
  - Upgrade = `supabase.auth.updateUser({ email, password, data: { username, full_name } })`
    op de bestaande anonieme sessie (zelfde id → wedstrijden blijven).
  - Kan grotendeels `SignUpForm` hergebruiken in een "upgrade"-modus.

### 4. Lichte afscherming van gasten

- In `middleware.ts`: als `user.is_anonymous` en het pad valt buiten de toegestane
  gast-paden (`/matches/*`, `/join`, `/guest/*`, upgrade-pagina) → redirect naar
  hun wedstrijd of de upgrade-pagina. Zo kan de gast "in principe niks behalve
  een account aanmaken".

## Volgorde van uitvoeren

1. Anonymous sign-ins aanzetten in Supabase (prerequisite).
2. Migratie 013 schrijven + draaien (tabel, RLS, realtime, RPC's, trigger-fix).
3. Host: wizard-optie + wachtscherm.
4. Gast: `/join`-pagina + middleware-aanpassing.
5. Claim: upgrade-flow + banner.
6. Afscherming gasten in middleware.
7. Testen: host maakt gast-wedstrijd → 2e toestel joint via code → live scoren →
   gast maakt account aan → wedstrijd blijft behouden.

## Geraakte/bestaande bestanden (referentie)

- Scorebord + realtime: `src/app/(app)/matches/[matchId]/MatchScorecard.tsx`
- Realtime-publicatie: `supabase/migrations/003_realtime_enable.sql`
- Trigger + profielen: `supabase/migrations/001_initial_schema.sql`
- Sign-up: `src/components/auth/SignUpForm.tsx`
- Wizard / match-aanmaak: `src/app/(app)/play/new/NewPlayWizard.tsx`
- Middleware (publieke routes): `middleware.ts`
- RLS-policies: `supabase/migrations/002_rls_policies.sql`
