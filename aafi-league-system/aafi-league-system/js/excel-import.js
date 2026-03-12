// AAFI Excel Import Module (uses SheetJS)
(function() {
  'use strict';

  // Parse Excel file
  function parseExcel(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        if (!window.XLSX) {
          callback({ error: 'SheetJS not loaded. Add <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>' });
          return;
        }
        const workbook = window.XLSX.read(data, { type: 'array' });
        const result = {};

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          result[sheetName.toLowerCase()] = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
        });

        callback(null, result);
      } catch (err) {
        callback({ error: err.message });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Import teams from parsed data
  async function importTeams(teamsData, leagueId) {
    if (!window.AAFI?.db) return { imported: 0, errors: [] };
    const { db, TABLES } = window.AAFI;
    const errors = [];
    let imported = 0;

    for (const row of teamsData) {
      try {
        const team = {
          league_id: leagueId,
          name: row.name || row.Name || row.team_name || row['Team Name'],
          short_name: row.short_name || row['Short Name'] || '',
          city: row.city || row.City || '',
          color: row.color || row.Color || '#00d4ff',
          logo_emoji: row.emoji || row.logo_emoji || '⚽'
        };

        if (!team.name) {
          errors.push(`Row missing team name`);
          continue;
        }

        await db.insert(TABLES.teams, team);
        imported++;
      } catch(e) {
        errors.push(`Error importing team: ${e.message}`);
      }
    }

    return { imported, errors };
  }

  // Import players from parsed data
  async function importPlayers(playersData, teamMap) {
    if (!window.AAFI?.db) return { imported: 0, errors: [] };
    const { db, TABLES } = window.AAFI;
    const errors = [];
    let imported = 0;

    for (const row of playersData) {
      try {
        const teamName = row.team || row.Team || row.team_name || '';
        const teamId = teamMap[teamName.toLowerCase()];

        if (!teamId && teamName) {
          errors.push(`Team not found: ${teamName}`);
          continue;
        }

        const player = {
          team_id: teamId,
          name: row.name || row.Name || row.player_name || '',
          position: row.position || row.Position || 'Unknown',
          number: parseInt(row.number || row.Number || row['Jersey Number'] || 0) || 0,
          age: parseInt(row.age || row.Age || 0) || 0,
          nationality: row.nationality || row.Nationality || ''
        };

        if (!player.name) {
          errors.push('Row missing player name');
          continue;
        }

        await db.insert(TABLES.players, player);
        imported++;
      } catch(e) {
        errors.push(`Error importing player: ${e.message}`);
      }
    }

    return { imported, errors };
  }

  // Import schedule
  async function importSchedule(scheduleData, leagueId, teamMap) {
    if (!window.AAFI?.db) return { imported: 0, errors: [] };
    const { db, TABLES } = window.AAFI;
    const errors = [];
    let imported = 0;

    for (const row of scheduleData) {
      try {
        const homeTeam = (row.home || row['Home Team'] || '').trim();
        const awayTeam = (row.away || row['Away Team'] || '').trim();
        const homeId = teamMap[homeTeam.toLowerCase()];
        const awayId = teamMap[awayTeam.toLowerCase()];

        if (!homeId || !awayId) {
          errors.push(`Teams not found: ${homeTeam} vs ${awayTeam}`);
          continue;
        }

        const match = {
          league_id: leagueId,
          home_team_id: homeId,
          away_team_id: awayId,
          match_date: row.date || row.Date || new Date().toISOString(),
          week: parseInt(row.week || row.Week || row.round || row.Round || 1) || 1,
          round: parseInt(row.round || row.Round || row.week || 1) || 1,
          status: 'scheduled',
          venue: row.venue || row.Venue || ''
        };

        await db.insert(TABLES.matches, match);
        imported++;
      } catch(e) {
        errors.push(`Error importing match: ${e.message}`);
      }
    }

    return { imported, errors };
  }

  // Render import results
  function renderImportResults(results, container) {
    if (!container) return;
    container.innerHTML = `
      <div style="padding:1.25rem;background:var(--bg-elevated);border-radius:var(--radius-sm)">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem">
          <span style="font-size:1.5rem">${results.errors?.length > 0 ? '⚠️' : '✅'}</span>
          <div>
            <div style="font-weight:700">${results.imported} records imported</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">${results.errors?.length || 0} errors</div>
          </div>
        </div>
        ${results.errors?.length > 0 ? `
          <div style="max-height:150px;overflow-y:auto">
            ${results.errors.map(e => `<div style="font-size:0.8rem;color:var(--red);padding:0.2rem 0">⚠️ ${e}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // Generate Excel template
  function downloadTemplate(type) {
    if (!window.XLSX) {
      window.AAFI.showToast?.('Error', 'SheetJS library not loaded', 'error');
      return;
    }

    const templates = {
      teams: [
        { name: 'Thunder FC', short_name: 'THU', city: 'Manchester', color: '#00d4ff', emoji: '🔵' },
        { name: 'Eagles SC', short_name: 'EAG', city: 'London', color: '#ff1744', emoji: '🔴' }
      ],
      players: [
        { name: 'James Wilson', team: 'Thunder FC', position: 'ST', number: 9, age: 15, nationality: 'English' },
        { name: 'Carlos Martinez', team: 'Eagles SC', position: 'CM', number: 8, age: 14, nationality: 'Spanish' }
      ],
      schedule: [
        { home: 'Thunder FC', away: 'Eagles SC', date: '2024-09-01', week: 1, round: 1, venue: 'Stadium A' },
        { home: 'Lions FC', away: 'Phoenix AC', date: '2024-09-01', week: 1, round: 1, venue: 'Stadium B' }
      ]
    };

    const data = templates[type];
    if (!data) return;

    const ws = window.XLSX.utils.json_to_sheet(data);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, type);
    window.XLSX.writeFile(wb, `aafi_${type}_template.xlsx`);

    window.AAFI.showToast?.('Template Downloaded', `${type} template ready`, 'success');
  }

  window.AAFI = window.AAFI || {};
  window.AAFI.excel = { parseExcel, importTeams, importPlayers, importSchedule, renderImportResults, downloadTemplate };

  // ─── EXCEL IMPORT PAGE INIT ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    const uploadZone = document.getElementById('excel-upload-zone');
    const fileInput = document.getElementById('excel-file-input');
    if (!uploadZone || !fileInput) return;

    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', e => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));

    uploadZone.addEventListener('drop', e => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    });

    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) processFile(file);
    });

    function processFile(file) {
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        window.AAFI.showToast?.('Invalid File', 'Please upload an Excel (.xlsx, .xls) or CSV file', 'error');
        return;
      }

      window.AAFI.showToast?.('Processing', `Parsing ${file.name}...`, 'info');

      window.AAFI.excel.parseExcel(file, (err, data) => {
        if (err) {
          window.AAFI.showToast?.('Import Error', err.error, 'error');
          return;
        }

        const preview = document.getElementById('import-preview');
        if (preview) {
          let html = `<div style="margin-bottom:1rem"><strong>${file.name}</strong> - ${Object.keys(data).join(', ')} sheet(s)</div>`;
          Object.entries(data).forEach(([sheet, rows]) => {
            html += `<div class="mb-2"><div style="font-weight:700;text-transform:uppercase;font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">${sheet} (${rows.length} rows)</div>`;
            if (rows.length > 0) {
              const cols = Object.keys(rows[0]);
              html += `<div style="overflow-x:auto"><table class="admin-table"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 5).map(row => `<tr>${cols.map(c => `<td>${row[c]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
              if (rows.length > 5) html += `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.5rem">...and ${rows.length - 5} more rows</div>`;
            }
            html += '</div>';
          });
          preview.innerHTML = html;
        }

        // Store parsed data for import
        window._importData = data;
        document.getElementById('confirm-import-btn')?.removeAttribute('disabled');
        window.AAFI.showToast?.('File Parsed', `${Object.values(data).reduce((a, d) => a + d.length, 0)} records ready to import`, 'success');
      });
    }

    document.getElementById('confirm-import-btn')?.addEventListener('click', async function() {
      if (!window._importData) return;
      this.disabled = true;
      this.textContent = 'Importing...';

      const leagueId = document.getElementById('import-league-select')?.value || null;
      const results = { imported: 0, errors: [] };

      // Process each sheet
      if (window._importData.teams) {
        const r = await window.AAFI.excel.importTeams(window._importData.teams, leagueId);
        results.imported += r.imported;
        results.errors.push(...r.errors);
      }

      window.AAFI.excel.renderImportResults(results, document.getElementById('import-results'));
      this.textContent = 'Import Complete';
      window.AAFI.showToast?.('Import Complete', `${results.imported} records imported`, results.errors.length > 0 ? 'warning' : 'success');
    });

    // Template download buttons
    document.querySelectorAll('[data-download-template]').forEach(btn => {
      btn.addEventListener('click', function() {
        window.AAFI.excel.downloadTemplate(this.dataset.downloadTemplate);
      });
    });
  });

})();
