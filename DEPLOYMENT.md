# Deployment Guide — My Backgammon Club

## Overview

Full-stack Next.js 14 App Router application deployed on **Vercel** with a **Supabase** backend (PostgreSQL + Auth).

---

## Required Environment Variables

Set all of these in your Vercel project → Settings → Environment Variables.

| Variable | Description | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Supabase dashboard → Settings → API |
| `DATABASE_URL` | Supabase Postgres pooler URL (pgbouncer) | Supabase dashboard → Settings → Database → Connection pooling |
| `DIRECT_URL` | Supabase Postgres direct URL (for migrations) | Supabase dashboard → Settings → Database → Direct connection |

### Connection String Format

The password `tX9tX!GZDRzzFoTs!qkU` contains `!` characters. **URL-encode them as `%21`** in connection strings.

```
# Pooled (app queries — use pgbouncer):
DATABASE_URL="postgresql://postgres.PROJECT_ID:tX9tX%21GZDRzzFoTs%21qkU@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct (Prisma migrations only):
DIRECT_URL="postgresql://postgres:tX9tX%21GZDRzzFoTs%21qkU@db.PROJECT_ID.supabase.co:5432/postgres"
```

---

## Database Migration Steps

Run once before first deployment (or after schema changes):

```bash
# 1. Push schema to Supabase (applies all Prisma migrations)
npx prisma db push

# For a clean slate (WARNING: deletes all data):
npx prisma db push --force-reset

# 2. Verify schema
npx prisma studio
```

> **Note:** `prisma db push` uses `DIRECT_URL` (set in `.env` locally) to bypass the pgbouncer pooler, which does not support DDL statements.

---

## Vercel Deployment Steps

### First Deployment

1. Push your code to GitHub
2. Import the repository in [vercel.com/new](https://vercel.com/new)
3. Set **Framework Preset** to `Next.js` (auto-detected)
4. Add all environment variables (see table above)
5. Click **Deploy**

### Subsequent Deployments

```bash
# Push to main branch → Vercel auto-deploys
git push origin main

# Or trigger manually via Vercel CLI:
vercel --prod
```

---

## Build Configuration

Vercel uses these settings automatically from `package.json`:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

No custom build commands needed.

---

## Production Configuration Notes

### Authentication

- Uses **Supabase Auth** with email/password
- Sessions stored in secure httpOnly cookies via `@supabase/ssr`
- Root `middleware.ts` enforces auth on all non-public routes
- Dashboard layout has belt-and-suspenders `getSessionUser()` check

### Database

- **Prisma ORM** with connection pooling via Supabase pgbouncer
- `DATABASE_URL` uses pooler (port 6543) for all app queries
- `DIRECT_URL` uses direct connection (port 5432) for schema migrations only
- All writes use `$transaction` for atomic operations

### PDF Generation

- `@react-pdf/renderer` runs server-side in API routes
- Configured in `next.config.mjs` as `serverComponentsExternalPackages`
- PDF generation is on-demand (no caching) — typical 500ms-2s per report

### Performance

- All dashboard pages use `force-dynamic` for fresh data on every request
- Analytics computed in-memory from fetched data (no extra queries)
- Standings cached on `TournamentMember` rows, updated atomically on match completion

### Security Headers

Set in `next.config.mjs`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## Deployment Checklist

Before going live, verify each item:

### Environment
- [ ] All 4 environment variables set in Vercel
- [ ] `DATABASE_URL` uses pooler format with `pgbouncer=true`
- [ ] `DIRECT_URL` uses direct format (not pooler)
- [ ] Special characters in password are URL-encoded (`!` → `%21`)

### Database
- [ ] `npx prisma db push` run successfully against production Supabase
- [ ] All tables present (check via Supabase dashboard or `prisma studio`)
- [ ] At least one admin user registered

### Auth
- [ ] Supabase email confirmations configured (or disabled for dev)
- [ ] Email provider set up in Supabase if using confirmations
- [ ] CORS / redirect URLs set in Supabase Auth settings → URL Configuration

### Supabase Auth URL Configuration
In Supabase dashboard → Auth → URL Configuration:
```
Site URL: https://your-vercel-domain.vercel.app
Redirect URLs: https://your-vercel-domain.vercel.app/**
```

### Build
- [ ] `npm run build` passes locally with zero errors
- [ ] `npx tsc --noEmit` passes with zero errors

### Functionality
- [ ] Create tournament works
- [ ] Join tournament by code works
- [ ] Add guest player works
- [ ] Record match + games works
- [ ] Doubling cube offer/accept/decline works
- [ ] Standings update after match completion
- [ ] Analytics page loads
- [ ] CSV exports download correctly
- [ ] PDF report generates (may take 1-2 seconds)

---

## Known Limitations

1. **No real-time sync** — Live match scores require manual page refresh to see opponent's updates. Supabase Realtime subscriptions could solve this in a future phase.

2. **PDF generation speed** — `@react-pdf/renderer` takes 500ms-2s to generate a report. For very large tournaments (50+ players, 200+ matches) this could time out on Vercel's 10s function limit. Mitigation: move to background job or pre-generate.

3. **No email notifications** — No match reminders, invitation emails, or result notifications. Would require an email provider integration (Resend, SendGrid).

4. **Session expiry** — Supabase sessions expire after 1 hour by default. Users are automatically redirected to login. Configurable in Supabase dashboard.

5. **No file storage** — Avatar images use initials-based avatars. Adding photo uploads would require Supabase Storage integration.

6. **Single tournament per match** — Matches are always associated with exactly one tournament. Multi-tournament player profiles (aggregate career stats) are not supported.

---

## Recommended Future Roadmap (Phase 7+)

### Phase 7 — Real-Time & Notifications
- Supabase Realtime subscriptions for live score updates (no refresh needed)
- In-app notifications for match invitations and results
- Push notifications (PWA)

### Phase 8 — Advanced Tournament Formats
- Single/double elimination bracket visualization
- Swiss system pairing algorithm
- Round-robin schedule generator
- Tiebreaker configuration

### Phase 9 — Player Accounts & Profiles
- Global player profiles (cross-tournament career stats)
- ELO/rating system
- Tournament history across all events
- Player search and invite by email

### Phase 10 — Club Management
- Multi-club support with club admin roles
- Club leaderboards
- Club vs. club tournaments
- Subscription/membership management

### Phase 11 — Mobile App
- React Native / Expo companion app
- Offline match recording (sync when online)
- Board position annotation

### Phase 12 — AI Features
- Opening classification auto-detection from game description
- Match difficulty prediction
- Personalized training recommendations
- Post-match analysis summaries

---

## Project Architecture Summary

```
src/
  app/
    (auth)/           # /login, /register — unauthenticated routes
    (dashboard)/      # All authenticated routes
      tournaments/
        [id]/
          page.tsx              # Tournament detail
          analytics/page.tsx    # Analytics dashboard
          matches/
            page.tsx            # Match list
            new/page.tsx        # Create match
            [matchId]/page.tsx  # Live match screen
          players/
            page.tsx            # Player management
            [memberId]/page.tsx # Player profile + analytics
          standings/page.tsx    # Full standings
    api/
      tournaments/[id]/export/
        standings/route.ts    # CSV standings
        matches/route.ts      # CSV match history
        players/route.ts      # CSV player stats
        report/route.ts       # PDF tournament report

  actions/          # Server Actions (all DB mutations + queries)
    analytics.ts
    match.ts
    player.ts
    tournament.ts

  components/
    analytics/        # Analytics UI + Recharts charts
    export/           # Export menu + PDF document
    layout/           # AppShell, navigation
    match/            # MatchScreen, ScoreBoard, DoublingCube, etc.
    players/          # PlayerRoster, PlayerCard
    tournament/       # TournamentOverview, TournamentCard, dialogs
    ui/               # Design system primitives (Button, Badge, etc.)

  lib/
    analytics.ts      # Pure computation engine (no DB)
    csv.ts            # CSV generation utilities
    db.ts             # Prisma singleton
    session.ts        # Supabase session helpers
    supabase/         # Supabase client factories
    utils.ts          # cn(), etc.

  types/index.ts      # All domain types
  validations/        # Zod schemas
  middleware.ts       # Route protection
  
prisma/
  schema.prisma       # Database schema

Key dependencies:
  next@14, react@18, typescript
  @prisma/client, prisma
  @supabase/ssr, @supabase/supabase-js
  recharts
  @react-pdf/renderer
  @radix-ui/react-slot, @radix-ui/react-dialog, @radix-ui/react-select
  lucide-react
  zod
  class-variance-authority, clsx, tailwind-merge
```
