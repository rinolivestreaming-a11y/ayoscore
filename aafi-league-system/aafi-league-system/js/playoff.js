// AAFI Playoff System
(function() {
  'use strict';

  // Generate playoff from top 4 standings
  function generatePlayoff(topTeams) {
    // 1st vs 4th, 2nd vs 3rd
    return {
      semi_finals: [
        { home: topTeams[0], away: topTeams[3], label: 'Semi Final 1 (1st vs 4th)', round: 'semi_final' },
        { home: topTeams[1], away: topTeams[2], label: 'Semi Final 2 (2nd vs 3rd)', round: 'semi_final' }
      ],
      final: { label: 'Grand Final', round: 'final', home: null, away: null }
    };
  }

  function renderPlayoffBracket(playoff, container) {
    if (!container) return;

    const sf1 = playoff.semi_finals[0];
    const sf2 = playoff.semi_finals[1];
    const fin = playoff.final;

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 60px 1fr 60px 1fr;align-items:center;gap:0;min-height:400px">
        <!-- Semi Finals Left -->
        <div style="display:flex;flex-direction:column;gap:4rem">
          ${renderPlayoffMatch(sf1, 'sf1')}
          ${renderPlayoffMatch(sf2, 'sf2')}
        </div>
        <!-- Connector -->
        <div style="display:flex;align-items:center;justify-content:center;height:100%">
          <svg width="60" height="300" viewBox="0 0 60 300" fill="none">
            <path d="M 0 75 H 30 V 225 H 60" stroke="rgba(0,212,255,0.3)" stroke-width="2" fill="none"/>
            <path d="M 30 150 H 60" stroke="rgba(0,212,255,0.5)" stroke-width="2"/>
          </svg>
        </div>
        <!-- Final -->
        <div style="display:flex;justify-content:center">
          ${renderPlayoffMatch(fin, 'final', true)}
        </div>
        <!-- Winner connector -->
        <div style="display:flex;align-items:center;justify-content:center;height:100%">
          ${fin.winner ? '<svg width="60" height="60" viewBox="0 0 60 60"><path d="M 0 30 H 60" stroke="rgba(255,215,0,0.5)" stroke-width="2"/></svg>' : ''}
        </div>
        <!-- Champion -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;padding:1.5rem">
          <div style="font-size:3rem">🏆</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-muted)">Champion</div>
          ${fin.winner ? `<div style="font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:900;color:var(--accent)">${fin.winner.name}</div>` : '<div style="color:var(--text-muted);font-size:0.9rem">To Be Determined</div>'}
        </div>
      </div>
    `;
  }

  function renderPlayoffMatch(match, id, isFinal = false) {
    const finishedOrLive = match.status === 'finished' || match.status === 'live';
    return `
      <div class="bracket-match ${isFinal ? 'final' : ''} ${match.status === 'live' ? 'live' : ''}" id="playoff-${id}" style="${isFinal ? 'border-color:rgba(255,215,0,0.3)' : ''}">
        <div style="padding:0.5rem 0.75rem;font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid var(--border)">${match.label || (isFinal ? '🏆 FINAL' : 'Match')}</div>
        <div class="bracket-team ${match.winner_id === match.home?.id ? 'winner' : ''}">
          <div class="bracket-team-logo">${match.home?.logo_emoji || '❓'}</div>
          <div class="bracket-team-name">${match.home?.name || 'Winner SF1'}</div>
          ${finishedOrLive ? `<div class="bracket-team-score">${match.home_score || 0}</div>` : ''}
        </div>
        <div class="bracket-team ${match.winner_id === match.away?.id ? 'winner' : ''}">
          <div class="bracket-team-logo">${match.away?.logo_emoji || '❓'}</div>
          <div class="bracket-team-name">${match.away?.name || 'Winner SF2'}</div>
          ${finishedOrLive ? `<div class="bracket-team-score">${match.away_score || 0}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Save playoff to DB
  async function savePlayoff(playoff, leagueId, season) {
    if (!window.AAFI?.db) return null;
    const { db, TABLES } = window.AAFI;

    try {
      const [playoffRecord] = await db.insert(TABLES.playoffs, { league_id: leagueId, season, status: 'active' });
      if (!playoffRecord) return null;

      const matches = [
        ...playoff.semi_finals.map(m => ({
          playoff_id: playoffRecord.id,
          round: 'semi_final',
          home_team_id: m.home?.id,
          away_team_id: m.away?.id,
          status: 'scheduled'
        })),
        { playoff_id: playoffRecord.id, round: 'final', status: 'pending' }
      ];

      await db.insert('playoff_matches', matches);
      return playoffRecord.id;
    } catch(e) {
      console.error('Playoff save error:', e);
      return null;
    }
  }

  window.AAFI = window.AAFI || {};
  window.AAFI.playoff = { generatePlayoff, renderPlayoffBracket, savePlayoff };

  // Playoff page init
  document.addEventListener('DOMContentLoaded', function() {
    const playoffContainer = document.getElementById('playoff-bracket');
    if (!playoffContainer) return;

    // Demo playoff data
    const demoTop4 = [
      { id: '1', name: 'Thunder FC', logo_emoji: '🔵', points: 28 },
      { id: '2', name: 'Eagles SC', logo_emoji: '🔴', points: 25 },
      { id: '3', name: 'Lions FC', logo_emoji: '🟡', points: 22 },
      { id: '4', name: 'Phoenix AC', logo_emoji: '🟢', points: 20 }
    ];

    const demoPlayoff = {
      semi_finals: [
        { home: demoTop4[0], away: demoTop4[3], label: 'Semi Final 1 (1st vs 4th)', status: 'finished', home_score: 3, away_score: 1, winner_id: demoTop4[0].id },
        { home: demoTop4[1], away: demoTop4[2], label: 'Semi Final 2 (2nd vs 3rd)', status: 'finished', home_score: 2, away_score: 2, winner_id: demoTop4[2].id }
      ],
      final: { label: '🏆 GRAND FINAL', status: 'scheduled', home: demoTop4[0], away: demoTop4[2] }
    };

    renderPlayoffBracket(demoPlayoff, playoffContainer);

    // Top 4 table
    const top4Table = document.getElementById('top4-table-body');
    if (top4Table) {
      top4Table.innerHTML = demoTop4.map((team, i) => `
        <tr>
          <td class="pos" style="color:var(--accent)">${i + 1}</td>
          <td><div class="team-row"><span>${team.logo_emoji}</span><span style="font-weight:600">${team.name}</span></div></td>
          <td style="text-align:center;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;color:var(--primary)">${team.points}</td>
          <td><span class="badge badge-${i < 2 ? 'success' : 'primary'}">Qualified</span></td>
        </tr>
      `).join('');
    }
  });

})();
