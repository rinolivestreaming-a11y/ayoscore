// AAFI Tournament & Bracket System
(function() {
  'use strict';

  const ROUNDS = {
    32: ['Round of 32', 'Round of 16', 'Quarter Final', 'Semi Final', 'Final'],
    16: ['Round of 16', 'Quarter Final', 'Semi Final', 'Final'],
    8:  ['Quarter Final', 'Semi Final', 'Final'],
    4:  ['Semi Final', 'Final'],
    2:  ['Final']
  };

  // Generate bracket from teams list
  function generateBracket(teams, tournamentId) {
    const size = teams.length;
    const rounds = ROUNDS[size] || ROUNDS[8];
    const bracket = [];
    let roundTeams = [...teams];

    rounds.forEach((roundName, roundIdx) => {
      const matches = [];
      for (let i = 0; i < roundTeams.length; i += 2) {
        matches.push({
          tournament_id: tournamentId,
          round: roundName,
          round_order: roundIdx,
          match_order: i / 2,
          home_team_id: roundTeams[i]?.id || null,
          away_team_id: roundTeams[i + 1]?.id || null,
          home_score: 0,
          away_score: 0,
          status: roundIdx === 0 ? 'scheduled' : 'pending',
          winner_id: null
        });
      }
      bracket.push({ round: roundName, roundOrder: roundIdx, matches });
      // Next round placeholder (TBD)
      roundTeams = Array(Math.ceil(roundTeams.length / 2)).fill({ id: null, name: 'TBD' });
    });

    return bracket;
  }

  // Advance winner to next round
  function advanceWinner(bracket, roundIdx, matchIdx, winner) {
    if (roundIdx + 1 >= bracket.length) return bracket; // Final winner
    const nextRound = bracket[roundIdx + 1];
    const slot = Math.floor(matchIdx / 2);
    const isHome = matchIdx % 2 === 0;

    if (nextRound.matches[slot]) {
      if (isHome) {
        nextRound.matches[slot].home_team_id = winner.id;
        nextRound.matches[slot].home_team = winner;
      } else {
        nextRound.matches[slot].away_team_id = winner.id;
        nextRound.matches[slot].away_team = winner;
      }
      if (nextRound.matches[slot].home_team_id && nextRound.matches[slot].away_team_id) {
        nextRound.matches[slot].status = 'scheduled';
      }
    }

    return bracket;
  }

  // Render visual bracket
  function renderBracket(bracket, container) {
    if (!container) return;

    container.innerHTML = `
      <div class="bracket">
        ${bracket.map(round => `
          <div class="bracket-round ${round.round === 'Final' ? 'final' : ''}">
            <div class="bracket-round-header">${round.round}</div>
            <div class="bracket-matches">
              ${round.matches.map(match => renderBracketMatch(match)).join('')}
            </div>
          </div>
        `).join('<div class="bracket-connector"></div>')}
        ${renderChampion(bracket)}
      </div>
    `;
  }

  function renderBracketMatch(match) {
    const home = match.home_team || { name: 'TBD', logo_emoji: '❓' };
    const away = match.away_team || { name: 'TBD', logo_emoji: '❓' };
    const isFinished = match.status === 'finished';
    const isLive = match.status === 'live';

    return `
      <div class="bracket-match ${isLive ? 'live' : ''} ${isFinished ? 'completed' : ''}">
        <div class="bracket-team ${isFinished && match.winner_id === match.home_team_id ? 'winner' : ''} ${isFinished && match.winner_id !== match.home_team_id && match.home_team_id ? 'loser' : ''}">
          <div class="bracket-team-logo">${home.logo_emoji || '⚽'}</div>
          <div class="bracket-team-name">${home.name || 'TBD'}</div>
          ${isFinished || isLive ? `<div class="bracket-team-score">${match.home_score}</div>` : ''}
        </div>
        <div class="bracket-team ${isFinished && match.winner_id === match.away_team_id ? 'winner' : ''} ${isFinished && match.winner_id !== match.away_team_id && match.away_team_id ? 'loser' : ''}">
          <div class="bracket-team-logo">${away.logo_emoji || '⚽'}</div>
          <div class="bracket-team-name">${away.name || 'TBD'}</div>
          ${isFinished || isLive ? `<div class="bracket-team-score">${match.away_score}</div>` : ''}
        </div>
      </div>
    `;
  }

  function renderChampion(bracket) {
    const finalRound = bracket[bracket.length - 1];
    const finalMatch = finalRound?.matches?.[0];
    if (!finalMatch?.winner_id) return '';

    const champion = finalMatch.winner_id === finalMatch.home_team_id ? finalMatch.home_team : finalMatch.away_team;
    if (!champion) return '';

    return `
      <div class="bracket-round">
        <div class="bracket-round-header">Champion</div>
        <div class="bracket-matches">
          <div class="champion-display">
            <div class="trophy-icon">🏆</div>
            <div class="champion-name">${champion.name}</div>
            <div class="champion-label">Tournament Winner</div>
          </div>
        </div>
      </div>
    `;
  }

  // Save bracket to DB
  async function saveBracketToDb(bracket, tournamentId) {
    if (!window.AAFI?.db) return false;
    const { db, TABLES } = window.AAFI;
    const rows = [];
    bracket.forEach(round => round.matches.forEach(m => rows.push({ ...m, tournament_id: tournamentId })));
    try {
      await db.insert(TABLES.brackets, rows);
      return true;
    } catch(e) { return false; }
  }

  // Load tournament from DB
  async function loadTournament(tournamentId) {
    if (!window.AAFI?.db) return null;
    const { db, TABLES } = window.AAFI;
    try {
      const brackets = await db.select(TABLES.brackets, {
        select: '*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*), winner:teams!winner_id(*)',
        eq: { tournament_id: tournamentId },
        order: { column: 'round_order', ascending: true }
      });

      if (!brackets?.length) return null;

      // Group by round
      const grouped = {};
      brackets.forEach(b => {
        if (!grouped[b.round]) grouped[b.round] = { round: b.round, roundOrder: b.round_order, matches: [] };
        grouped[b.round].matches.push(b);
      });

      return Object.values(grouped).sort((a, b) => a.roundOrder - b.roundOrder);
    } catch(e) { return null; }
  }

  window.AAFI = window.AAFI || {};
  window.AAFI.tournament = { generateBracket, advanceWinner, renderBracket, saveBracketToDb, loadTournament, ROUNDS };

  // ─── TOURNAMENT PAGE INIT ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    const bracketContainer = document.getElementById('bracket-container');
    if (!bracketContainer) return;

    const params = new URLSearchParams(window.location.search);
    const tournamentId = params.get('id');

    if (tournamentId) {
      loadTournament(tournamentId).then(bracket => {
        if (bracket) {
          renderBracket(bracket, bracketContainer);
        } else {
          renderDemoBracket(bracketContainer);
        }
      });
    } else {
      renderDemoBracket(bracketContainer);
    }
  });

  function renderDemoBracket(container) {
    const teams = [
      { id: '1', name: 'Thunder FC', logo_emoji: '🔵' },
      { id: '2', name: 'Eagles SC', logo_emoji: '🔴' },
      { id: '3', name: 'Lions FC', logo_emoji: '🟡' },
      { id: '4', name: 'Phoenix AC', logo_emoji: '🟢' },
      { id: '5', name: 'Sharks FC', logo_emoji: '🟠' },
      { id: '6', name: 'Tigers SC', logo_emoji: '🟣' },
      { id: '7', name: 'Wolves FC', logo_emoji: '⚫' },
      { id: '8', name: 'Hawks AC', logo_emoji: '⚪' }
    ];

    let bracket = generateBracket(teams, 'demo');

    // Simulate some results
    bracket[0].matches.forEach((m, i) => {
      m.home_team = teams[i * 2];
      m.away_team = teams[i * 2 + 1];
      if (i < 2) {
        m.status = 'finished';
        m.home_score = 2;
        m.away_score = 1;
        m.winner_id = m.home_team_id;
      }
    });

    renderBracket(bracket, container);
  }

})();
