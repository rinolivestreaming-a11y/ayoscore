# AAFI Football League Management System

A complete, professional football league management platform for youth leagues (U9, U11, U13, U16).

## 🚀 Quick Start

### 1. Setup Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** and run the SQL schema found in `js/supabase.js` (inside the comment block at the bottom)
4. Copy your **Project URL** and **anon public key** from Settings → API

### 2. Configure Credentials

Open `js/supabase.js` and replace:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. Deploy to Netlify

1. Upload this entire folder to Netlify (drag & drop at netlify.com)
2. Or connect your GitHub repo to Netlify for auto-deploy

---

## 📁 Project Structure

```
aafi-league-system/
├── index.html              # Homepage
├── standings.html          # League standings tables
├── fixtures.html           # Upcoming fixtures
├── results.html            # Match results
├── match-center.html       # Live match center
├── teams.html              # Team profiles
├── players.html            # Player cards
├── statistics.html         # Stats & analytics
├── tournament.html         # Tournament bracket
├── playoff.html            # Playoff system
├── news.html               # News articles
├── scoreboard.html         # Stadium scoreboard (/scoreboard)
├── admin.html              # Admin dashboard (/admin)
│
├── css/
│   ├── main.css            # Core styles & components
│   ├── dashboard.css       # Admin dashboard styles
│   ├── scoreboard.css      # Stadium scoreboard styles
│   └── bracket.css         # Tournament bracket styles
│
├── js/
│   ├── supabase.js         # Supabase config + DB helpers
│   ├── app.js              # Main app + utility functions
│   ├── live.js             # Live match + realtime updates
│   ├── standings.js        # Standings table + realtime
│   ├── schedule.js         # Round-robin schedule generator
│   ├── tournament.js       # Tournament bracket system
│   ├── playoff.js          # Playoff bracket system
│   ├── statistics.js       # Statistics + charts
│   ├── prediction.js       # AI match prediction
│   ├── excel-import.js     # Excel/CSV import
│   └── dragdrop.js         # Drag & drop interface
│
├── components/
│   └── navbar.js           # Navbar component
│
└── netlify.toml            # Netlify deployment config
```

---

## 🏆 Features

### Public Website
- **Home** – Hero banner, live scores, standings preview, top scorers, news
- **Standings** – Animated league tables for all 4 age groups with form indicators
- **Fixtures** – Upcoming matches by round and league
- **Results** – Past match results with scores
- **Match Center** – Live scores, events timeline, match statistics, lineup, AI prediction
- **Teams** – Club profiles with stats
- **Players** – Player cards with stats, filterable by position
- **Statistics** – Top scorers, assists, cards, charts
- **Tournament** – Visual knockout bracket
- **Playoff** – Top 4 playoff system with semi-finals and final
- **News** – League news and announcements
- **Scoreboard** – Fullscreen stadium display at `/scoreboard`

### Admin Dashboard (`/admin`)
| Section | Features |
|---|---|
| Dashboard | Stats overview, activity feed, charts |
| Leagues | View/manage all 4 leagues |
| Teams Manager | Add, edit, delete teams with search/filter |
| Players Manager | Full squad management |
| Matches Manager | Schedule, results, status management |
| Live Match Control | Real-time score updates, events, timer |
| Standings Manager | View/edit standings, recalculate |
| Tournament Manager | Create brackets, update results |
| Playoff Manager | Generate top-4 playoffs |
| Schedule Generator | Auto round-robin schedule |
| Statistics Editor | Edit match stats |
| Excel Import | Bulk import from .xlsx/.csv |
| News Manager | Publish/manage articles |

---

## ⚡ Realtime Features

When Supabase is connected, these update **instantly** across all viewers:
- Live match scores
- Match events (goals, cards, substitutions)
- Standings table
- Match center stats

---

## 📊 Excel Import Format

### Teams Sheet
| name | short_name | city | color | emoji |
|------|-----------|------|-------|-------|
| Thunder FC | THU | Manchester | #00d4ff | 🔵 |

### Players Sheet
| name | team | position | number | age | nationality |
|------|------|---------|--------|-----|------------|
| James Wilson | Thunder FC | ST | 9 | 15 | English |

### Schedule Sheet
| home | away | date | week | round | venue |
|------|------|------|------|-------|-------|
| Thunder FC | Eagles SC | 2024-09-01 | 1 | 1 | Stadium A |

---

## 🔧 League Structure

- **U9** – 10 teams
- **U11** – 10 teams  
- **U13** – 10 teams
- **U16** – 10 teams

Each season uses double round-robin format (home & away).
Top 4 teams qualify for playoffs.

---

## 🛠 Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime subscriptions
- **Hosting**: Netlify
- **Libraries**: 
  - Supabase JS v2
  - SheetJS (Excel import)
  - Google Fonts (Barlow Condensed)

---

## 📝 Notes

- The system works in **demo mode** without Supabase credentials (uses generated data)
- Once Supabase is configured, all data is live and persisted
- Admin dashboard has no authentication by default — add Supabase Auth for production use
- Scoreboard page is optimized for stadium screens and TV displays
