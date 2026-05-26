-- Run this in Supabase → SQL Editor → New query
-- Allows adding guest players (by name only, no account required)

-- 1. Change tournament_members primary key to a surrogate id
ALTER TABLE tournament_members DROP CONSTRAINT tournament_members_pkey;
ALTER TABLE tournament_members ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE tournament_members DROP CONSTRAINT IF EXISTS tournament_members_player_id_fkey;
ALTER TABLE tournament_members ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE tournament_members ADD PRIMARY KEY (id);

-- Prevent the same registered player appearing twice in a tournament
CREATE UNIQUE INDEX IF NOT EXISTS uq_member ON tournament_members(tournament_id, player_id)
  WHERE player_id IS NOT NULL;

-- 2. Drop FK constraints on games so guest UUIDs are accepted
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_winner_id_fkey;
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_loser_id_fkey;
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_recorded_by_fkey;
