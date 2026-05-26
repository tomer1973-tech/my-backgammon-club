-- Run this in: Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- Safe to re-run: drops any partial tables first

DROP TABLE IF EXISTS games               CASCADE;
DROP TABLE IF EXISTS tournament_members  CASCADE;
DROP TABLE IF EXISTS tournaments         CASCADE;
DROP TABLE IF EXISTS players             CASCADE;

-- Players (extra profile data on top of auth.users)
CREATE TABLE players (
  id    uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone text UNIQUE NOT NULL,
  name  text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tournaments
CREATE TABLE tournaments (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name           text NOT NULL,
  location       text DEFAULT '',
  code           text UNIQUE NOT NULL,
  points_per_win integer DEFAULT 1,
  created_by     uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

-- Tournament members (join table)
CREATE TABLE tournament_members (
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     uuid REFERENCES players(id)     ON DELETE CASCADE,
  player_name   text NOT NULL,
  player_phone  text NOT NULL,
  points        integer DEFAULT 0,
  wins          integer DEFAULT 0,
  losses        integer DEFAULT 0,
  joined_at     timestamptz DEFAULT now(),
  PRIMARY KEY (tournament_id, player_id)
);

-- Games
CREATE TABLE games (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  winner_id     uuid REFERENCES players(id) ON DELETE SET NULL,
  winner_name   text NOT NULL,
  loser_id      uuid REFERENCES players(id) ON DELETE SET NULL,
  loser_name    text NOT NULL,
  multiplier    integer DEFAULT 1,
  points        integer NOT NULL,
  notes         text DEFAULT '',
  status        text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  recorded_by   uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- Enable real-time for live standings & game updates
ALTER TABLE tournament_members REPLICA IDENTITY FULL;
ALTER TABLE games               REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE tournament_members, games, tournaments;

-- Row Level Security (allow all authenticated users for now — tighten later)
ALTER TABLE players            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE games              ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON players            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON tournaments        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON tournament_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON games              FOR ALL USING (true) WITH CHECK (true);
