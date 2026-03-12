// AAFI Live Score & Match Center Module
(function() {
  'use strict';

  let matchTimer = null;
  let currentMatchId = null;
  let matchMinute = 0;
  let isTimerRunning = false;

  // ─── MATCH TIMER ─────────────────────────────────────────────────────────────
  function startTimer(fromMinute = 0) {
    if (isTimerRunning) return;
    isTimerRunning = true;
    matchMinute = fromMinute;

    matchTimer = setInterval(() => {
      matchMinute++;
      updateTimerDisplay(matchMinute);
      if (matchMinute >= 90) {
        // Extra time
        const extra = matchMinute - 90;
        updateTimerDisplay(`90+${extra}`);
      }
    }, 60000); // Real-time: 1 min = 1 min. For demo use 5000ms
  }

  function stopTimer() {
    if (matchTimer) clearInterval(matchTimer);
    isTimerRunning = false;
    matchTimer = null;
  }

  function updateTimerDisplay(minute) {
    document.querySelectorAll('.match-minute-display').forEach(el => {
      el.textContent = `${minute}'`;
    });
  }

  // ─── LIVE SCORE UPDATE ───────────────────────────────────────────────────────
  function updateScore(homeScore, awayScore) {
    document.querySelectorAll('.live-home-score').forEach(el => el.textContent = homeScore);
    document.querySelectorAll('.live-away-score').forEach(el => el.textContent = awayScore);
  }

  // ─── EVENT TIMELINE ──────────────────────────────────────────────────────────
  function addEvent(event) {
    const container = document.getElementById('event-timeline');
    if (!container) return;

    const icons = {
      goal: { icon: '⚽', cls: 'event-goal', label: 'GOAL' },
      own_goal: { icon: '⚽', cls: 'event-red', label: 'OWN GOAL' },
      yellow_card: { icon: '🟨', cls: 'event-yellow', label: 'YELLOW CARD' },
      red_card: { icon: '🟥', cls: 'event-red', label: 'RED CARD' },
      substitution: { icon: '🔄', cls: 'event-sub', label: 'SUBSTITUTION' },
      penalty: { icon: '🎯', cls: 'event-goal', label: 'PENALTY' },
      assist: { icon: '👟', cls: 'event-sub', label: 'ASSIST' }
    };

    const info = icons[event.type] || { icon: '📋', cls: 'event-sub', label: event.type?.toUpperCase() };

    const el = document.createElement('div');
    el.className = 'event-ticker';
    el.innerHTML = `
      <div class="event-icon ${info.cls}">${info.icon}</div>
      <div class="event-text">
        <div style="font-weight:700;font-size:0.8rem">${info.label}</div>
        <div>${event.player_name || 'Unknown Player'} <span style="color:var(--text-muted)">(${event.team_name || ''})</span></div>
      </div>
      <div class="event-time">${event.minute}'</div>
    `;

    container.insertBefore(el, container.firstChild);

    // Goal celebration
    if (event.type === 'goal' || event.type === 'penalty') {
      triggerGoalAnimation();
    }
  }

  function triggerGoalAnimation() {
    const flash = document.createElement('div');
    flash.className = 'goal-flash';
    const text = document.createElement('div');
    text.className = 'goal-text';
    text.textContent = 'GOAL!';
    document.body.appendChild(flash);
    document.body.appendChild(text);
    setTimeout(() => { flash.remove(); text.remove(); }, 2500);
  }

  // ─── MATCH STATISTICS BARS ──────────────────────────────────────────────────
  function updateStatBar(statName, homeVal, awayVal) {
    const total = homeVal + awayVal || 1;
    const homePct = Math.round(homeVal / total * 100);
    const awayPct = 100 - homePct;

    const bar = document.querySelector(`[data-stat="${statName}"]`);
    if (!bar) return;

    bar.querySelector('.stat-home-val').textContent = homeVal;
    bar.querySelector('.stat-away-val').textContent = awayVal;
    bar.querySelector('.stat-home-bar').style.width = `${homePct}%`;
    bar.querySelector('.stat-away-bar').style.width = `${awayPct}%`;
  }

  function renderStatsSection(homeStats, awayStats) {
    const container = document.getElementById('match-stats-section');
    if (!container) return;

    const stats = [
      { key: 'shots', label: 'Shots' },
      { key: 'shots_on_target', label: 'Shots on Target' },
      { key: 'possession', label: 'Possession %' },
      { key: 'corners', label: 'Corners' },
      { key: 'fouls', label: 'Fouls' },
      { key: 'passes', label: 'Passes' },
      { key: 'tackles', label: 'Tackles' },
      { key: 'yellow_cards', label: 'Yellow Cards' },
      { key: 'red_cards', label: 'Red Cards' }
    ];

    container.innerHTML = stats.map(stat => {
      const hv = homeStats?.[stat.key] || 0;
      const av = awayStats?.[stat.key] || 0;
      const total = hv + av || 1;
      const hpct = Math.round(hv / total * 100);

      return `
        <div class="stat-compare-row" data-stat="${stat.key}" style="margin-bottom:1rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem">
            <span class="stat-home-val" style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700">${hv}</span>
            <span style="font-size:0.78rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.08em">${stat.label}</span>
            <span class="stat-away-val" style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700">${av}</span>
          </div>
          <div style="display:flex;height:6px;border-radius:3px;overflow:hidden;background:rgba(255,255,255,0.05)">
            <div class="stat-home-bar" style="width:${hpct}%;background:linear-gradient(90deg,#00d4ff,#0066ff);transition:width 0.8s"></div>
            <div class="stat-away-bar" style="width:${100-hpct}%;background:linear-gradient(90deg,#ff6b00,#ff4444);transition:width 0.8s"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── LOAD MATCH CENTER ──────────────────────────────────────────────────────
  async function loadMatchCenter(matchId) {
    currentMatchId = matchId;

    try {
      if (window.AAFI?.supabase && matchId && !matchId.startsWith('demo')) {
        const { db, TABLES } = window.AAFI;
        const match = await db.select(TABLES.matches, {
          select: '*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)',
          eq: { id: matchId },
          single: true
        });

        if (match) {
          renderMatchCenter(match);

          // Subscribe to realtime
          window.AAFI.realtime?.subscribe(`match-${matchId}`, 'matches', payload => {
            if (payload.new?.id === matchId) {
              updateScore(payload.new.home_score, payload.new.away_score);
              updateTimerDisplay(payload.new.minute);
            }
          }, `id=eq.${matchId}`);

          window.AAFI.realtime?.subscribe(`events-${matchId}`, 'match_events', payload => {
            if (payload.new?.match_id === matchId) {
              addEvent(payload.new);
            }
          }, `match_id=eq.${matchId}`);

          return;
        }
      }
    } catch (e) {
      console.warn('Match center load failed, using demo');
    }

    // Demo match
    renderDemoMatch();
  }

  function renderMatchCenter(match) {
    const home = match.home_team;
    const away = match.away_team;

    // Update page elements
    const setter = (sel, val) => document.querySelectorAll(sel).forEach(el => el.textContent = val);
    setter('.mc-home-name', home?.name || 'Home');
    setter('.mc-away-name', away?.name || 'Away');
    setter('.live-home-score', match.home_score || 0);
    setter('.live-away-score', match.away_score || 0);
    setter('.mc-home-logo', home?.logo_emoji || '⚽');
    setter('.mc-away-logo', away?.logo_emoji || '⚽');
    setter('.mc-match-date', window.AAFI.utils?.formatDateTime(match.match_date) || '');

    if (match.status === 'live') {
      updateTimerDisplay(match.minute);
    }

    // Load events
    loadMatchEvents(match.id);
    loadMatchStats(match.id);
  }

  function renderDemoMatch() {
    const demoMatch = {
      home_team: { name: 'Thunder FC', logo_emoji: '🔵' },
      away_team: { name: 'Eagles SC', logo_emoji: '🔴' },
      home_score: 2, away_score: 1,
      status: 'live',
      minute: 67
    };

    const setter = (sel, val) => document.querySelectorAll(sel).forEach(el => el.textContent = val);
    setter('.mc-home-name', demoMatch.home_team.name);
    setter('.mc-away-name', demoMatch.away_team.name);
    setter('.live-home-score', demoMatch.home_score);
    setter('.live-away-score', demoMatch.away_score);
    setter('.mc-home-logo', demoMatch.home_team.logo_emoji);
    setter('.mc-away-logo', demoMatch.away_team.logo_emoji);
    updateTimerDisplay(demoMatch.minute);

    // Demo events
    const demoEvents = [
      { type: 'goal', player_name: 'Carlos Martinez', team_name: 'Thunder FC', minute: 23 },
      { type: 'yellow_card', player_name: 'John Smith', team_name: 'Eagles SC', minute: 34 },
      { type: 'goal', player_name: 'Ryan Johnson', team_name: 'Eagles SC', minute: 45 },
      { type: 'goal', player_name: 'James Wilson', team_name: 'Thunder FC', minute: 58 },
      { type: 'substitution', player_name: 'Alex Brown → Tom White', team_name: 'Thunder FC', minute: 65 }
    ];

    demoEvents.reverse().forEach(e => addEvent(e));

    // Demo stats
    renderStatsSection(
      { shots: 12, shots_on_target: 6, possession: 58, corners: 5, fouls: 8, passes: 320, tackles: 18, yellow_cards: 0, red_cards: 0 },
      { shots: 8, shots_on_target: 4, possession: 42, corners: 3, fouls: 11, passes: 240, tackles: 22, yellow_cards: 1, red_cards: 0 }
    );
  }

  async function loadMatchEvents(matchId) {
    try {
      if (window.AAFI?.db && window.AAFI?.TABLES) {
        const events = await window.AAFI.db.select(window.AAFI.TABLES.events, {
          select: '*, players(name), teams(name)',
          eq: { match_id: matchId },
          order: { column: 'minute', ascending: false }
        });

        if (events?.length > 0) {
          const container = document.getElementById('event-timeline');
          if (container) container.innerHTML = '';
          events.forEach(e => addEvent({
            ...e,
            player_name: e.players?.name,
            team_name: e.teams?.name
          }));
        }
      }
    } catch(e) { console.warn('Events load failed'); }
  }

  async function loadMatchStats(matchId) {
    try {
      if (window.AAFI?.db && window.AAFI?.TABLES) {
        const stats = await window.AAFI.db.select(window.AAFI.TABLES.statistics, { eq: { match_id: matchId } });
        if (stats?.length >= 2) {
          renderStatsSection(stats[0], stats[1]);
        }
      }
    } catch(e) { console.warn('Stats load failed'); }
  }

  // ─── EXPORT ──────────────────────────────────────────────────────────────────
  window.AAFI = window.AAFI || {};
  window.AAFI.live = {
    startTimer, stopTimer, updateScore, addEvent, updateStatBar,
    renderStatsSection, loadMatchCenter, triggerGoalAnimation
  };

  // Auto-init match center
  document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('match-center-page')) return;

    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('id') || 'demo-0';
    loadMatchCenter(matchId);
  });

})();
