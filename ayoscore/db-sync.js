/* ============================================================
   AyoScore — db-sync.js  GANTI dua baris ini:
   ============================================================ */
const SUPA_URL = 'YOUR_SUPABASE_URL';       // https://emolhieuyminzkoyalxy.supabase.co
const SUPA_KEY = 'YOUR_SUPABASE_ANON_KEY';  // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtb2xoaWV1eW1pbnprb3lhbHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU3MDQsImV4cCI6MjA4ODc4MTcwNH0.9XZ_XlDaYFaAb5revsUqHiAIWtCak80rFSjb6ZNR2ys

(async function () {
  'use strict';

  // ── Load Supabase SDK ────────────────────────────────────────────────────
  await new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);

  let _ready   = false;
  let _timer   = null;
  let _saving  = false;
  let _pollInt = null;
  let _lastTs  = 0; // timestamp data terakhir dimuat

  // ── Toast ─────────────────────────────────────────────────────────────────
  const T = document.createElement('div');
  T.style.cssText =
    'position:fixed;bottom:20px;right:20px;z-index:99999;padding:10px 20px;' +
    'border-radius:12px;font-size:12px;font-weight:700;display:none;' +
    'pointer-events:none;backdrop-filter:blur(14px);transition:opacity .3s;' +
    'box-shadow:0 4px 24px rgba(0,0,0,.6);max-width:280px;line-height:1.5;';
  document.body.appendChild(T);

  // Badge status koneksi di kiri bawah
  const Badge = document.createElement('div');
  Badge.style.cssText =
    'position:fixed;bottom:20px;left:20px;z-index:99999;padding:5px 12px;' +
    'border-radius:18px;font-size:10px;font-weight:700;display:flex;' +
    'align-items:center;gap:5px;cursor:pointer;transition:.3s;' +
    'background:rgba(100,116,139,.15);border:1px solid rgba(100,116,139,.3);color:#94a3b8;';
  Badge.innerHTML = '<span id="rt-dot" style="width:6px;height:6px;border-radius:50%;background:#94a3b8;display:inline-block"></span><span id="rt-lbl">Connecting...</span>';
  Badge.title = 'Klik untuk refresh data manual';
  Badge.onclick = () => loadAll();
  document.body.appendChild(Badge);

  function setBadge(status) {
    const dot = document.getElementById('rt-dot');
    const lbl = document.getElementById('rt-lbl');
    if (!dot || !lbl) return;
    const MAP = {
      connecting: { color:'#94a3b8', bg:'rgba(100,116,139,.15)', border:'rgba(100,116,139,.3)', text:'Connecting...' },
      live:       { color:'#10b981', bg:'rgba(16,185,129,.15)',  border:'rgba(16,185,129,.3)',  text:'🟢 LIVE' },
      polling:    { color:'#f59e0b', bg:'rgba(245,158,11,.15)',  border:'rgba(245,158,11,.3)',  text:'🟡 Auto-refresh' },
      offline:    { color:'#ef4444', bg:'rgba(239,68,68,.15)',   border:'rgba(239,68,68,.3)',   text:'🔴 Offline' },
    };
    const s = MAP[status] || MAP.connecting;
    dot.style.background = s.color;
    lbl.textContent      = s.text;
    Badge.style.background = s.bg;
    Badge.style.border     = `1px solid ${s.border}`;
    Badge.style.color      = s.color;
  }

  const STYLE = {
    load:  'background:rgba(139,92,246,.25);border:1px solid #7c3aed;color:#c4b5fd',
    save:  'background:rgba(59,130,246,.25);border:1px solid #2563eb;color:#93c5fd',
    ok:    'background:rgba(16,185,129,.25);border:1px solid #059669;color:#6ee7b7',
    warn:  'background:rgba(245,158,11,.25);border:1px solid #d97706;color:#fde68a',
    error: 'background:rgba(239,68,68,.25);border:1px solid #dc2626;color:#fca5a5',
  };
  const ICON = { load:'⏳', save:'💾', ok:'✅', warn:'⚠️', error:'❌' };

  function toast(type, msg, persist) {
    T.style.cssText = T.style.cssText
      .replace(/background:[^;]*;?/g,'')
      .replace(/border:[^;]*;?/g,'')
      .replace(/color:[^;]*;?/g,'') + ';' + STYLE[type];
    T.textContent = ICON[type] + ' ' + msg;
    T.style.display = 'block'; T.style.opacity = '1';
    clearTimeout(T._t);
    if (!persist) T._t = setTimeout(() => {
      T.style.opacity = '0';
      setTimeout(() => T.style.display = 'none', 300);
    }, 2800);
  }

  // ── Load semua data dari Supabase ─────────────────────────────────────────
  async function loadAll(silent) {
    if (!silent) toast('load', 'Memuat data...', true);
    try {
      const [
        { data: ligas,     error: e1 },
        { data: teams,     error: e2 },
        { data: players,   error: e3 },
        { data: pelatihs,  error: e4 },
        { data: officials, error: e5 },
        { data: matches,   error: e6 },
        { data: evRows,    error: e7 },
        { data: berita,    error: e8 },
        { data: kartu,     error: e9 },
        { data: linRows,   error: e10 },
      ] = await Promise.all([
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
      ]);

      const firstErr = [e1,e2,e3,e4,e5,e6,e7,e8,e9,e10].find(Boolean);
      if (firstErr) throw new Error(firstErr.message);

      const D = window.D;

      D.ligas     = (ligas||[]).map(r=>({ id:r.id, nama:r.nama, sport:r.sport, musim:r.musim, ds:r.ds, de:r.de, photo:r.photo, sistem:r.sistem, sisCfg:r.sis_cfg||{} }));
      D.teams     = (teams||[]).map(r=>({ id:r.id, ligaId:r.liga_id, nama:r.nama, kota:r.kota, color:r.color, photo:r.photo }));
      D.players   = (players||[]).map(r=>({ id:r.id, teamId:r.team_id, nama:r.nama, no:r.no, pos:r.pos, nisn:r.nisn||'', usia:r.usia, tinggi:r.tinggi, photo:r.photo, gol:r.gol, assist:r.assist, km:r.km }));
      D.pelatihs  = (pelatihs||[]).map(r=>({ id:r.id, teamId:r.team_id, nama:r.nama, jabatan:r.jabatan, usia:r.usia, photo:r.photo }));
      D.officials = (officials||[]).map(r=>({ id:r.id, teamId:r.team_id, nama:r.nama, jabatan:r.jabatan, hp:r.hp||'', photo:r.photo }));
      D.matches   = (matches||[]).map(r=>({ id:r.id, ligaId:r.liga_id, homeId:r.home_id, awayId:r.away_id, date:r.date, time:r.time, status:r.status, scoreH:r.score_h, scoreA:r.score_a, venue:r.venue, round:r.round, fase:r.fase }));
      D.berita    = (berita||[]).map(r=>({ id:r.id, judul:r.judul, cat:r.cat, ligaId:r.liga_id, konten:r.konten, emoji:r.emoji, ts:r.ts }));
      D.kartu     = (kartu||[]).map(r=>({ id:r.id, matchId:r.match_id, playerId:r.player_id, type:r.type, menit:r.menit, alasan:r.alasan }));

      D.evs = {};
      (evRows||[]).forEach(e => {
        if (!D.evs[e.match_id]) D.evs[e.match_id] = [];
        D.evs[e.match_id].push({ id:e.id, type:e.type, pid:e.pid, menit:e.menit, ket:e.ket||'' });
      });

      D.lineups = {};
      (linRows||[]).forEach(l => {
        if (!D.lineups[l.team_id]) D.lineups[l.team_id] = { starters:[], cadangan:[] };
        if (l.status === 'starter') D.lineups[l.team_id].starters.push(l.player_id);
        else D.lineups[l.team_id].cadangan.push(l.player_id);
      });

      const mx = a => a.length ? Math.max(...a.map(x => x.id || 0)) + 1 : 1;
      D.nL=mx(D.ligas); D.nT=mx(D.teams); D.nP=mx(D.players);
      D.nPT=mx(D.pelatihs); D.nOF=mx(D.officials); D.nM=mx(D.matches);
      D.nB=mx(D.berita); D.nK=mx(D.kartu);
      const ef = Object.values(D.evs).flat().map(e => e.id||0);
      D.nEV = ef.length ? Math.max(...ef)+1 : 1;

      _lastTs = Date.now();
      _ready  = true;
      if (!silent) toast('ok', 'Data dimuat ✓');
      reRender();
    } catch (e) {
      _ready = true;
      toast('error', 'Gagal muat: ' + e.message);
      console.error('[db-sync] loadAll:', e);
    }
  }

  // ── Re-render halaman aktif ───────────────────────────────────────────────
  function reRender() {
    const active = document.querySelector('.page.active');
    const pid    = active ? active.id.replace('page-', '') : 'home';
    const MAP    = {
      home: 'renderHome', tim: 'renderTim', klasemen: 'renderKlasemen',
      jadwal: 'renderJadwal', pemain: 'renderPemain', lineup: 'renderLineup',
      berita: 'renderBerita', liga: 'renderLiga', admin: 'renderAdmin',
    };
    const fn = MAP[pid];
    if (fn && typeof window[fn] === 'function') {
      if (fn === 'renderLiga') window.renderLiga(window._curLiga);
      else window[fn]();
    } else if (typeof window.renderHome === 'function') {
      window.renderHome();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAPIS 1: Supabase Broadcast Channel (paling cepat, tidak butuh setup DB)
  // Admin kirim sinyal → semua visitor langsung loadAll()
  // ─────────────────────────────────────────────────────────────────────────
  function setupBroadcast() {
    const ch = sb.channel('ayoscore-broadcast', {
      config: { broadcast: { self: false } } // jangan terima kiriman sendiri
    });

    ch.on('broadcast', { event: 'data_updated' }, () => {
      console.log('[realtime] broadcast diterima → loadAll');
      loadAll(true).then(() => toast('ok', '📡 Data diperbarui admin!'));
    });

    ch.subscribe((status) => {
      console.log('[broadcast] status:', status);
      if (status === 'SUBSCRIBED') {
        setBadge('live');
        toast('ok', 'Realtime aktif 🟢');
      }
    });

    return ch;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAPIS 2: Supabase Postgres Changes (backup, butuh replication aktif di DB)
  // ─────────────────────────────────────────────────────────────────────────
  function setupPostgresChanges() {
    const tables = ['ligas','teams','players','matches','berita','events','kartu','lineups'];
    const ch = sb.channel('ayoscore-db-changes');

    tables.forEach(tbl => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, () => {
        if (_saving) return;
        console.log('[postgres_changes] perubahan di:', tbl);
        loadAll(true).then(() => toast('ok', '📡 Data diperbarui!'));
      });
    });

    ch.subscribe((status) => {
      console.log('[postgres_changes] status:', status);
      if (status === 'SUBSCRIBED') setBadge('live');
    });

    return ch;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LAPIS 3: Polling setiap 10 detik (fallback paling andal)
  // ─────────────────────────────────────────────────────────────────────────
  function setupPolling() {
    clearInterval(_pollInt);
    setBadge('polling');
    _pollInt = setInterval(async () => {
      // Cek apakah ada perubahan sejak load terakhir
      // (pakai match terbaru sebagai proxy perubahan)
      try {
        const { data } = await sb.from('matches').select('id,score_h,score_a,status').order('id', { ascending: false }).limit(1);
        if (data && data[0]) {
          const sig = JSON.stringify(data[0]);
          if (sig !== _pollInt._last) {
            _pollInt._last = sig;
            loadAll(true).then(() => toast('ok', '🔄 Data diperbarui'));
          }
        }
      } catch (_) {}
    }, 10000); // tiap 10 detik
    console.log('[polling] aktif setiap 10 detik');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SYNC ke Supabase (admin save)
  // ─────────────────────────────────────────────────────────────────────────
  let _broadcastCh = null;

  function scheduleSync() {
    if (!_ready) return;
    clearTimeout(_timer);
    toast('save', 'Menyimpan...', true);
    _timer = setTimeout(doSync, 800);
  }

  async function doSync() {
    if (_saving) return;
    _saving = true;
    const D = window.D;

    try {
      // Upsert tabel utama
      const upserts = [
        sb.from('ligas').upsert(
          D.ligas.map(l => ({ id:l.id, nama:l.nama, sport:l.sport, musim:l.musim, ds:l.ds||null, de:l.de||null, photo:l.photo||null, sistem:l.sistem, sis_cfg:l.sisCfg||{} })),
          { onConflict:'id' }
        ),
        sb.from('teams').upsert(
          D.teams.map(t => ({ id:t.id, liga_id:t.ligaId, nama:t.nama, kota:t.kota||'', color:t.color, photo:t.photo||null })),
          { onConflict:'id' }
        ),
        sb.from('players').upsert(
          D.players.map(p => ({ id:p.id, team_id:p.teamId, nama:p.nama, no:p.no||0, pos:p.pos, nisn:p.nisn||'', usia:p.usia||0, tinggi:p.tinggi||0, photo:p.photo||null, gol:p.gol||0, assist:p.assist||0, km:p.km||0 })),
          { onConflict:'id' }
        ),
        sb.from('pelatihs').upsert(
          D.pelatihs.map(p => ({ id:p.id, team_id:p.teamId, nama:p.nama, jabatan:p.jabatan, usia:p.usia||0, photo:p.photo||null })),
          { onConflict:'id' }
        ),
        sb.from('officials').upsert(
          D.officials.map(o => ({ id:o.id, team_id:o.teamId, nama:o.nama, jabatan:o.jabatan, hp:o.hp||'', photo:o.photo||null })),
          { onConflict:'id' }
        ),
        sb.from('matches').upsert(
          D.matches.map(m => ({ id:m.id, liga_id:m.ligaId, home_id:m.homeId, away_id:m.awayId, date:m.date, time:m.time, status:m.status, score_h:m.scoreH||0, score_a:m.scoreA||0, venue:m.venue||'', round:m.round||1, fase:m.fase||'Liga' })),
          { onConflict:'id' }
        ),
        sb.from('berita').upsert(
          D.berita.map(b => ({ id:b.id, judul:b.judul, cat:b.cat, liga_id:b.ligaId||null, konten:b.konten, emoji:b.emoji||'📰', ts:b.ts })),
          { onConflict:'id' }
        ),
      ];
      await Promise.all(upserts);

      // Events — replace semua
      const allEvs = Object.entries(D.evs).flatMap(([mid, arr]) =>
        (arr||[]).map(e => ({ id:e.id, match_id:parseInt(mid), type:e.type, pid:e.pid, menit:e.menit, ket:e.ket||'' }))
      );
      await sb.from('events').delete().neq('id', 0);
      if (allEvs.length) await sb.from('events').upsert(allEvs);

      // Kartu — replace semua
      await sb.from('kartu').delete().neq('id', 0);
      if (D.kartu.length) await sb.from('kartu').upsert(
        D.kartu.map(k => ({ id:k.id, match_id:k.matchId, player_id:k.playerId, type:k.type, menit:k.menit, alasan:k.alasan||'' }))
      );

      // Lineups — replace semua
      await sb.from('lineups').delete().neq('id', 0);
      const linRows = [];
      Object.entries(D.lineups).forEach(([tid, lu]) => {
        (lu.starters||[]).forEach(pid => linRows.push({ team_id:parseInt(tid), player_id:pid, status:'starter' }));
        (lu.cadangan||[]).forEach(pid => linRows.push({ team_id:parseInt(tid), player_id:pid, status:'cadangan' }));
      });
      if (linRows.length) await sb.from('lineups').insert(linRows);

      // Hapus baris yang dihapus admin
      const del = async (tbl, ids) => {
        if (!ids.length) return;
        await sb.from(tbl).delete().not('id', 'in', `(${ids.join(',')})`);
      };
      await Promise.all([
        del('ligas',    D.ligas.map(x=>x.id)),
        del('teams',    D.teams.map(x=>x.id)),
        del('players',  D.players.map(x=>x.id)),
        del('pelatihs', D.pelatihs.map(x=>x.id)),
        del('officials',D.officials.map(x=>x.id)),
        del('matches',  D.matches.map(x=>x.id)),
        del('berita',   D.berita.map(x=>x.id)),
      ]);

      // ── KIRIM SINYAL KE SEMUA PENGUNJUNG ──────────────────────────────────
      if (_broadcastCh) {
        await _broadcastCh.send({
          type: 'broadcast',
          event: 'data_updated',
          payload: { ts: Date.now(), by: 'admin' }
        });
        console.log('[broadcast] sinyal terkirim ke semua pengunjung ✅');
      }

      toast('ok', 'Tersimpan! Semua pengunjung diupdate 📡');
    } catch (e) {
      toast('error', 'Gagal simpan: ' + e.message);
      console.error('[db-sync] doSync:', e);
    }
    _saving = false;
  }

  // ── Patch fungsi CRUD ────────────────────────────────────────────────────
  ['renderLists','renderEvList','showMsg','loadLinAdmin'].forEach(fn => {
    const orig = window[fn];
    window[fn] = function (...a) {
      const r = orig ? orig.apply(this, a) : undefined;
      scheduleSync();
      return r;
    };
  });

  // ── Expose ke global ─────────────────────────────────────────────────────
  window._sb      = sb;
  window._loadAll = loadAll;
  window._doSync  = doSync;

  // ── INIT ─────────────────────────────────────────────────────────────────
  async function init() {
    setBadge('connecting');

    // Load data pertama
    await loadAll();

    // Setup Broadcast (Lapis 1 — paling cepat)
    _broadcastCh = setupBroadcast();

    // Setup Postgres Changes (Lapis 2 — backup)
    setupPostgresChanges();

    // Setup Polling (Lapis 3 — fallback)
    setupPolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
