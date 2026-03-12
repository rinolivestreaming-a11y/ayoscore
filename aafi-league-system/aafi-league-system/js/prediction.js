// AAFI AI Match Prediction System
(function() {
  'use strict';

  // Calculate team form strength (0-100)
  function calculateFormStrength(form) {
    if (!form) return 50;
    const chars = form.split('').slice(-5);
    let score = 0;
    chars.forEach(c => {
      if (c === 'W') score += 20;
      else if (c === 'D') score += 10;
    });
    return score;
  }

  // Calculate attack/defense strength
  function calculateStrengths(team) {
    const avgGoalsFor = team.played ? (team.goals_for / team.played) : 1;
    const avgGoalsAgainst = team.played ? (team.goals_against / team.played) : 1;
    const pointsPerGame = team.played ? (team.points / team.played) : 1;

    return {
      attack: Math.min(100, avgGoalsFor * 25 + pointsPerGame * 10),
      defense: Math.max(0, 100 - avgGoalsAgainst * 25),
      form: calculateFormStrength(team.form),
      position: Math.max(0, 100 - (team.position - 1) * 10)
    };
  }

  // Predict match outcome
  function predictMatch(homeTeam, awayTeam) {
    const home = calculateStrengths(homeTeam);
    const away = calculateStrengths(awayTeam);

    // Home advantage bonus
    const homeAdvantage = 8;

    // Calculate raw scores
    const homeScore = (home.attack * 0.3 + home.form * 0.25 + home.defense * 0.2 + home.position * 0.25) + homeAdvantage;
    const awayScore = (away.attack * 0.3 + away.form * 0.25 + away.defense * 0.2 + away.position * 0.25);

    const total = homeScore + awayScore;

    // Raw probabilities
    let homeProb = (homeScore / total) * 70;
    let drawProb = 20 + Math.random() * 10;
    let awayProb = (awayScore / total) * 70;

    // Normalize to 100%
    const sum = homeProb + drawProb + awayProb;
    homeProb = Math.round(homeProb / sum * 100);
    awayProb = Math.round(awayProb / sum * 100);
    drawProb = 100 - homeProb - awayProb;

    // Predicted score
    const predHomeGoals = Math.round(homeTeam.goals_for / (homeTeam.played || 1) * (homeProb / 50));
    const predAwayGoals = Math.round(awayTeam.goals_for / (awayTeam.played || 1) * (awayProb / 50));

    const winner = homeProb > awayProb && homeProb > drawProb ? 'home' :
                   awayProb > homeProb && awayProb > drawProb ? 'away' : 'draw';

    return {
      homeWin: Math.max(5, Math.min(90, homeProb)),
      draw: Math.max(5, Math.min(50, drawProb)),
      awayWin: Math.max(5, Math.min(90, awayProb)),
      predictedScore: `${predHomeGoals} - ${predAwayGoals}`,
      winner,
      confidence: Math.max(homeProb, awayProb) > 60 ? 'High' : Math.max(homeProb, awayProb) > 45 ? 'Medium' : 'Low',
      factors: {
        homeAttack: Math.round(home.attack),
        awayAttack: Math.round(away.attack),
        homeForm: Math.round(home.form),
        awayForm: Math.round(away.form),
        homeDefense: Math.round(home.defense),
        awayDefense: Math.round(away.defense)
      }
    };
  }

  // Render prediction widget
  function renderPrediction(prediction, homeTeam, awayTeam, container) {
    if (!container) return;

    const winnerColor = prediction.winner === 'home' ? '#00d4ff' : prediction.winner === 'away' ? '#ff6b00' : '#ffd600';

    container.innerHTML = `
      <div class="prediction-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
          <div class="card-title">⚡ AI Prediction</div>
          <span class="badge badge-${prediction.confidence === 'High' ? 'success' : prediction.confidence === 'Medium' ? 'warning' : 'secondary'}">${prediction.confidence} Confidence</span>
        </div>

        <div style="text-align:center;margin-bottom:1rem">
          <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:0.5rem">Predicted Score</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:900;color:${winnerColor}">${prediction.predictedScore}</div>
        </div>

        <div class="win-prob-bar" title="Home: ${prediction.homeWin}% | Draw: ${prediction.draw}% | Away: ${prediction.awayWin}%">
          <div class="win-home" style="width:${prediction.homeWin}%">${prediction.homeWin}%</div>
          <div class="win-draw" style="width:${prediction.draw}%">${prediction.draw}%</div>
          <div class="win-away" style="width:${prediction.awayWin}%">${prediction.awayWin}%</div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:0.5rem;font-size:0.75rem;color:var(--text-muted)">
          <span>${homeTeam?.name || 'Home'} Win</span>
          <span>Draw</span>
          <span>${awayTeam?.name || 'Away'} Win</span>
        </div>

        <div class="divider"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
          ${[
            ['🎯 Home Attack', prediction.factors.homeAttack, 'vs', prediction.factors.awayAttack, '🎯 Away Attack'],
            ['🛡 Home Defense', prediction.factors.homeDefense, 'vs', prediction.factors.awayDefense, '🛡 Away Defense'],
            ['📊 Home Form', prediction.factors.homeForm, 'vs', prediction.factors.awayForm, '📊 Away Form']
          ].map(([hl, hv, , av, al]) => `
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem;text-align:center">
              <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:0.3rem">${hl}</div>
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;color:var(--primary)">${hv}</div>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.75rem;text-align:center">
              <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:0.3rem">${al}</div>
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:800;color:var(--secondary)">${av}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  window.AAFI = window.AAFI || {};
  window.AAFI.prediction = { predictMatch, renderPrediction, calculateStrengths };

  // Auto prediction on match center page
  document.addEventListener('DOMContentLoaded', function() {
    const predContainer = document.getElementById('prediction-widget');
    if (!predContainer) return;

    // Demo prediction
    const demoHome = { name: 'Thunder FC', played: 15, won: 10, drawn: 2, lost: 3, goals_for: 28, goals_against: 14, points: 32, position: 1, form: 'WWWDW' };
    const demoAway = { name: 'Eagles SC', played: 15, won: 7, drawn: 4, lost: 4, goals_for: 22, goals_against: 18, points: 25, position: 3, form: 'WDLDW' };

    const prediction = window.AAFI.prediction.predictMatch(demoHome, demoAway);
    window.AAFI.prediction.renderPrediction(prediction, demoHome, demoAway, predContainer);
  });

})();
