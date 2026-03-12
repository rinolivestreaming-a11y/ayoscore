// AAFI League System - Main Application
(function() {
  'use strict';

  // ─── CONSTANTS ──────────────────────────────────────────────────────────────
  const LEAGUES = ['U9', 'U11', 'U13', 'U16'];
  const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CM', 'CDM', 'CAM', 'LW', 'RW', 'ST', 'CF'];

  // ─── DEMO DATA (fallback when no Supabase) ──────────────────────────────────
  const DEMO_TEAMS = {
    'U9':  ['Thunder FC', 'Eagles SC', 'Lions FC', 'Phoenix AC', 'Sharks FC', 'Tigers SC', 'Wolves FC', 'Hawks AC', 'Storm FC', 'Blaze SC'],
    'U11': ['Arsenal Academy', 'Chelsea Youth', 'City Academy', 'United Juniors', 'Rovers FC', 'Palace Youth', 'Spurs Academy', 'Gunners FC', 'Blues SC', 'Reds FC'],
    'U13': ['Northern FC', 'Southern AC', 'Eastern SC', 'Western FC', 'Central AC', 'Riverside SC', 'Hillside FC', 'Lakeside AC', 'Forest SC', 'Mountain FC'],
    'U16': ['Premier FC', 'Elite AC', 'Stars SC', 'Royals FC', 'Knights AC', 'Warriors SC', 'Champions FC', 'United FC', 'City SC', 'Athletic AC']
  };

  const TEAM_EMOJIS = ['🔵', '🔴', '🟡', '🟢', '🟠', '🟣', '⚫', '⚪', '🔶', '🔷'];

  window.AAFI = window.AAFI || {};
  window.AAFI.DEMO_TEAMS = DEMO_TEAMS;
  window.AAFI.LEAGUES = LEAGUES;
  window.AAFI.POSITIONS = POSITIONS;
  window.AAFI.TEAM_EMOJIS = TEAM_EMOJIS;

  // ─── TOAST NOTIFICATIONS ────────────────────────────────────────────────────
  function showToast(title, body = '', type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const colors = { info: '#00d4ff', success: '#00e676', warning: '#ffd600', error: '#ff1744', goal: '#00e676' };
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', goal: '⚽' };

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderColor = colors[type] || colors.info;
    toast.innerHTML = `
      <div class="toast-title" style="color:${colors[type] || colors.info}">${icons[type] || icons.info} ${title}</div>
      ${body ? `<div class="toast-body">${body}</div>` : ''}
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  window.AAFI.showToast = showToast;

  // ─── NAVBAR ACTIVE LINK ──────────────────────────────────────────────────────
  function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (href === path || (path === 'index.html' && href === 'index.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // ─── UTILITY FUNCTIONS ───────────────────────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return 'TBD';
    return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
  }

  function getStatusBadge(status, minute = 0) {
    const map = {
      live: `<span class="match-status status-live"><span class="live-dot"></span>${minute ? minute + "'" : 'LIVE'}</span>`,
      scheduled: `<span class="match-status status-upcoming">Upcoming</span>`,
      finished: `<span class="match-status status-finished">FT</span>`,
      postponed: `<span class="match-status status-finished">PPD</span>`
    };
    return map[status] || map.scheduled;
  }

  function getTeamInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
  }

  function getFormBadges(form) {
    if (!form) return '';
    return form.split('').slice(-5).map(f => {
      const cls = f === 'W' ? 'form-w' : f === 'D' ? 'form-d' : 'form-l';
      return `<span class="form-badge ${cls}">${f}</span>`;
    }).join('');
  }

  function getRankClass(pos) {
    if (pos === 1) return 'gold';
    if (pos === 2) return 'silver';
    if (pos === 3) return 'bronze';
    return '';
  }

  function getQualClass(pos) {
    if (pos <= 1) return 'qual-cl';
    if (pos <= 2) return 'qual-el';
    if (pos >= 9) return 'qual-rel';
    return '';
  }

  window.AAFI.utils = { formatDate, formatTime, formatDateTime, getStatusBadge, getTeamInitials, getFormBadges, getRankClass, getQualClass };

  // ─── GENERATE DEMO STANDINGS ─────────────────────────────────────────────────
  function generateDemoStandings(league) {
    const teams = DEMO_TEAMS[league] || DEMO_TEAMS['U11'];
    return teams.map((name, i) => {
      const played = Math.floor(Math.random() * 10) + 8;
      const won = Math.floor(Math.random() * played * 0.7);
      const drawn = Math.floor(Math.random() * (played - won) * 0.4);
      const lost = played - won - drawn;
      const gf = won * 2 + drawn + Math.floor(Math.random() * 10);
      const ga = lost * 2 + drawn + Math.floor(Math.random() * 8);
      const forms = 'WWDLWWDWLW';
      return {
        id: i,
        team_id: i,
        team_name: name,
        team_emoji: TEAM_EMOJIS[i % TEAM_EMOJIS.length],
        played,
        won,
        drawn,
        lost,
        goals_for: gf,
        goals_against: ga,
        goal_difference: gf - ga,
        points: won * 3 + drawn,
        form: forms.slice(i % 5, (i % 5) + 5)
      };
    }).sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference);
  }

  window.AAFI.generateDemoStandings = generateDemoStandings;

  // ─── GENERATE DEMO MATCHES ───────────────────────────────────────────────────
  function generateDemoMatches(league, count = 6) {
    const teams = DEMO_TEAMS[league] || DEMO_TEAMS['U11'];
    const statuses = ['finished', 'finished', 'finished', 'live', 'scheduled', 'scheduled'];
    const matches = [];

    for (let i = 0; i < count; i++) {
      const hi = Math.floor(Math.random() * teams.length);
      let ai = Math.floor(Math.random() * teams.length);
      while (ai === hi) ai = Math.floor(Math.random() * teams.length);

      const status = statuses[i % statuses.length];
      const hg = status !== 'scheduled' ? Math.floor(Math.random() * 5) : 0;
      const ag = status !== 'scheduled' ? Math.floor(Math.random() * 4) : 0;

      const date = new Date();
      date.setDate(date.getDate() + (i - 3) * 7);

      matches.push({
        id: `demo-${i}`,
        league_id: league,
        home_team: { name: teams[hi], emoji: TEAM_EMOJIS[hi] },
        away_team: { name: teams[ai], emoji: TEAM_EMOJIS[ai] },
        home_score: hg,
        away_score: ag,
        status,
        minute: status === 'live' ? Math.floor(Math.random() * 90) + 1 : 0,
        match_date: date.toISOString(),
        week: Math.floor(i / 2) + 1
      });
    }

    return matches;
  }

  window.AAFI.generateDemoMatches = generateDemoMatches;

  // ─── GENERATE DEMO SCORERS ───────────────────────────────────────────────────
  function generateDemoScorers(league) {
    const teams = DEMO_TEAMS[league] || DEMO_TEAMS['U11'];
    const names = ['James Wilson', 'Carlos Martinez', 'Ahmed Hassan', 'Luke Thomas', 'David Kim', 'Ryan Johnson', 'Marco Silva', 'Alex Brown', 'Tyler Davis', 'Jordan Lee'];

    return names.map((name, i) => ({
      id: i,
      name,
      team: teams[Math.floor(Math.random() * teams.length)],
      goals: Math.floor(Math.random() * 15) + 3 - i,
      assists: Math.floor(Math.random() * 8),
      matches: Math.floor(Math.random() * 10) + 8
    })).sort((a, b) => b.goals - a.goals);
  }

  window.AAFI.generateDemoScorers = generateDemoScorers;

  // ─── MATCH CARD COMPONENT ────────────────────────────────────────────────────
  function renderMatchCard(match) {
    const home = match.home_team;
    const away = match.away_team;
    const utils = window.AAFI.utils;

    return `
      <div class="match-card" onclick="location.href='match-center.html?id=${match.id}'">
        <div class="match-card-header">
          <span class="match-league-badge">${match.league_id || 'League'} · Week ${match.week || '-'}</span>
          ${utils.getStatusBadge(match.status, match.minute)}
        </div>
        <div class="match-card-body">
          <div class="team-block">
            <div class="team-logo-sm">${home?.emoji || '⚽'}</div>
            <div class="team-name-sm">${home?.name || 'TBD'}</div>
          </div>
          <div class="match-score-sm">
            ${match.status !== 'scheduled' ? `<span>${match.home_score}</span><span style="color:var(--text-muted)">-</span><span>${match.away_score}</span>` : `<span style="color:var(--text-muted);font-size:0.9rem">${utils.formatTime(match.match_date)}</span>`}
          </div>
          <div class="team-block away">
            <div class="team-logo-sm">${away?.emoji || '⚽'}</div>
            <div class="team-name-sm">${away?.name || 'TBD'}</div>
          </div>
        </div>
        <div style="margin-top:0.75rem;font-size:0.7rem;color:var(--text-muted)">${utils.formatDate(match.match_date)}</div>
      </div>
    `;
  }

  window.AAFI.renderMatchCard = renderMatchCard;

  // ─── STANDINGS TABLE ROW ─────────────────────────────────────────────────────
  function renderStandingRow(team, pos) {
    const utils = window.AAFI.utils;
    const qualCls = utils.getQualClass(pos);

    return `
      <tr class="${qualCls} fade-in" style="animation-delay:${pos * 0.05}s">
        <td class="pos">${pos}</td>
        <td>
          <div class="team-row">
            <span style="font-size:1.1rem">${team.team_emoji || '⚽'}</span>
            <span style="font-weight:600">${team.team_name || team.name || 'Unknown'}</span>
          </div>
        </td>
        <td style="text-align:center">${team.played}</td>
        <td style="text-align:center;color:var(--green)">${team.won}</td>
        <td style="text-align:center;color:var(--yellow)">${team.drawn}</td>
        <td style="text-align:center;color:var(--red)">${team.lost}</td>
        <td style="text-align:center">${team.goals_for}</td>
        <td style="text-align:center">${team.goals_against}</td>
        <td style="text-align:center;color:${team.goal_difference >= 0 ? 'var(--green)' : 'var(--red)'}">${team.goal_difference > 0 ? '+' : ''}${team.goal_difference}</td>
        <td class="pts">${team.points}</td>
        <td><div class="form-badges">${utils.getFormBadges(team.form)}</div></td>
      </tr>
    `;
  }

  window.AAFI.renderStandingRow = renderStandingRow;

  // ─── INIT ────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    setActiveNav();

    // Check Supabase connection
    if (window.AAFI.supabase) {
      console.log('✅ Supabase connected');
    } else {
      console.log('ℹ️ Running in demo mode (no Supabase)');
    }

    // Add touch support for mobile nav
    const menuBtn = document.getElementById('mobile-menu-btn');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        document.querySelector('.navbar-nav')?.classList.toggle('open');
      });
    }
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        document.querySelector('.admin-sidebar')?.classList.toggle('open');
      });
    }
  });

})();
