/* AyoScore — db-sync.js v4 (stable) */
const SUPA_URL = 'https://emolhieuyminzkoyalxy.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtb2xoaWV1eW1pbnprb3lhbHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU3MDQsImV4cCI6MjA4ODc4MTcwNH0.9XZ_XlDaYFaAb5revsUqHiAIWtCak80rFSjb6ZNR2ys';

(function startSync() {
  // Tunggu Supabase SDK + window.D tersedia
  if (!window.D || !window.supabase) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = function () { waitForD(); };
    s.onerror = function () { console.error('[db-sync] Gagal load Supabase SDK'); };
    document.head.appendChild(s);
    return;
  }
  waitForD();

  function waitForD() {
    if (window.D) init();
    else setTimeout(waitForD, 50);
  }
})();

function init() {
  var sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);
  var _ready  = false;
  var _timer  = null;
  var _saving = false;

  // ── Toast (tidak memblok klik) ───────────────────────────────────────────
  var toast = (function () {
    var el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'bottom:20px', 'right:20px', 'z-index:9999',
      'padding:9px 16px', 'border-radius:10px', 'font-size:11px',
      'font-weight:700', 'display:none', 'pointer-events:none',
      'box-shadow:0 4px 20px rgba(0,0,0,.5)', 'transition:opacity .3s',
      'max-width:240px', 'line-height:1.5',
    ].join(';');
    document.body.appendChild(el);

    var styles = {
      load:  'background:#1e1b4b;border:1px solid #6d28d9;color:#c4b5fd',
      save:  'background:#1e3a5f;border:1px solid #2563eb;color:#93c5fd',
      ok:    'background:#064e3b;border:1px solid #059669;color:#6ee7b7',
      rt:    'background:#064e3b;border:1px solid #059669;color:#6ee7b7',
      error: 'background:#450a0a;border:1px solid #dc2626;color:#fca5a5',
    };
    var icons = { load:'⏳ ', save:'💾 ', ok:'✅ ', rt:'📡 ', error:'❌ ' };
    var tid;

    return function (type, msg, persist) {
      el.style.cssText = el.style.cssText
        .replace(/background:[^;]+;?/g, '')
        .replace(/border:[^;]+;?/g, '')
        .replace(/color:[^;]+;?/g, '');
      el.style.cssText += ';' + styles[type];
      el.textContent   = icons[type] + msg;
      el.style.display = 'block';
      el.style.opacity = '1';
      clearTimeout(tid);
      if (!persist) {
        tid = setTimeout(function () {
          el.style.opacity = '0';
          setTimeout(function () { el.style.display = 'none'; }, 300);
        }, 2500);
      }
    };
  })();

  // ── Badge Realtime ───────────────────────────────────────────────────────
  var badge = (function () {
    var el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'bottom:20px', 'left:20px', 'z-index:9999',
      'padding:4px 12px', 'border-radius:18px', 'font-size:10px',
      'font-weight:800', 'display:none', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
    return {
      on:  function () {
        el.style.display = 'block';
        el.style.cssText += ';background:rgba(16,185,129,.15);border:1px solid #059669;color:#6ee7b7';
        el.textContent = '● REALTIME';
      },
      off: function () {
        el.style.display = 'block';
        el.style.cssText += ';background:rgba(239,68,68,.15);border:1px solid #dc2626;color:#fca5a5';
        el.textContent = '○ OFFLINE';
      },
    };
  })();

  // ── Re-render halaman aktif ──────────────────────────────────────────────
  function reRender() {
    var pid = (document.querySelector('.page.active') || {}).id || 'page-home';
    pid = pid.replace('page-', '');
    var MAP = {
      home:'renderHome', tim:'renderTim', klasemen:'renderKlasemen',
      jadwal:'renderJadwal', pemain:'renderPemain', lineup:'renderLineup',
      berita:'renderBerita', admin:'renderAdmin',
    };
    var fn = MAP[pid] || 'renderHome';
    if (typeof window[fn] === 'function') {
      try { window[fn](); } catch(e) { console.warn('[db-sync] reRender:', e); }
    }
  }

  // ── Load semua data dari Supabase ────────────────────────────────────────
  function loadAll(quiet) {
    if (!quiet) toast('load', 'Memuat data...', true);

    Promise.all([
      sb.from('ligas').select('*').order('id'),
      sb.from('teams').select('*').order('id'),
      sb.from('players').select('*').order('id'),
      sb.from('pelatihs').select('*').order('id'),
      sb.from('officials').select('*').order('id'),
      sb.from('matches').select('*').order('id'),
      sb.from('events').select('*').order('menit'),
      sb.from('berita').select('*').order('ts', { ascending: false }),
      sb.from('kartu').select('*').order('id'),
      sb.from('lineups').select('*').order('id'),
    ]).then(function (res) {
      var errs = res.map(function (r) { return r.error; }).filter(Boolean);
      if (errs.length) throw new Error(errs[0].message);

      var D = window.D;
      var ligas=res[0].data, teams=res[1].data, players=res[2].data,
          pelatihs=res[3].data, officials=res[4].data, matches=res[5].data,
          evRows=res[6].data, berita=res[7].data, kartu=res[8].data,
          linRows=res[9].data;

      D.ligas     = (ligas||[]).map(function(r){ return { id:r.id, nama:r.nama, sport:r.sport, musim:r.musim, ds:r.ds, de:r.de, photo:r.photo, sistem:r.sistem, sisCfg:r.sis_cfg||{} }; });
      D.teams     = (teams||[]).map(function(r){ return { id:r.id, ligaId:r.liga_id, nama:r.nama, kota:r.kota, color:r.color, photo:r.photo }; });
      D.players   = (players||[]).map(function(r){ return { id:r.id, teamId:r.team_id, nama:r.nama, no:r.no, pos:r.pos, nisn:r.nisn, usia:r.usia, tinggi:r.tinggi, photo:r.photo, gol:r.gol, assist:r.assist, km:r.km }; });
      D.pelatihs  = (pelatihs||[]).map(function(r){ return { id:r.id, teamId:r.team_id, nama:r.nama, jabatan:r.jabatan, usia:r.usia, photo:r.photo }; });
      D.officials = (officials||[]).map(function(r){ return { id:r.id, teamId:r.team_id, nama:r.nama, jabatan:r.jabatan, hp:r.hp, photo:r.photo }; });
      D.matches   = (matches||[]).map(function(r){ return { id:r.id, ligaId:r.liga_id, homeId:r.home_id, awayId:r.away_id, date:r.date, time:r.time, status:r.status, scoreH:r.score_h, scoreA:r.score_a, venue:r.venue, round:r.round, fase:r.fase }; });
      D.berita    = (berita||[]).map(function(r){ return { id:r.id, judul:r.judul, cat:r.cat, ligaId:r.liga_id, konten:r.konten, emoji:r.emoji, ts:r.ts }; });
      D.kartu     = (kartu||[]).map(function(r){ return { id:r.id, matchId:r.match_id, playerId:r.player_id, type:r.type, menit:r.menit, alasan:r.alasan }; });

      D.evs = {};
      (evRows||[]).forEach(function(e) {
        if (!D.evs[e.match_id]) D.evs[e.match_id] = [];
        D.evs[e.match_id].push({ id:e.id, type:e.type, pid:e.pid, menit:e.menit, ket:e.ket||'' });
      });

      D.lineups = {};
      (linRows||[]).forEach(function(l) {
        if (!D.lineups[l.team_id]) D.lineups[l.team_id] = { starters:[], cadangan:[] };
        D.lineups[l.team_id][l.status === 'starter' ? 'starters' : 'cadangan'].push(l.player_id);
      });

      var mx = function(a){ return a.length ? Math.max.apply(null, a.map(function(x){ return x.id||0; })) + 1 : 1; };
      D.nL=mx(D.ligas); D.nT=mx(D.teams); D.nP=mx(D.players);
      D.nPT=mx(D.pelatihs); D.nOF=mx(D.officials); D.nM=mx(D.matches);
      D.nB=mx(D.berita); D.nK=mx(D.kartu);
      var ef = [].concat.apply([], Object.values(D.evs)).map(function(e){ return e.id||0; });
      D.nEV = ef.length ? Math.max.apply(null, ef)+1 : 1;

      _ready = true;
      if (!quiet) toast('ok', 'Data dimuat ✓');
      reRender();

    }).catch(function(e) {
      _ready = true;
      toast('error', 'Gagal muat: ' + e.message);
      console.error('[db-sync] loadAll:', e);
    });
  }

  // ── Realtime subscription ────────────────────────────────────────────────
  function subscribeRealtime() {
    var TABLES = ['ligas','teams','players','pelatihs','officials','matches','events','berita','kartu','lineups'];
    var debounce = null;

    var ch = sb.channel('ayoscore-live');

    TABLES.forEach(function(tbl) {
      ch.on('postgres_changes', { event:'*', schema:'public', table:tbl }, function() {
        if (_saving) return; // admin tab lagi save, skip
        clearTimeout(debounce);
        debounce = setTimeout(function() {
          loadAll(true);
          toast('rt', 'Data diperbarui! 📡');
        }, 400);
      });
    });

    ch.subscribe(function(status) {
      console.log('[realtime]', status);
      if (status === 'SUBSCRIBED') {
        badge.on();
        toast('rt', 'Realtime aktif ✓');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        badge.off();
        setTimeout(subscribeRealtime, 5000); // auto reconnect
      } else if (status === 'CLOSED') {
        badge.off();
      }
    });
  }

  // ── Admin save ke Supabase ───────────────────────────────────────────────
  function scheduleSync() {
    if (!_ready) return;
    clearTimeout(_timer);
    toast('save', 'Menyimpan...', true);
    _timer = setTimeout(doSync, 800);
  }

  function doSync() {
    if (_saving) return;
    _saving = true;
    var D = window.D;

    var upserts = Promise.all([
      sb.from('ligas').upsert(D.ligas.map(function(l){ return { id:l.id, nama:l.nama, sport:l.sport, musim:l.musim, ds:l.ds||null, de:l.de||null, photo:l.photo||null, sistem:l.sistem, sis_cfg:l.sisCfg||{} }; }), { onConflict:'id' }),
      sb.from('teams').upsert(D.teams.map(function(t){ return { id:t.id, liga_id:t.ligaId, nama:t.nama, kota:t.kota||'', color:t.color, photo:t.photo||null }; }), { onConflict:'id' }),
      sb.from('players').upsert(D.players.map(function(p){ return { id:p.id, team_id:p.teamId, nama:p.nama, no:p.no||0, pos:p.pos, nisn:p.nisn||'', usia:p.usia||0, tinggi:p.tinggi||0, photo:p.photo||null, gol:p.gol||0, assist:p.assist||0, km:p.km||0 }; }), { onConflict:'id' }),
      sb.from('pelatihs').upsert(D.pelatihs.map(function(p){ return { id:p.id, team_id:p.teamId, nama:p.nama, jabatan:p.jabatan, usia:p.usia||0, photo:p.photo||null }; }), { onConflict:'id' }),
      sb.from('officials').upsert(D.officials.map(function(o){ return { id:o.id, team_id:o.teamId, nama:o.nama, jabatan:o.jabatan, hp:o.hp||'', photo:o.photo||null }; }), { onConflict:'id' }),
      sb.from('matches').upsert(D.matches.map(function(m){ return { id:m.id, liga_id:m.ligaId, home_id:m.homeId, away_id:m.awayId, date:m.date, time:m.time, status:m.status, score_h:m.scoreH||0, score_a:m.scoreA||0, venue:m.venue||'', round:m.round||1, fase:m.fase||'Liga' }; }), { onConflict:'id' }),
      sb.from('berita').upsert(D.berita.map(function(b){ return { id:b.id, judul:b.judul, cat:b.cat, liga_id:b.ligaId||null, konten:b.konten, emoji:b.emoji||'📰', ts:b.ts }; }), { onConflict:'id' }),
    ]);

    upserts.then(function(res) {
      var upErrs = res.map(function(r){ return r.error; }).filter(Boolean);
      if (upErrs.length) throw new Error(upErrs[0].message);

      // Events → delete + insert
      return sb.from('events').delete().gte('id', 0).then(function() {
        var allEvs = [];
        Object.keys(D.evs).forEach(function(mid) {
          (D.evs[mid]||[]).forEach(function(e) {
            allEvs.push({ id:e.id, match_id:parseInt(mid), type:e.type, pid:e.pid, menit:e.menit||1, ket:e.ket||'' });
          });
        });
        return allEvs.length ? sb.from('events').insert(allEvs) : Promise.resolve();
      });
    }).then(function() {
      // Kartu → delete + insert
      return sb.from('kartu').delete().gte('id', 0).then(function() {
        if (!D.kartu.length) return Promise.resolve();
        return sb.from('kartu').insert(D.kartu.map(function(k){ return { id:k.id, match_id:k.matchId, player_id:k.playerId, type:k.type, menit:k.menit||1, alasan:k.alasan||'Pelanggaran' }; }));
      });
    }).then(function() {
      // Lineups → delete + insert
      return sb.from('lineups').delete().gte('id', 0).then(function() {
        var rows = [];
        Object.keys(D.lineups).forEach(function(tid) {
          var lu = D.lineups[tid] || {};
          (lu.starters||[]).forEach(function(pid){ rows.push({ team_id:parseInt(tid), player_id:pid, status:'starter' }); });
          (lu.cadangan||[]).forEach(function(pid){ rows.push({ team_id:parseInt(tid), player_id:pid, status:'cadangan' }); });
        });
        return rows.length ? sb.from('lineups').insert(rows) : Promise.resolve();
      });
    }).then(function() {
      // Hapus orphan
      var deletes = [];
      if (D.ligas.length)   deletes.push(sb.from('ligas').delete().not('id','in','('+D.ligas.map(function(x){return x.id;})+')'));
      if (D.teams.length)   deletes.push(sb.from('teams').delete().not('id','in','('+D.teams.map(function(x){return x.id;})+')'));
      if (D.players.length) deletes.push(sb.from('players').delete().not('id','in','('+D.players.map(function(x){return x.id;})+')'));
      if (D.matches.length) deletes.push(sb.from('matches').delete().not('id','in','('+D.matches.map(function(x){return x.id;})+')'));
      if (D.berita.length)  deletes.push(sb.from('berita').delete().not('id','in','('+D.berita.map(function(x){return x.id;})+')'));
      return Promise.all(deletes);
    }).then(function() {
      toast('ok', 'Tersimpan! Pengunjung diupdate 📡');
      _saving = false;
    }).catch(function(e) {
      toast('error', 'Gagal: ' + e.message);
      console.error('[db-sync] doSync:', e);
      _saving = false;
    });
  }

  // ── Patch CRUD functions ─────────────────────────────────────────────────
  ['renderLists','renderEvList','showMsg','loadLinAdmin'].forEach(function(fn) {
    var orig = window[fn];
    window[fn] = function () {
      var r = orig ? orig.apply(this, arguments) : undefined;
      scheduleSync();
      return r;
    };
  });

  window._sb      = sb;
  window._loadAll = loadAll;
  window._doSync  = doSync;

  // ── Mulai ────────────────────────────────────────────────────────────────
  loadAll();
  subscribeRealtime();
}