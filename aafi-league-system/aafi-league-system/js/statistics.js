// AAFI Statistics & Analytics Module
(function() {
  'use strict';

  // Render bar chart
  function renderBarChart(data, container, { maxVal, color = 'var(--gradient-primary)', showLabels = true } = {}) {
    if (!container || !data.length) return;
    const max = maxVal || Math.max(...data.map(d => d.value));

    container.innerHTML = `
      <div class="bar-chart">
        ${data.map(item => {
          const pct = max > 0 ? (item.value / max * 100) : 0;
          return `
            <div class="bar-item">
              <div class="bar-val">${item.value}</div>
              <div class="bar-fill" style="height:${pct}%;background:${color}"></div>
              ${showLabels ? `<div class="bar-label">${item.label}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Render donut chart (CSS based)
  function renderDonutChart(percentage, container, color = '#00d4ff', label = '') {
    if (!container) return;
    const pct = Math.min(100, Math.max(0, percentage));
    const deg = pct / 100 * 360;

    container.innerHTML = `
      <div style="position:relative;width:100px;height:100px;display:flex;align-items:center;justify-content:center;margin:0 auto">
        <svg viewBox="0 0 36 36" width="100" height="100" style="transform:rotate(-90deg)">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="3"/>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="${color}" stroke-width="3"
            stroke-dasharray="${pct} ${100 - pct}" stroke-linecap="round" style="transition:stroke-dasharray 1s ease"/>
        </svg>
        <div style="position:absolute;text-align:center">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:900">${pct}%</div>
          ${label ? `<div style="font-size:0.6rem;color:var(--text-muted)">${label}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Generate analytics data
  function generateAnalytics(league) {
    const teams = window.AAFI.DEMO_TEAMS?.[league] || window.AAFI.DEMO_TEAMS?.['U11'] || [];
    const scorers = window.AAFI.generateDemoScorers?.(league) || [];

    const goalsPerRound = Array.from({ length: 9 }, (_, i) => ({
      label: `R${i + 1}`,
      value: Math.floor(Math.random() * 12) + 4
    }));

    const topScoringTeams = teams.slice(0, 6).map((name, i) => ({
      label: name.split(' ')[0],
      value: Math.floor(Math.random() * 20) + 10 - i
    }));

    const posAvgs = [
      { label: 'GK', value: 0 },
      { label: 'DEF', value: 3 },
      { label: 'MID', value: 8 },
      { label: 'FWD', value: 14 }
    ];

    return { goalsPerRound, topScoringTeams, posAvgs, scorers };
  }

  // Render top scorers leaderboard
  function renderTopScorers(scorers, container, limit = 10) {
    if (!container) return;
    container.innerHTML = scorers.slice(0, limit).map((player, i) => {
      const rankCls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      return `
        <div class="scorer-row fade-in" style="animation-delay:${i * 0.05}s">
          <div class="scorer-rank ${rankCls}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
          <div class="scorer-info">
            <div class="scorer-name">${player.name}</div>
            <div class="scorer-team">${player.team || 'Unknown'}</div>
          </div>
          <div style="display:flex;align-items:center;gap:1.5rem">
            <div style="text-align:center">
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:0.7rem;color:var(--text-muted);text-transform:uppercase">Assists</div>
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;color:var(--primary)">${player.assists || 0}</div>
            </div>
            <div class="scorer-goals">${player.goals}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  window.AAFI = window.AAFI || {};
  window.AAFI.statistics = { renderBarChart, renderDonutChart, generateAnalytics, renderTopScorers };

  // ─── STATISTICS PAGE INIT ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    const statsPage = document.getElementById('statistics-page');
    if (!statsPage) return;

    let currentLeague = 'U11';

    function loadStats(league) {
      currentLeague = league;
      const analytics = window.AAFI.statistics.generateAnalytics(league);
      const scorers = window.AAFI.generateDemoScorers?.(league) || [];

      const goalsChart = document.getElementById('goals-per-round-chart');
      if (goalsChart) window.AAFI.statistics.renderBarChart(analytics.goalsPerRound, goalsChart);

      const teamChart = document.getElementById('top-scoring-teams-chart');
      if (teamChart) window.AAFI.statistics.renderBarChart(analytics.topScoringTeams, teamChart, { color: 'linear-gradient(180deg, #ff6b00, #ff4444)' });

      const scorersContainer = document.getElementById('top-scorers-list');
      if (scorersContainer) window.AAFI.statistics.renderTopScorers(scorers, scorersContainer);

      // Possession donuts
      const possessionCharts = document.querySelectorAll('[data-possession]');
      possessionCharts.forEach((el, i) => {
        const val = Math.floor(Math.random() * 30) + 40;
        window.AAFI.statistics.renderDonutChart(val, el, i % 2 === 0 ? '#00d4ff' : '#ff6b00');
      });
    }

    loadStats('U11');

    document.querySelectorAll('.league-tab[data-league]').forEach(tab => {
      tab.addEventListener('click', function() {
        document.querySelectorAll('.league-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        loadStats(this.dataset.league);
      });
    });
  });

})();
