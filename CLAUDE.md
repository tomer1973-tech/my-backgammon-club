# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Local dev server (port 3000)
npx tsc --noEmit          # Typecheck — run this before considering any change done
npm run lint              # next lint

npm run db:push           # Push prisma/schema.prisma to the DB (no migration files are used)
npm run db:studio         # Prisma Studio

npx vercel deploy --prod --yes   # Deploy straight to production (no staging env)
```

There is no test suite in this repo — verification is `tsc --noEmit` plus manual/preview-server checking.

**Do not run `npm run build` while a dev/preview server is live** — it corrupts `.next` and breaks the running server. Use `npx tsc --noEmit` to verify correctness instead; `vercel deploy` builds in its own isolated environment so it's always safe.

Schema changes always go through `npm run db:push` (`prisma db push`). This project does not use `prisma migrate` / migration files — `schema.prisma` is the single source of truth, pushed directly.

### Environment variables

`DATABASE_URL` **must** point at the Supabase connection pooler (`*.pooler.supabase.com:6543`, `?pgbouncer=true&connection_limit=1`), not the direct host (`db.*.supabase.co:5432`). On Vercel's serverless runtime, the direct connection exhausts Postgres's connection limit under any real concurrency and causes app-wide slowness/hangs — this has bitten the project before. `DIRECT_URL` (port 5432, direct host) is correct and required separately for `prisma db push`, which can't run DDL through the pooler.

## Architecture

Next.js 14 App Router + TypeScript (strict) + Prisma/PostgreSQL (Supabase) + Supabase Auth + Tailwind. Single deployment unit on Vercel, no separate backend.

```
src/
├── actions/          # Server Actions — ALL DB mutations + most reads go through here, 'use server'
├── app/
│   ├── (auth)/       # Login, register, forgot/reset password — unauthenticated
│   ├── (dashboard)/  # Main app, wrapped in AppShell (sidebar/mobile nav, requires session)
│   ├── api/          # REST routes — only for tournament CSV/PDF export (Server Actions can't stream files)
│   ├── play/         # Local 2-player same-device play (no account)
│   ├── practice/     # Practice vs AI (no account)
│   ├── quick-game/   # Ad-hoc quick match builder (no account)
│   └── lessons/      # Static lesson content
├── components/       # Organized by domain (match/, tournament/, social/, messages/, backgammon/, ui/, …)
├── lib/
│   ├── backgammon/   # Pure TS game engine — board state, legal moves, AI, themes. No DB, no React.
│   ├── tournament/   # round-robin.ts, single-elimination.ts — pure scheduling algorithms
│   ├── analytics.ts  # Pure computation engine for stats (no DB) — see "Analytics" below
│   ├── friendly-match.ts  # Shared helper: spins up a Match inside the hidden "Friendly Matches" tournament
│   ├── supabase/     # Supabase client factories (client.ts browser, server.ts SSR)
│   ├── session.ts    # getSessionUser()/requireSessionUser() — resolves Supabase JWT → Player row
│   └── db.ts         # Prisma client singleton (important in dev to avoid exhausting connections on hot-reload)
├── types/index.ts    # Shared domain types, including SessionUser
├── validations/      # Zod schemas matching Server Action input shapes
└── middleware.ts      # Route protection — explicit allowlist of public path prefixes
```

### Server Actions pattern

Every mutation (and most reads) lives in `src/actions/*.ts`, one file per domain entity, marked `'use server'`. They return `ActionResult<T> = { success: true; data: T } | { success: false; error: string }` and call `requireSessionUser()` first. Inputs from forms are validated with Zod. Call `revalidatePath(...)` after mutations that affect cached Server Component data.

When adding a poll loop in a client component (several already exist — unread messages, challenge inbox, live game sync, conversation threads), wrap the call in `try/catch` and silently retry on the next tick. An uncaught rejection in one cycle has previously cascaded into a broken UI state with no visible error.

### Data model essentials

- **Player** — registered user. `role`: ADMIN / TOURNAMENT_MANAGER / PLAYER. Carries appearance/privacy prefs (`isPrivate`, `appearOffline`).
- **Tournament** → **TournamentMember** → **Match** → **MatchGame**. `Match.player1Id`/`player2Id` reference `TournamentMember.id`, not `Player.id` directly — this is what lets guest players (no account) work identically to registered ones. `TournamentMember.points/wins/losses` are a cache, updated atomically alongside game inserts; `MatchGame` rows are the audit log.
- **LiveGame** — real-time board state (JSON) for an online match, synced over a Supabase Realtime broadcast channel `live-game-{matchId}`. The DB row is the source of truth for reconnects/reloads; the broadcast is just a low-latency push to the other player's open tab.
- **"Friendly Matches"** — a hidden singleton system `Tournament` (`isSystem: true`) that both player-to-player **Challenges** and ranked **matchmaking** funnel into via `lib/friendly-match.ts`, so 1-on-1 games outside a real tournament reuse all the same Match/LiveGame/scoring infrastructure. `getOrCreateFriendlyTournament`/`getOrCreateMember` are implemented as upserts (not find-then-create) — two players accepting/matching at the same instant must not race into a unique-constraint crash.
- **Challenge** / **MatchmakingTicket** — invite-to-play and ranked-queue flows. Both funnel into `createFriendlyMatch`.
- **Message** — simple 1-on-1 DMs, unrelated to Challenge.
- **Follow** / **FollowRequest** — the social graph; "friend" = mutual follow, derived, not stored.

### Theming

CSS custom properties (HSL channel triples) in `globals.css`, consumed via Tailwind as `hsl(var(--x) / <alpha-value>)`. Two independent layers, both client-side via `localStorage` + a `data-*` attribute on `<html>` (set synchronously by an inline script in `app/layout.tsx` to avoid a flash of wrong theme):
- `data-theme` (dark/light) × `data-accent` (copper/jade/sapphire/crimson) — the original system, overrides just the `--gold*` family.
- `data-skin` — a newer, optional full-palette override (Club Noir, Luxury Wood, Marquetry, Royal Sapphire, Emerald Modern, Midnight Jade, Champagne) that redefines every surface/ink/accent variable at once and wins over the theme/accent combo via CSS specificity + source order. Picked in Settings → Appearance; "Custom" falls back to the theme/accent pickers.

### Backgammon engine (`src/lib/backgammon/`)

Pure TypeScript, no DB/React dependency — shared by Practice, Local Play, and Live matches. Legal move/sequence generation, a 0-ply heuristic AI (pip count, blot risk, made points; noise added at lower difficulties), and a best-move hint system (`bestSequence`, `notateSequence`, `explainPlay`). Board/dice visual themes are separate from the app's UI theming above and persist to `localStorage` independently.

### Key algorithms

- **Round robin** (`lib/tournament/round-robin.ts`): circle method, BYE placeholder for odd counts, seeded by points → wins → name.
- **Single elimination** (`lib/tournament/single-elimination.ts`): recursive seed ordering, two-pass match creation (create rows, then link `nextMatchId`), automatic winner advancement on completion.
- **Suggested matches** (`actions/match.ts → getSuggestedMatches`): scores unplayed pairs (100 if never played, penalized by point/win-rate gap), greedy non-overlapping selection, capped at `min(floor(n/2), 6)`.

### Auth

Supabase Auth (email/password + Google/Apple OAuth), session JWT in an httpOnly cookie. `lib/session.ts` resolves it to a `Player` row on every request. `middleware.ts` is an explicit allowlist of public route prefixes — anything not listed requires auth; the `(dashboard)` layout also independently re-checks `getSessionUser()` as a second line of defense.

## Known sharp edges

- **`DEPLOYMENT.md` contains a real database password in plaintext** as an example connection string. Treat it as compromised if this repo's history is ever made public, and prefer reading actual secrets from Vercel env vars / `.env` (gitignored), never from that doc.
- `ARCHITECTURE.md` describes an early, since-changed plan (phone+PIN auth, no realtime) — it's a historical planning doc, not current behavior. `Project Summary.md` is the more up-to-date feature/architecture overview; this file supersedes both for anything they disagree on.
- `title` attribute tooltips for inline error messages don't work on touch devices — surface errors as visible text instead (this was a real bug in the challenge/invite flow on mobile).
- Components that are "always mounted, hidden via CSS" per breakpoint (e.g. desktop sidebar vs. mobile bottom nav both rendering simultaneously) will double any polling hook used inside them unless that polling is lifted into a shared context/provider mounted once.
