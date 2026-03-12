/* ============================================================
   AyoScore — db-sync.js  v3 (Fixed Realtime)
   Ganti YOUR_SUPABASE_URL dan YOUR_SUPABASE_ANON_KEY
   ============================================================ */
const SUPA_URL = 'https://emolhieuyminzkoyalxy.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtb2xoaWV1eW1pbnprb3lhbHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU3MDQsImV4cCI6MjA4ODc4MTcwNH0.9XZ_XlDaYFaAb5revsUqHiAIWtCak80rFSjb6ZNR2ys';

(async function () {
  'use strict';

  // ── Tunggu window.D tersedia ───────────────────────────────────────────────
  await new Promise(res => {
    const check = () => window.D ? res() : setTimeout(check, 50);
    check();
  });

  // ── Load Supabase SDK ──────────────────────────────────────────────────────
  if (!window.supabase) {
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY);

  let _ready  = false;
  let _timer  = null;
  let _saving = false;

  // ── Toast ──────────────────────────────────────────────────────────────────
  const T = document.createElement('div');
  T.style.cssText =
    'position:fixed;bottom:20px;right:20px;z-index:99999;padding:10px 20px;' +
    'border-radius:12px;font-size:12px;font-weight:700;display:none;' +
    'pointer-events:none;backdrop-filter:blur(14px);transition:opacity .35s;' +
    'box-shadow:0 4px 24px rgba(0,0,0,.6);max-width:280px;';
  document.body.appendChild(T);

  // Badge realtime pojok kiri bawah
  const RT = document.createElement('div');
  RT.style.cssText =
    'position:fixed;bottom:20px;left:20px;z-index:99999;padding:5px 13px;' +
    'border-radius:18px;font-size:10px;font-weight:800;display:none;' +
    'align-items:center;gap:6px;letter-spacing:.3px;';
  RT.innerHTML =
    '<span id="rt-dot" style="width:7px;height:7px;border-radius:50%;display:inline-block"></span>' +
    '<span id="rt-txt">REALTIME</span>';
  document.body.appendChild(RT);

  function setRT(on) {
    RT.style.display = 'flex';
    if (on) {
      RT.style.cssText += ';background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.35);color:#6ee7b7';
      document.getElementById('rt-dot').style.background = '#10b981';
      document.getElementById('rt-txt').textContent = 'REALTIME';
    } else {
      RT.style.cssText += ';background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.35);color:#fca5a5';
      document.getElementById('rt-dot').style.background = '#ef4444';
      document.getElementById('rt-txt').textContent = 'OFFLINE';
    }
  }

  const S = {
    load:  'background:rgba(139,92,246,.25);border:1px solid #7c3aed;color:#c4b5fd',
    save:  'background:rgba(59,130,246,.25);border:1px solid #2563eb;color:#93c5fd',
    ok:    'background:rgba(16,185,129,.25);border:1px solid #059669;color:#6ee7b7',
    rt:    'background:rgba(16,185,129,.25);border:1px solid #059669;color:#6ee7b7',
    warn:  'background:rgba(245,158,11,.25);border:1px solid #d97706;color:#fde68a',
    error: 'background:rgba(239,68,68,.25);border:1px solid #dc2626;color:#fca5a5',
  };
  const ICO = { load:'⏳',save:'💾',ok:'✅',rt:'📡',warn:'⚠️',error:'❌' };

  function toast(type, msg, persist) {
    // Reset style lama
    let base = T.style.cssText.replace(/background:[^;]*;?/g,'').replace(/border:[^;]*;?/g,'').replace(/color:[^;]*;?/g,'');
    T.setAttribute('style', base + ';' + S[type]);
    T.textContent = ICO[type] + ' ' + msg;
    T.style.display = 'block';
    T.style.opacity = '1';
    clearTimeout(T._hide);
    if (!persist) {
      T._hide = setTimeout(() => {
        T.style.opacity = '0';
        setTimeout(() => { T.style.display = 'none'; }, 350);
      }, 2800);
    }
  }

  // ── Re-render halaman aktif ────────────────────────────────────────────────
  function reRender() {
    try {
      const pid = (document.querySelector('.page.active')?.id || 'page-home').replace('page-','');
      const MAP = {
        home:'renderHome', tim:'renderTim', klasemen:'renderKlasemen',
        jadwal:'renderJadwal', pemain:'renderPemain', lineup:'renderLineup',
        berita:'renderBerita', admin:'renderAdmin',
      };
      const fn = MAP[pid] || 'renderHome';
      if (typeof window[fn] === 'function') window[fn]();
    } catch(e) { console.warn('[db-sync] reRender:', e.message); }
  }

  // ── Load semua data dari Supabase ──────────────────────────────────────────
  async function loadAll(quiet) {
    if (!quiet) toast('load', 'Memuat data...', true);
    try {
      const [
        { data: ligas,    error: e1 },
        { data: teams,    error: e2 },
        { data: players,  error: e3 },
        { data: pelatihs, error: e4 },
        { data: officials,error: e5 },
        { data: matches,  error: e6 },
        { data: evRows,   error: e7 },
        { data: berita,   error: e8 },
        { data: kartu,    error: e9 },
        { data: linRows,  error: e10},
      ] = await Promise.all([
        sb.from('ligas').select('*').order('id'),
        sb.from('teams').select('*').order('id'),
        sb.from('players').select('*').order('id'),
        sb.from('pelatihs').select('*').order('id'),
        sb.from('officials').select('*').order('id'),
        sb.from('matches').select('*').order('id'),
        sb.from('events').select('*').order('menit'),
        sb.from('berita').select('*').order('ts', { ascending:false }),
        sb.from('kartu').select('*').order('id'),
        sb.from('lineups').select('*').order('id'),
      ]);

      // Cek error
      const errs = [e1,e2,e3,e4,e5,e6,e7,e8,e9,e10].filter(Boolean);
      if (errs.length) throw new Error(errs[0].message);

      const D = window.D;

      // Map ke camelCase
      D.ligas     = (ligas||[]).map(r => ({ id:r.id, nama:r.nama, sport:r.sport, musim:r.musim, ds:r.ds, de:r.de, photo:r.photo, sistem:r.sistem, sisCfg:r.sis_cfg||{} }));
      D.teams     = (teams||[]).map(r => ({ id:r.id, ligaId:r.liga_id, nama:r.nama, kota:r.kota, color:r.color, photo:r.photo }));
      D.players   = (players||[]).map(r => ({ id:r.id, teamId:r.team_id, nama:r.nama, no:r.no, pos:r.pos, nisn:r.nisn, usia:r.usia, tinggi:r.tinggi, photo:r.photo, gol:r.gol, assist:r.assist, km:r.km }));
      D.pelatihs  = (pelatihs||[]).map(r => ({ id:r.id, teamId:r.team_id, nama:r.nama, jabatan:r.jabatan, usia:r.usia, photo:r.photo }));
      D.officials = (officials||[]).map(r => ({ id:r.id, teamId:r.team_id, nama:r.nama, jabatan:r.jabatan, hp:r.hp, photo:r.photo }));
      D.matches   = (matches||[]).map(r => ({ id:r.id, ligaId:r.liga_id, homeId:r.home_id, awayId:r.away_id, date:r.date, time:r.time, status:r.status, scoreH:r.score_h, scoreA:r.score_a, venue:r.venue, round:r.round, fase:r.fase }));
      D.berita    = (berita||[]).map(r => ({ id:r.id, judul:r.judul, cat:r.cat, ligaId:r.liga_id, konten:r.konten, emoji:r.emoji, ts:r.ts }));
      D.kartu     = (kartu||[]).map(r => ({ id:r.id, matchId:r.match_id, playerId:r.player_id, type:r.type, menit:r.menit, alasan:r.alasan }));

      // Build evs { matchId: [...] }
      D.evs = {};
      (evRows||[]).forEach(e => {
        if (!D.evs[e.match_id]) D.evs[e.match_id] = [];
        D.evs[e.match_id].push({ id:e.id, type:e.type, pid:e.pid, menit:e.menit, ket:e.ket||'' });
      });

      // Build lineups { teamId: { starters, cadangan } }
      D.lineups = {};
      (linRows||[]).forEach(l => {
        if (!D.lineups[l.team_id]) D.lineups[l.team_id] = { starters:[], cadangan:[] };
        D.lineups[l.team_id][l.status === 'starter' ? 'starters' : 'cadangan'].push(l.player_id);
      });

      // Update ID counters
      const mx = a => a.length ? Math.max(...a.map(x => x.id||0)) + 1 : 1;
      D.nL=mx(D.ligas); D.nT=mx(D.teams); D.nP=mx(D.players);
      D.nPT=mx(D.pelatihs); D.nOF=mx(D.officials); D.nM=mx(D.matches);
      D.nB=mx(D.berita); D.nK=mx(D.kartu);
      const ef = Object.values(D.evs).flat().map(e => e.id||0);
      D.nEV = ef.length ? Math.max(...ef) + 1 : 1;

      _ready = true;
      if (!quiet) toast('ok', 'Data dimuat ✓');
      reRender();
    } catch(e) {
      _ready = true;
      toast('error', 'Gagal muat: ' + e.message);
      console.error('[db-sync] loadAll:', e);
    }
  }

  // ── Realtime subscription ──────────────────────────────────────────────────
  function subscribeRealtime() {
    const TABLES = ['ligas','teams','players','pelatihs','officials','matches','events','berita','kartu','lineups'];
    let debounceRT = null;

    const ch = sb.channel('ayoscore-v3', {
      config: { broadcast: { self: false } }  // admin tab tidak terima event miliknya sendiri
    });

    TABLES.forEach(tbl => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, () => {
        // Debounce 300ms agar tidak loadAll berkali-kali dalam 1 detik
        clearTimeout(debounceRT);
        debounceRT = setTimeout(() => {
          // Jangan reload kalau tab ini sedang proses save (hanya admin tab)
          if (!_saving) {
            console.log('[realtime] perubahan terdeteksi → reload data');
            loadAll(true); // quiet=true, tidak tampilkan toast "Memuat..."
            toast('rt', 'Data diperbarui!');
          }
        }, 300);
      });
    });

    ch.subscribe(status => {
      console.log('[realtime] status:', status);
      if (status === 'SUBSCRIBED') {
        setRT(true);
        toast('rt', 'Realtime aktif 📡');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setRT(false);
        // Coba reconnect 5 detik kemudian
        setTimeout(subscribeRealtime, 5000);
      } else if (status === 'CLOSED') {
        setRT(false);
      }
    });

    return ch;
  }

  // ── Sync admin ke Supabase ─────────────────────────────────────────────────
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
      // Upsert tabel utama paralel
      const ups = await Promise.all([
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
      ]);

      // Cek error upsert
      const upErrs = ups.map(r => r.error).filter(Boolean);
      if (upErrs.length) throw new Error('Upsert: ' + upErrs[0].message);

      // Events — replace semua (delete + insert)
      await sb.from('events').delete().gte('id', 0);
      const allEvs = Object.entries(D.evs).flatMap(([mid, arr]) =>
        (arr||[]).map(e => ({ id:e.id, match_id:parseInt(mid), type:e.type, pid:e.pid, menit:e.menit||1, ket:e.ket||'' }))
      );
      if (allEvs.length) {
        const { error: evErr } = await sb.from('events').insert(allEvs);
        if (evErr) throw new Error('Events: ' + evErr.message);
      }

      // Kartu — replace semua
      await sb.from('kartu').delete().gte('id', 0);
      if (D.kartu.length) {
        const { error: kErr } = await sb.from('kartu').insert(
          D.kartu.map(k => ({ id:k.id, match_id:k.matchId, player_id:k.playerId, type:k.type, menit:k.menit||1, alasan:k.alasan||'Pelanggaran' }))
        );
        if (kErr) throw new Error('Kartu: ' + kErr.message);
      }

      // Lineups — replace semua
      await sb.from('lineups').delete().gte('id', 0);
      const linRows = [];
      Object.entries(D.lineups).forEach(([tid, lu]) => {
        (lu.starters||[]).forEach(pid => linRows.push({ team_id:parseInt(tid), player_id:pid, status:'starter' }));
        (lu.cadangan||[]).forEach(pid => linRows.push({ team_id:parseInt(tid), player_id:pid, status:'cadangan' }));
      });
      if (linRows.length) {
        const { error: lErr } = await sb.from('lineups').insert(linRows);
        if (lErr) throw new Error('Lineups: ' + lErr.message);
      }

      // Hapus baris yang sudah dihapus di frontend (orphan cleanup)
      await Promise.all([
        D.ligas.length    && sb.from('ligas').delete().not('id','in',`(${D.ligas.map(x=>x.id)})`),
        D.teams.length    && sb.from('teams').delete().not('id','in',`(${D.teams.map(x=>x.id)})`),
        D.players.length  && sb.from('players').delete().not('id','in',`(${D.players.map(x=>x.id)})`),
        D.matches.length  && sb.from('matches').delete().not('id','in',`(${D.matches.map(x=>x.id)})`),
        D.berita.length   && sb.from('berita').delete().not('id','in',`(${D.berita.map(x=>x.id)})`),
      ].filter(Boolean));

      toast('ok', 'Tersimpan! Semua pengunjung diupdate 📡');
    } catch(e) {
      toast('error', 'Gagal: ' + e.message);
      console.error('[db-sync] doSync:', e);
    }
    _saving = false;
  }

  // ── Patch fungsi CRUD ──────────────────────────────────────────────────────
  ['renderLists','renderEvList','showMsg','loadLinAdmin'].forEach(fn => {
    const orig = window[fn];
    window[fn] = function (...a) {
      const r = orig ? orig.apply(this, a) : undefined;
      scheduleSync();
      return r;
    };
  });

  // ── Expose ─────────────────────────────────────────────────────────────────
  window._sb      = sb;
  window._loadAll = loadAll;
  window._doSync  = doSync;

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    await loadAll();
    subscribeRealtime();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();