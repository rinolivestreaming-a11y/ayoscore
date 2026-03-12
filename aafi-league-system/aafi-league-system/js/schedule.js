// AAFI Schedule Generator - Round Robin
(function() {
  'use strict';

  // Generate round-robin schedule for N teams
  function generateRoundRobin(teams) {
    const n = teams.length;
    const rounds = [];
    const list = [...teams];

    // If odd number of teams, add a BYE
    if (n % 2 !== 0) list.push({ id: 'BYE', name: 'BYE' });

    const totalTeams = list.length;
    const totalRounds = totalTeams - 1;
    const matchesPerRound = totalTeams / 2;

    for (let round = 0; round < totalRounds; round++) {
      const matches = [];
      for (let match = 0; match < matchesPerRound; match++) {
        const home = list[match];
        const away = list[totalTeams - 1 - match];
        if (home.id !== 'BYE' && away.id !== 'BYE') {
          matches.push({ home, away, week: round + 1, round: round + 1 });
        }
      }
      rounds.push({ round: round + 1, matches });

      // Rotate teams (keep first fixed)
      const last = list.pop();
      list.splice(1, 0, last);
    }

    return rounds;
  }

  // Generate full double round-robin (home & away)
  function generateFullSeason(teams) {
    const firstLeg = generateRoundRobin(teams);
    const secondLeg = firstLeg.map((round, i) => ({
      round: firstLeg.length + i + 1,
      matches: round.matches.map(m => ({
        ...m,
        home: m.away,
        away: m.home,
        week: firstLeg.length + round.round
      }))
    }));
    return [...firstLeg, ...secondLeg];
  }

  // Generate dates for schedule
  function assignDates(schedule, startDate = new Date()) {
    const d = new Date(startDate);
    return schedule.map(round => {
      const roundDate = new Date(d);
      d.setDate(d.getDate() + 7);
      return {
        ...round,
        date: roundDate.toISOString(),
        matches: round.matches.map(m => ({ ...m, match_date: roundDate.toISOString() }))
      };
    });
  }

  // Save schedule to Supabase
  async function saveScheduleToDb(schedule, leagueId) {
    if (!window.AAFI?.db || !window.AAFI?.TABLES) {
      console.warn('No DB connection, schedule not saved');
      return false;
    }

    const { db, TABLES } = window.AAFI;
    const allMatches = [];

    schedule.forEach(round => {
      round.matches.forEach(match => {
        allMatches.push({
          league_id: leagueId,
          home_team_id: match.home.id,
          away_team_id: match.away.id,
          round: match.round,
          week: match.week,
          match_date: match.match_date,
          status: 'scheduled'
        });
      });
    });

    try {
      const result = await db.insert(TABLES.matches, allMatches);
      return !!result;
    } catch (e) {
      console.error('Schedule save error:', e);
      return false;
    }
  }

  // Render schedule preview
  function renderSchedulePreview(schedule, container) {
    if (!container) return;

    container.innerHTML = schedule.map(round => `
      <div style="margin-bottom:1.5rem">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.1em;padding:0.5rem 0;border-bottom:1px solid var(--border);margin-bottom:0.75rem">
          Round ${round.round} ${round.date ? '· ' + new Date(round.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
        </div>
        ${round.matches.map(m => `
          <div style="display:flex;align-items:center;gap:1rem;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.03)">
            <span style="flex:1;text-align:right;font-weight:600;font-size:0.9rem">${m.home.name}</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;color:var(--text-muted)">vs</span>
            <span style="flex:1;font-weight:600;font-size:0.9rem">${m.away.name}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  window.AAFI = window.AAFI || {};
  window.AAFI.schedule = { generateRoundRobin, generateFullSeason, assignDates, saveScheduleToDb, renderSchedulePreview };

  // ─── SCHEDULE PAGE INIT ──────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    const schedulePreview = document.getElementById('schedule-preview');
    if (!schedulePreview) return;

    const genBtn = document.getElementById('generate-schedule-btn');
    if (!genBtn) return;

    genBtn.addEventListener('click', function() {
      const leagueSel = document.getElementById('schedule-league-select');
      const startDateIn = document.getElementById('schedule-start-date');
      const leagueKey = leagueSel?.value || 'U11';
      const startDate = startDateIn?.value ? new Date(startDateIn.value) : new Date();

      const teams = (window.AAFI.DEMO_TEAMS?.[leagueKey] || []).map((name, i) => ({ id: `team-${i}`, name }));

      if (teams.length < 2) {
        window.AAFI.showToast('Error', 'Need at least 2 teams', 'error');
        return;
      }

      const schedule = window.AAFI.schedule.generateFullSeason(teams);
      const withDates = window.AAFI.schedule.assignDates(schedule, startDate);

      renderSchedulePreview(withDates, schedulePreview);

      const totalMatches = withDates.reduce((acc, r) => acc + r.matches.length, 0);
      window.AAFI.showToast('Schedule Generated', `${withDates.length} rounds, ${totalMatches} matches`, 'success');

      document.getElementById('save-schedule-btn')?.removeAttribute('disabled');
    });
  });

})();
