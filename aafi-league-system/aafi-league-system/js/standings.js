// AAFI Standings Module
(function() {
  'use strict';

  let currentLeague = 'U11';

  async function loadStandings(league) {
    currentLeague = league;
    const container = document.getElementById('standings-body');
    if (!container) return;

    // Show loading
    container.innerHTML = Array(10).fill('<tr><td colspan="11"><div class="loading-skeleton" style="height:44px;margin:2px 0"></div></td></tr>').join('');

    let standings = [];

    try {
      if (window.AAFI?.supabase && window.AAFI?.TABLES) {
        const { db, TABLES } = window.AAFI;
        // Get league id first
        const leagues = await db.select(TABLES.leagues, { eq: { age_group: league } });
        if (leagues?.length > 0) {
          const leagueId = leagues[0].id;
          const data = await db.select(TABLES.standings, {
            select: '*, teams(name, logo_emoji, color)',
            eq: { league_id: leagueId },
            order: { column: 'points', ascending: false }
          });
          if (data?.length > 0) {
            standings = data.map(s => ({
              ...s,
              team_name: s.teams?.name,
              team_emoji: s.teams?.logo_emoji || '⚽'
            }));
          }
        }
      }
    } catch (e) {
      console.warn('Supabase standings load failed, using demo data');
    }

    if (!standings.length) {
      standings = window.AAFI.generateDemoStandings(league);
    }

    // Sort by points, then GD, then GF
    standings.sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_for - a.goals_for);

    container.innerHTML = standings.map((team, i) => window.AAFI.renderStandingRow(team, i + 1)).join('');

    // Animate rows
    requestAnimationFrame(() => {
      container.querySelectorAll('tr').forEach((row, i) => {
        row.style.animationDelay = `${i * 0.04}s`;
      });
    });
  }

  // Subscribe to realtime standings updates
  function subscribeToStandings(leagueId) {
    if (!window.AAFI?.realtime) return;
    window.AAFI.realtime.subscribe('standings-live', 'standings', () => {
      loadStandings(currentLeague);
    }, `league_id=eq.${leagueId}`);
  }

  window.AAFI = window.AAFI || {};
  window.AAFI.standings = { load: loadStandings, subscribe: subscribeToStandings };

  // Auto-init on standings page
  document.addEventListener('DOMContentLoaded', function() {
    const standingsContainer = document.getElementById('standings-body');
    if (!standingsContainer) return;

    loadStandings('U11');

    // League tab switching
    document.querySelectorAll('.league-tab[data-league]').forEach(tab => {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.league-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        loadStandings(this.dataset.league);
      });
    });
  });
})();
