/* ============================================================
   AyoScore — db-sync.js  (Supabase + Realtime)
   Ganti dua baris di bawah dengan credentials Supabase kamu
   ============================================================ */
const SUPA_URL = 'YOUR_SUPABASE_URL';       // https://emolhieuyminzkoyalxy.supabase.co
const SUPA_KEY = 'YOUR_SUPABASE_ANON_KEY';  // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtb2xoaWV1eW1pbnprb3lhbHh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMDU3MDQsImV4cCI6MjA4ODc4MTcwNH0.9XZ_XlDaYFaAb5revsUqHiAIWtCak80rFSjb6ZNR2ys

(async function () {
  'use strict';

  // ── Load Supabase SDK dari CDN ──────────────────────────────────────────────
  await new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
  });

  let _ready  = false;
  let _timer  = null;
  let _saving = false;
  let _realtimeActive = false;

  // ── Toast ──────────────────────────────────────────────────────────────────
  const T = document.createElement('div');
  T.style.cssText =
    'position:fixed;bottom:20px;right:20px;z-index:99999;padding:10px 20px;' +
    'border-radius:12px;font-size:12px;font-weight:700;display:none;' +
    'pointer-events:none;backdrop-filter:blur(14px);transition:opacity .3s;' +
    'box-shadow:0 4px 24px rgba(0,0,0,.6);max-width:260px;line-height:1.4;';
  document.body.appendChild(T);

  // Badge realtime di pojok kiri bawah
  const RT = document.createElement('div');
  RT.style.cssText =
    'position:fixed;bottom:20px;left:20px;z-index:99999;padding:5px 12px;' +
    'border-radius:18px;font-size:10px;font-weight:700;display:flex;align-items:center;gap:5px;' +
    'background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#6ee7b7;';
  RT.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:#10b981;display:inline-block"></span> REALTIME';
  document.body.appendChild(RT);
  RT.style.display = 'none';

  const STYLE = {
    load:  'background:rgba(139,92,246,.25);border:1px solid #7c3aed;color:#c4b5fd',
    save:  'background:rgba(59,130,246,.25);border:1px solid #2563eb;color:#93c5fd',
    ok:    'background:rgba(16,185,129,.25);border:1px solid #059669;color:#6ee7b7',
    warn:  'background:rgba(245,158,11,.25);border:1px solid #d97706;color:#fde68a',
    error: 'background:rgba(239,68,68,.25);border:1px solid #dc2626;color:#fca5a5',
    rt:    'background:rgba(16,185,129,.25);border:1px solid #059669;color:#6ee7b7',
  };
  const ICON = { load:'⏳', save:'💾', ok:'✅', warn:'⚠️', error:'❌', rt:'📡' };

  function toast(type, msg, persist) {
    T.style.cssText = T.style.cssText.replace(/background:[^;]*;?/g,'').replace(/border:[^;]*;?/g,'').replace(/color:[^;]*;?/g,'') + ';' + STYLE[type];
    T.textContent = ICON[type] + ' ' + msg;
    T.style.display = 'block'; T.style.opacity = '1';
    clearTimeout(T._t);
    if (!persist) T._t = setTimeout(() => { T.style.opacity='0'; setTimeout(()=>T.style.display='none',300); }, 2800);
  }

  // ── Load semua data dari Supabase ──────────────────────────────────────────
  async function loadAll() {
    toast('load', 'Memuat data...', true);
    try {
      const [
        { data: ligas },   { data: teams },    { data: players },
        { data: pelatihs },{ data: officials }, { data: matches },
        { data: evRows },  { data: berita },    { data: kartu },
        { data: linRows },
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

      const D = window.D;

      // Map Supabase snake_case → frontend camelCase
      D.ligas     = (ligas||[]).map(r=>({ id:r.id, nama:r.nama, sport:r.sport, musim:r.musim, ds:r.ds, de:r.de, photo:r.photo, sistem:r.sistem, sisCfg:r.sis_cfg||{} }));
      D.teams     = (teams||[]).map(r=>({ id:r.id, ligaId:r.liga_id, nama:r.nama, kota:r.kota, color:r.color, photo:r.photo }));
      D.players   = (players||[]).map(r=>({ id:r.id, teamId:r.team_id, nama:r.nama, no:r.no, pos:r.pos, nisn:r.nisn, usia:r.usia, tinggi:r.tinggi, photo:r.photo, gol:r.gol, assist:r.assist, km:r.km }));
      D.pelatihs  = (pelatihs||[]).map(r=>({ id:r.id, teamId:r.team_id, nama:r.nama, jabatan:r.jabatan, usia:r.usia, photo:r.photo }));
      D.officials = (officials||[]).map(r=>({ id:r.id, teamId:r.team_id, nama:r.nama, jabatan:r.jabatan, hp:r.hp, photo:r.photo }));
      D.matches   = (matches||[]).map(r=>({ id:r.id, ligaId:r.liga_id, homeId:r.home_id, awayId:r.away_id, date:r.date, time:r.time, status:r.status, scoreH:r.score_h, scoreA:r.score_a, venue:r.venue, round:r.round, fase:r.fase }));
      D.berita    = (berita||[]).map(r=>({ id:r.id, judul:r.judul, cat:r.cat, ligaId:r.liga_id, konten:r.konten, emoji:r.emoji, ts:r.ts }));
      D.kartu     = (kartu||[]).map(r=>({ id:r.id, matchId:r.match_id, playerId:r.player_id, type:r.type, menit:r.menit, alasan:r.alasan }));

      // Bangun evs map: { matchId: [...events] }
      D.evs = {};
      (evRows||[]).forEach(e => {
        if (!D.evs[e.match_id]) D.evs[e.match_id] = [];
        D.evs[e.match_id].push({ id:e.id, type:e.type, pid:e.pid, menit:e.menit, ket:e.ket||'' });
      });

      // Bangun lineups map: { teamId: { starters:[...], cadangan:[...] } }
      D.lineups = {};
      (linRows||[]).forEach(l => {
        if (!D.lineups[l.team_id]) D.lineups[l.team_id] = { starters:[], cadangan:[] };
        if (l.status === 'starter') D.lineups[l.team_id].starters.push(l.player_id);
        else D.lineups[l.team_id].cadangan.push(l.player_id);
      });

      // Update ID counters
      const mx = a => a.length ? Math.max(...a.map(x=>x.id||0))+1 : 1;
      D.nL=mx(D.ligas); D.nT=mx(D.teams); D.nP=mx(D.players);
      D.nPT=mx(D.pelatihs); D.nOF=mx(D.officials); D.nM=mx(D.matches);
      D.nB=mx(D.berita); D.nK=mx(D.kartu);
      const ef=Object.values(D.evs).flat().map(e=>e.id||0);
      D.nEV = ef.length ? Math.max(...ef)+1 : 1;

      _ready = true;
      toast('ok', 'Data dimuat ✓');
      reRender();
    } catch (e) {
      _ready = true;
      toast('error', 'Gagal muat: ' + e.message);
      console.error('[db-sync] loadAll error:', e);
    }
  }

  // ── Re-render halaman yang sedang aktif ────────────────────────────────────
  function reRender() {
    const active = document.querySelector('.page.active');
    const pid = active ? active.id.replace('page-','') : 'home';
    const fn = {
      home: 'renderHome', liga: null, tim: 'renderTim',
      klasemen: 'renderKlasemen', jadwal: 'renderJadwal',
      pemain: 'renderPemain', lineup: 'renderLineup',
      berita: 'renderBerita', admin: 'renderAdmin',
    };
    const f = fn[pid];
    if (f && typeof window[f] === 'function') window[f]();
    else if (typeof window.renderHome === 'function') window.renderHome();
  }

  // ── Supabase Realtime — subscribe semua tabel ──────────────────────────────
  function subscribeRealtime() {
    const tables = ['ligas','teams','players','pelatihs','officials','matches','events','berita','kartu','lineups'];
    const ch = sb.channel('ayoscore-live');

    tables.forEach(tbl => {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, (payload) => {
        if (_saving) return; // admin lagi nulis, skip (akan loadAll setelah selesai)
        console.log('[realtime]', tbl, payload.eventType);
        loadAll(); // muat ulang semua data
      });
    });

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        _realtimeActive = true;
        RT.style.display = 'flex';
        toast('rt', 'Realtime aktif — halaman update otomatis!');
        console.log('[realtime] Connected ✅');
      } else if (status === 'CHANNEL_ERROR') {
        _realtimeActive = false;
        RT.style.display = 'none';
        toast('warn', 'Realtime terputus, coba refresh');
      }
    });

    return ch;
  }

  // ── Sync ke Supabase (admin save) ─────────────────────────────────────────
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
      // Upsert semua tabel secara paralel
      await Promise.all([
        // Ligas
        sb.from('ligas').upsert(
          D.ligas.map(l => ({ id:l.id, nama:l.nama, sport:l.sport, musim:l.musim, ds:l.ds, de:l.de, photo:l.photo, sistem:l.sistem, sis_cfg:l.sisCfg||{} })),
          { onConflict: 'id' }
        ),
        // Teams
        sb.from('teams').upsert(
          D.teams.map(t => ({ id:t.id, liga_id:t.ligaId, nama:t.nama, kota:t.kota, color:t.color, photo:t.photo })),
          { onConflict: 'id' }
        ),
        // Players
        sb.from('players').upsert(
          D.players.map(p => ({ id:p.id, team_id:p.teamId, nama:p.nama, no:p.no, pos:p.pos, nisn:p.nisn, usia:p.usia, tinggi:p.tinggi, photo:p.photo, gol:p.gol, assist:p.assist, km:p.km })),
          { onConflict: 'id' }
        ),
        // Pelatihs
        sb.from('pelatihs').upsert(
          D.pelatihs.map(p => ({ id:p.id, team_id:p.teamId, nama:p.nama, jabatan:p.jabatan, usia:p.usia, photo:p.photo })),
          { onConflict: 'id' }
        ),
        // Officials
        sb.from('officials').upsert(
          D.officials.map(o => ({ id:o.id, team_id:o.teamId, nama:o.nama, jabatan:o.jabatan, hp:o.hp, photo:o.photo })),
          { onConflict: 'id' }
        ),
        // Matches
        sb.from('matches').upsert(
          D.matches.map(m => ({ id:m.id, liga_id:m.ligaId, home_id:m.homeId, away_id:m.awayId, date:m.date, time:m.time, status:m.status, score_h:m.scoreH, score_a:m.scoreA, venue:m.venue, round:m.round, fase:m.fase })),
          { onConflict: 'id' }
        ),
        // Berita
        sb.from('berita').upsert(
          D.berita.map(b => ({ id:b.id, judul:b.judul, cat:b.cat, liga_id:b.ligaId||null, konten:b.konten, emoji:b.emoji, ts:b.ts })),
          { onConflict: 'id' }
        ),
      ]);

      // Events — delete lama, insert baru (lebih aman)
      const allEvs = Object.entries(D.evs).flatMap(([mid, arr]) =>
        (arr||[]).map(e => ({ id:e.id, match_id:parseInt(mid), type:e.type, pid:e.pid, menit:e.menit, ket:e.ket||'' }))
      );
      await sb.from('events').delete().neq('id', 0);
      if (allEvs.length) await sb.from('events').insert(allEvs);

      // Kartu — delete lama, insert baru
      await sb.from('kartu').delete().neq('id', 0);
      if (D.kartu.length) await sb.from('kartu').insert(
        D.kartu.map(k => ({ id:k.id, match_id:k.matchId, player_id:k.playerId, type:k.type, menit:k.menit, alasan:k.alasan }))
      );

      // Lineups — replace semua
      await sb.from('lineups').delete().neq('id', 0);
      const linRows = [];
      Object.entries(D.lineups).forEach(([tid, lu]) => {
        (lu.starters||[]).forEach(pid => linRows.push({ team_id:parseInt(tid), player_id:pid, status:'starter' }));
        (lu.cadangan||[]).forEach(pid => linRows.push({ team_id:parseInt(tid), player_id:pid, status:'cadangan' }));
      });
      if (linRows.length) await sb.from('lineups').insert(linRows);

      // Hapus data yang sudah dihapus dari frontend (orphan cleanup)
      const lidIds = D.ligas.map(x=>x.id);
      const tidIds = D.teams.map(x=>x.id);
      const pidIds = D.players.map(x=>x.id);
      const midIds = D.matches.map(x=>x.id);
      const bidIds = D.berita.map(x=>x.id);
      if (lidIds.length) await sb.from('ligas').delete().not('id', 'in', `(${lidIds})`);
      if (tidIds.length) await sb.from('teams').delete().not('id', 'in', `(${tidIds})`);
      if (pidIds.length) await sb.from('players').delete().not('id', 'in', `(${pidIds})`);
      if (midIds.length) await sb.from('matches').delete().not('id', 'in', `(${midIds})`);
      if (bidIds.length) await sb.from('berita').delete().not('id', 'in', `(${bidIds})`);

      toast('ok', 'Tersimpan! Semua pengunjung diupdate 📡');
    } catch (e) {
      toast('error', 'Gagal simpan: ' + e.message);
      console.error('[db-sync] doSync error:', e);
    }
    _saving = false;
  }

  // ── Patch fungsi CRUD agar auto-sync setelah admin ubah data ──────────────
  ['renderLists','renderEvList','showMsg','loadLinAdmin'].forEach(fn => {
    const orig = window[fn];
    window[fn] = function (...a) {
      const r = orig ? orig.apply(this, a) : undefined;
      scheduleSync();
      return r;
    };
  });

  // ── Expose ke global ───────────────────────────────────────────────────────
  window._supabase  = sb;
  window._loadAll   = loadAll;
  window._doSync    = doSync;

  // ── Init ──────────────────────────────────────────────────────────────────
  const init = async () => {
    await loadAll();
    subscribeRealtime();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
