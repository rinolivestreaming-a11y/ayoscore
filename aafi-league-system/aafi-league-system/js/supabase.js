// AAFI League System - Supabase Configuration
// Replace with your actual Supabase credentials

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other modules
window.AAFI = window.AAFI || {};
window.AAFI.supabase = supabase;

// Database table names
const TABLES = {
  leagues: 'leagues',
  teams: 'teams',
  players: 'players',
  matches: 'matches',
  events: 'match_events',
  statistics: 'match_statistics',
  standings: 'standings',
  tournaments: 'tournaments',
  brackets: 'tournament_brackets',
  playoffs: 'playoffs',
  news: 'news'
};

window.AAFI.TABLES = TABLES;

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

// Generic query helpers
const db = {
  async select(table, query = {}) {
    let q = supabase.from(table).select(query.select || '*');
    if (query.eq) Object.entries(query.eq).forEach(([k, v]) => { q = q.eq(k, v); });
    if (query.order) q = q.order(query.order.column, { ascending: query.order.ascending ?? true });
    if (query.limit) q = q.limit(query.limit);
    if (query.single) q = q.single();
    const { data, error } = await q;
    if (error) console.error(`DB Error [${table}]:`, error);
    return data;
  },

  async insert(table, data) {
    const { data: result, error } = await supabase.from(table).insert(data).select();
    if (error) console.error(`DB Insert Error [${table}]:`, error);
    return result;
  },

  async update(table, data, match) {
    let q = supabase.from(table).update(data);
    Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
    const { data: result, error } = await q.select();
    if (error) console.error(`DB Update Error [${table}]:`, error);
    return result;
  },

  async delete(table, match) {
    let q = supabase.from(table).delete();
    Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
    const { error } = await q;
    if (error) console.error(`DB Delete Error [${table}]:`, error);
    return !error;
  },

  async upsert(table, data, onConflict) {
    const opts = onConflict ? { onConflict } : {};
    const { data: result, error } = await supabase.from(table).upsert(data, opts).select();
    if (error) console.error(`DB Upsert Error [${table}]:`, error);
    return result;
  }
};

window.AAFI.db = db;

// ─── REALTIME SUBSCRIPTIONS ───────────────────────────────────────────────────

const realtime = {
  subscriptions: {},

  subscribe(channel, table, callback, filter = null) {
    const config = { event: '*', schema: 'public', table };
    if (filter) config.filter = filter;

    const sub = supabase
      .channel(channel)
      .on('postgres_changes', config, (payload) => {
        callback(payload);
      })
      .subscribe();

    this.subscriptions[channel] = sub;
    return sub;
  },

  unsubscribe(channel) {
    if (this.subscriptions[channel]) {
      supabase.removeChannel(this.subscriptions[channel]);
      delete this.subscriptions[channel];
    }
  },

  unsubscribeAll() {
    Object.keys(this.subscriptions).forEach(ch => this.unsubscribe(ch));
  }
};

window.AAFI.realtime = realtime;

// ─── STANDINGS RECALCULATION ──────────────────────────────────────────────────

async function recalculateStandings(leagueId) {
  try {
    const matches = await db.select(TABLES.matches, {
      eq: { league_id: leagueId, status: 'finished' }
    });

    if (!matches) return;

    const standings = {};

    matches.forEach(match => {
      const home = match.home_team_id;
      const away = match.away_team_id;
      const hg = match.home_score || 0;
      const ag = match.away_score || 0;

      [home, away].forEach(teamId => {
        if (!standings[teamId]) {
          standings[teamId] = { team_id: teamId, league_id: leagueId, played: 0, won: 0, drawn: 0, lost: 0, goals_for: 0, goals_against: 0, goal_difference: 0, points: 0 };
        }
      });

      standings[home].played++;
      standings[away].played++;
      standings[home].goals_for += hg;
      standings[home].goals_against += ag;
      standings[away].goals_for += ag;
      standings[away].goals_against += hg;

      if (hg > ag) {
        standings[home].won++;
        standings[home].points += 3;
        standings[away].lost++;
      } else if (hg === ag) {
        standings[home].drawn++;
        standings[home].points++;
        standings[away].drawn++;
        standings[away].points++;
      } else {
        standings[away].won++;
        standings[away].points += 3;
        standings[home].lost++;
      }
    });

    // Update goal differences
    Object.values(standings).forEach(s => {
      s.goal_difference = s.goals_for - s.goals_against;
    });

    // Upsert all standings
    const rows = Object.values(standings);
    if (rows.length > 0) {
      await db.upsert(TABLES.standings, rows, 'team_id,league_id');
    }
  } catch (err) {
    console.error('Standings recalculation error:', err);
  }
}

window.AAFI.recalculateStandings = recalculateStandings;

// ─── DATABASE SCHEMA SQL (run in Supabase SQL editor) ────────────────────────
// Store schema in a comment for reference
/*
-- Run this SQL in your Supabase project to set up the database:

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('U9','U11','U13','U16')),
  season TEXT NOT NULL DEFAULT '2024-25',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT,
  color TEXT DEFAULT '#00d4ff',
  logo_emoji TEXT DEFAULT '⚽',
  city TEXT,
  founded INTEGER,
  stadium TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  number INTEGER,
  age INTEGER,
  nationality TEXT,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  match_date TIMESTAMPTZ,
  round INTEGER,
  week INTEGER,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','finished','postponed')),
  minute INTEGER DEFAULT 0,
  venue TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('goal','assist','yellow_card','red_card','substitution','penalty','own_goal')),
  player_id UUID REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  minute INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  shots INTEGER DEFAULT 0,
  shots_on_target INTEGER DEFAULT 0,
  possession INTEGER DEFAULT 50,
  corners INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  passes INTEGER DEFAULT 0,
  tackles INTEGER DEFAULT 0,
  UNIQUE(match_id, team_id)
);

CREATE TABLE standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  form TEXT DEFAULT '',
  UNIQUE(league_id, team_id)
);

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'knockout' CHECK (type IN ('knockout','group_knockout')),
  size INTEGER DEFAULT 8 CHECK (size IN (8,16,32)),
  status TEXT DEFAULT 'pending',
  current_round TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  round TEXT NOT NULL,
  round_order INTEGER,
  match_order INTEGER,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  winner_id UUID REFERENCES teams(id),
  status TEXT DEFAULT 'scheduled',
  match_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE playoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE playoff_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playoff_id UUID REFERENCES playoffs(id) ON DELETE CASCADE,
  round TEXT NOT NULL CHECK (round IN ('semi_final','final')),
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  winner_id UUID REFERENCES teams(id),
  status TEXT DEFAULT 'scheduled',
  match_date TIMESTAMPTZ
);

CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  category TEXT DEFAULT 'general',
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "public read leagues" ON leagues FOR SELECT USING (true);
CREATE POLICY "public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "public read players" ON players FOR SELECT USING (true);
CREATE POLICY "public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "public read events" ON match_events FOR SELECT USING (true);
CREATE POLICY "public read statistics" ON match_statistics FOR SELECT USING (true);
CREATE POLICY "public read standings" ON standings FOR SELECT USING (true);
CREATE POLICY "public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "public read brackets" ON tournament_brackets FOR SELECT USING (true);
CREATE POLICY "public read playoffs" ON playoffs FOR SELECT USING (true);
CREATE POLICY "public read playoff_matches" ON playoff_matches FOR SELECT USING (true);
CREATE POLICY "public read news" ON news FOR SELECT USING (true);

-- Enable realtime for live score updates
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE standings;
ALTER PUBLICATION supabase_realtime ADD TABLE match_statistics;
*/

console.log('✅ AAFI Supabase initialized');
