# My Backgammon Club — Project Summary

## Overview

A full-featured backgammon club management platform — tournaments, live matches, practice vs AI, analytics, and social features. Built for real clubs to run their own competitions online.

**Live site:** https://my-backgammon-club.vercel.app  
**GitHub:** https://github.com/tomer1973-tech/my-backgammon-club  
**Version:** 2.0.0

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 + CSS custom properties |
| Database | Supabase Postgres (via Prisma ORM) |
| Auth | Supabase Auth (email/password, Google OAuth, Apple OAuth, phone) |
| Realtime | Supabase Realtime (broadcast channels) |
| ORM | Prisma 5 (`prisma db push`, no migration files) |
| Deployment | Vercel (`npx vercel deploy --prod --yes`) |
| UI icons | Lucide React |
| Charts | Recharts |
| PDF export | @react-pdf/renderer |
| Validation | Zod |

---

## Features

### Tournaments
- **Multiple formats:** Round Robin, Single Elimination, Double Elimination (UI placeholder), Swiss (UI placeholder)
- **Auto-scheduling:**
  - Round Robin: circle-method algorithm, seeded by player ranking/performance, handles odd player counts via bye rounds
  - Single Elimination: standard bracket with seeded draw, byes for non-power-of-2, automatic winner advancement to next round
- **Suggested matches:** matchmaking engine scores pairs by freshness (never played = priority) and standings closeness; greedy non-overlapping pair selection, capped at `min(floor(n/2), 6)` suggestions
- **Lifecycle:** DRAFT → ACTIVE → COMPLETED → ARCHIVED
- **Player management:** Add registered players or guests; player-count banner shows X/max and spots remaining
- **Standings:** Live points table (updated atomically on each match completion)
- **Export:** CSV players, CSV matches, PDF report, standings

### Matches
- **Match structure:** Race to target score; each game awards `cubeValue × gameTypeMultiplier` points
- **Doubling cube:** Full doubling cube support (offer/accept/decline)
- **Game types:** Normal (×1), Gammon (×2), Backgammon (×3)
- **Live play:** Real-time online matches via Supabase Realtime broadcast (`live-game-{matchId}`)
- **Local play:** Two players on the same device
- **Match history:** Full game log per match
- **Social:** Match likes
- **Bracket awareness:** Null player slots ("TBD") for unplayed bracket rounds; automatic winner advancement on completion

### Backgammon Board (shared engine + UI)
- **Pure TypeScript engine** (`src/lib/backgammon/`): board state, legal move generation, dice, full sequence enumeration, bear-off, hit detection
- **AI opponent** (heuristic 0-ply evaluator):
  - Scores positions on pip count, made points, blot safety, bar/borne-off count
  - Three difficulty levels: Easy / Medium / Hard (noise added to lower difficulties)
- **Best-move hint system:**
  - `bestSequence` — finds the highest-scoring full legal sequence continuing current moves played
  - `notateSequence` — standard notation (e.g. `8/5 6/5`, `bar/20*`)
  - `explainPlay` — plain-language reason (e.g. "Makes the 5-point and hits a blot.")
- **Themes:** 5 board themes (Classic, Emerald, Midnight, Crimson, Slate) × 5 dice themes (Ivory, Gold, Crimson, Onyx, Azure); CSS custom properties; persisted to `localStorage`; shared across Practice, Local Play, and Live matches
- **Animations:** Checker glide (FLIP-style, `useLayoutEffect` + ghost element), dice roll-in (`dice-in` keyframe spring)
- **Auto-pass:** When a player has no legal moves, the turn passes automatically after 1.4s
- **UI:** Luxury board aesthetic — premium triangle gradients, 3D checkers with bevel/gloss, drilled dice pips, felt texture, gold frame hairline

### Practice vs AI
- Full board vs configurable AI difficulty
- TurnBanner: two-sided You/AI indicator with active highlight
- Hint button: shows best full sequence with notation + "why" explanation + glowing checker / gold-dot target on board
- Customize board and dice themes
- Undo move

### Rules & Learning
- Full backgammon rules reference page
- Strategy guides (multiple articles)
- Lessons library with per-lesson pages

### Analytics
- Per-tournament analytics dashboard: win/loss chart, opening trends, match momentum
- Player analytics: personal stats, head-to-head records
- Global leaderboard
- Opening type classification (Running Game, Blitz, Prime vs Prime, Back Game, Holding Game, Anchor Game)

### Social
- Follow / unfollow players (with follow requests for private accounts)
- Friend groups
- Match likes
- Player profiles with bio, avatar, privacy setting

### Admin
- User management (suspend/unsuspend, role assignment)
- Platform-wide player table

---

## Architecture

### Directory Structure

```
src/
├── actions/          # Next.js Server Actions (auth, match, player, tournament, analytics, …)
├── app/
│   ├── (auth)/       # Login, register, forgot-password, reset, verify-email
│   ├── (dashboard)/  # Main app (tournaments, matches, players, standings, analytics, admin, …)
│   ├── api/          # REST routes (tournament export: players, matches, report, standings)
│   ├── play/         # Local Play page
│   ├── practice/     # Practice vs AI page
│   ├── quick-game/   # Quick match (no tournament)
│   └── lessons/      # Lesson content pages
├── components/
│   ├── backgammon/   # BackgammonBoard, BoardCustomizeButton, useBoardThemes hook
│   ├── match/        # MatchCard, MatchScreen, LiveMatchClient, SuggestedMatches, …
│   ├── practice/     # PracticeClient (AI game loop)
│   ├── play/         # PlayClient (local 2-player loop)
│   ├── tournament/   # TournamentCard, StatusControls, CreateWizard, …
│   ├── analytics/    # Charts, dashboards, stat cards
│   ├── auth/         # Login/register forms, OAuth buttons
│   ├── players/      # AddPlayerDialog, PlayerRoster
│   ├── social/       # FollowButton, LikeButton, ShareButton, FriendGroupsManager
│   ├── settings/     # ProfileForm, AvatarPicker, PasswordSection
│   └── ui/           # Button, Dialog, Input, Select, Badge, Card, Avatar, Skeleton, …
├── lib/
│   ├── backgammon/   # Engine: board.ts, moves.ts, dice.ts, ai.ts, themes.ts, types.ts
│   ├── tournament/   # round-robin.ts, single-elimination.ts
│   ├── supabase/     # client.ts, server.ts, middleware.ts
│   ├── db.ts         # Prisma client singleton
│   └── …             # utils, stats, analytics, csv, session, feature-flags, content
├── types/            # Shared TypeScript types (MatchRow, etc.)
└── validations/      # Zod schemas for all Server Action inputs
```

### Data Model (key models)

- **Player** — registered user (supabaseUid, role: ADMIN / TOURNAMENT_MANAGER / PLAYER)
- **Tournament** — format, status, maxPlayers, matchLength, pointsPerWin
- **TournamentMember** — links Player (or guest) to Tournament; caches points/wins/losses
- **Match** — contest between two TournamentMembers; race to targetScore; supports bracket fields (round, bracket, bracketSlot, nextMatchId, nextMatchSlot); player1Id/player2Id nullable for TBD bracket slots
- **MatchGame** — individual game within a Match (cubeValue × gameTypeMultiplier points)
- **LiveGame** — real-time board state for online match (JSON board, dice, movesPlayed); synced via Supabase Realtime
- **Game** — legacy standalone game (outside match context)
- **Follow / FollowRequest / MatchLike / FriendGroup** — social graph

### Server Actions Pattern

All mutations go through `src/actions/*.ts` files marked `'use server'`. They return `ActionResult<T> = { success: true; data: T } | { success: false; error: string }`. Inputs are validated with Zod schemas from `src/validations/index.ts`. Paths are revalidated with `revalidatePath` after mutations.

### Realtime Architecture

Live matches use Supabase Realtime broadcast channels (`live-game-{matchId}`). On every move/action the acting player's client calls a Server Action, gets back the new `LiveGameData`, updates local state, and broadcasts it to the other player's client. The database row is the source of truth for reconnects and reloads.

---

## Key Algorithms

### Round Robin Scheduling (`src/lib/tournament/round-robin.ts`)
Circle method. For n players (even: n-1 rounds, odd: n rounds). One player is fixed, the rest rotate. Handles odd counts via a BYE placeholder. Members seeded by points → wins → name before scheduling.

### Single Elimination Bracket (`src/lib/tournament/single-elimination.ts`)
Standard seed ordering via recursive `seedOrder(size)`. Byes resolved as pre-filled slots. Two-pass creation: first pass creates all match rows, second pass links `nextMatchId` by key. Winner advancement fires automatically when a match completes.

### Matchmaking Suggestions (`src/actions/match.ts → getSuggestedMatches`)
Scores each unplayed pair: 100 if never played, minus `pointDiff × 2`, minus `winRateDiff × 20`. Excludes pairs with active/pending matches. Greedy non-overlapping selection (each player appears in at most one suggestion). Capped at `min(floor(n/2), 6)`.

### AI Heuristic Evaluator (`src/lib/backgammon/ai.ts`)
0-ply evaluator (no lookahead). Scores: pip-count delta, bar penalty, borne-off bonus, made-point bonus (weighted by board region), blot risk (shots/36 × pip loss × 1.5). Noise added at Easy/Medium difficulties.

---

## Deployment

1. Local dev: `npm run dev` (port 3000) or Claude Preview server (port 3010)
2. Typecheck: `npx tsc --noEmit` (do NOT run `npm run build` while dev server is live — corrupts `.next`)
3. Deploy: `git add … && git commit -m "…" && git push && npx vercel deploy --prod --yes`
4. Database schema changes: `npm run db:push` (uses `prisma db push` — no migration files)

### Environment Variables
`.env.local` (gitignored):
- `DATABASE_URL` — Supabase Postgres connection string (pooled)
- `DIRECT_URL` — Supabase Postgres direct connection (for Prisma migrations)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## In Progress / Deferred

| Item | Status |
|---|---|
| Hint feature in Local Play (`play-client.tsx`) | In progress |
| Full best-sequence notation + "why" explanation in Practice hint | In progress (code written, not yet verified) |
| Double Elimination auto-scheduling | Deferred — user agreed to defer |
| Swiss format auto-scheduling | Not started |
