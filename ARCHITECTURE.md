# Backgammon Tournament Platform — Architecture Spec

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, file-based routing, Server Actions, single deployment unit |
| Language | TypeScript (strict) | Type safety across DB → server → client boundary |
| ORM | Prisma | Type-safe queries, schema-as-code, migrations, no raw SQL |
| Database | PostgreSQL via Supabase | Existing project; Supabase handles hosting, backups, connection pooling |
| Auth | Supabase Auth | Phone-as-email + SHA-256 PIN. Already working; no reason to change |
| Styling | Tailwind CSS | Utility-first, consistent design tokens, minimal bundle |
| Validation | Zod | Schema validation at server action boundaries; infers TypeScript types |
| State | React built-ins + URL state | Avoid Zustand/Redux until complexity demands it |
| Data fetching | Server Components (initial) + polling for live data | No websocket complexity; React Query `refetchInterval` handles live |

## Data Flow

```
Browser (Client Component)
  │
  ├─► Server Action (validates with Zod)
  │     │
  │     ├─► Prisma $transaction
  │     │     ├── Insert game
  │     │     ├── Update winner stats (+points, +wins)
  │     │     └── Update loser stats  (-points, +losses)
  │     │
  │     └─► revalidatePath('/t/[id]')  ← Next.js cache invalidation
  │
  └─► Server Component re-renders with fresh data
```

No manual state updates. No optimistic UI complexity. The server is the source of truth;
`revalidatePath` triggers a re-fetch of the current page's server components.

## Key Design Decisions

### 1. Games reference TournamentMember, not Player
`games.winner_id` and `games.loser_id` point to `tournament_members.id`
(the surrogate UUID PK), not `players.id`. This means:
- Guest players work identically to registered players
- No nullable FK hacks
- Stats queries are symmetric for both player types

### 2. Stats are cached, not computed
`tournament_members.points/wins/losses` are updated atomically with each game
insert/delete via Prisma `$transaction`. This gives O(1) standings reads.
The `games` table is the audit log; `tournament_members` stats are the cache.

### 3. No status / confirmation flow
Games are immediately confirmed on record. The pending/confirmation UX added
complexity with no user benefit (the same person recording a loss confirms it).

### 4. Gammon ≠ Cube
`games.multiplier`  = doubling cube value (1 | 2 | 4 | 8 | 16 | 32 | 64)
`games.game_type`   = outcome type (NORMAL | GAMMON | BACKGAMMON)
These are orthogonal. A gammon at cube 4 = `multiplier=4, gameType=GAMMON`.
Points = `pointsPerWin × multiplier × gameTypeMultiplier`.

### 5. Soft delete on Tournament
`tournaments.deleted_at` enables deletion from the lobby view while preserving
the full game history for any member who still has the URL. Hard-delete via
admin only (cascade drops members + games).

## Folder Conventions

```
app/               Next.js App Router pages and layouts
components/ui/     Primitive components (no business logic)
components/*/      Domain components (tournament/, game/, stats/)
actions/           Server Actions (one file per domain entity)
lib/               Pure utilities (db.ts, auth.ts, stats.ts, utils.ts)
validations/       Zod schemas (match Server Action input shapes)
types/             TypeScript domain interfaces
prisma/            schema.prisma + migrations
```

## Auth Flow

1. User submits phone + PIN on `/login`
2. Server Action cleans phone, hashes PIN with SHA-256
3. Calls `supabase.auth.signInWithPassword({ email: phone@bgclub.app, password: hash })`
4. On success, Supabase sets an httpOnly cookie with the session JWT
5. Subsequent requests: `createServerClient()` reads the cookie and verifies the JWT
6. `lib/session.ts` resolves the Supabase UID → `players` row → `SessionUser`
7. All Server Actions call `getSessionUser()` first; throw if unauthenticated

## Environment Variables

```
DATABASE_URL=          # Supabase pooled connection (for Prisma queries)
DIRECT_URL=            # Supabase direct connection (for Prisma migrations)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Phase Map

| Phase | Deliverables |
|---|---|
| 1 ✅ | Audit, architecture design, Prisma schema, domain types, stats library |
| 2 | Next.js scaffold, Prisma migration, auth (login/register), session middleware |
| 3 | Lobby screen (tournament list, create, join, delete) |
| 4 | Tournament dashboard shell (layout, routing, data loading) |
| 5 | Game recording wizard (opponent → result → cube → game type → notes) |
| 6 | Standings, Head-to-Head, Analytics tabs |
| 7 | Design system (tokens, primitive components, backgammon-inspired theme) |
| 8 | Polish (loading states, error boundaries, empty states, animations) |
