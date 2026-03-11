(function () {
  'use strict';
  let _ready = false, _timer = null, _saving = false;

  const T = document.createElement('div');
  T.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;padding:10px 18px;' +
    'border-radius:11px;font-size:12px;font-weight:700;display:none;pointer-events:none;' +
    'backdrop-filter:blur(12px);box-shadow:0 4px 24px rgba(0,0,0,.6);transition:opacity .3s;';
  document.body.appendChild(T);

  const STYLE = {
    load:  'background:rgba(139,92,246,.25);border:1px solid #7c3aed;color:#c4b5fd',
    save:  'background:rgba(59,130,246,.25);border:1px solid #2563eb;color:#93c5fd',
    ok:    'background:rgba(16,185,129,.25);border:1px solid #059669;color:#6ee7b7',
    error: 'background:rgba(239,68,68,.25);border:1px solid #dc2626;color:#fca5a5',
  };
  const ICON = { load:'⏳', save:'💾', ok:'✅', error:'⚠️' };

  function toast(type, msg, persist) {
    T.style.cssText = T.style.cssText.replace(/background:[^;]*;?/g,'').replace(/border:[^;]*;?/g,'').replace(/color:[^;]*;?/g,'') + ';' + STYLE[type];
    T.textContent = ICON[type] + ' ' + msg;
    T.style.display = 'block'; T.style.opacity = '1';
    clearTimeout(T._t);
    if (!persist) T._t = setTimeout(() => { T.style.opacity='0'; setTimeout(()=>T.style.display='none',300); }, 2500);
  }

  function scheduleSync() {
    if (!_ready) return;
    clearTimeout(_timer);
    toast('save', 'Menyimpan...', true);
    _timer = setTimeout(doSync, 800);
  }

  async function doSync() {
    if (_saving) return; _saving = true;
    try {
      const res = await fetch('/api/sync', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(window.D) });
      const j = await res.json();
      toast(j.success ? 'ok' : 'error', j.success ? 'Tersimpan!' : 'Gagal simpan');
    } catch (_) { toast('error', 'Server tidak tersambung'); }
    _saving = false;
  }

  async function loadFromDB() {
    toast('load', 'Memuat data...', true);
    try {
      const res = await fetch('/api/all');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      const D = window.D;
      Object.assign(D, {
        ligas:d.ligas||[], teams:d.teams||[], players:d.players||[],
        pelatihs:d.pelatihs||[], officials:d.officials||[], matches:d.matches||[],
        evs:d.evs||{}, berita:d.berita||[], kartu:d.kartu||[], lineups:d.lineups||{}
      });
      const mx = a => a.length ? Math.max(...a.map(x=>x.id||0))+1 : 1;
      D.nL=mx(D.ligas); D.nT=mx(D.teams); D.nP=mx(D.players);
      D.nPT=mx(D.pelatihs); D.nOF=mx(D.officials); D.nM=mx(D.matches);
      D.nB=mx(D.berita); D.nK=mx(D.kartu);
      const ef=Object.values(D.evs).flat().map(e=>e.id||0);
      D.nEV = ef.length ? Math.max(...ef)+1 : 1;
      _ready = true;
      toast('ok', 'Data dimuat ✓');
      if (typeof window.renderHome === 'function') window.renderHome();
    } catch (e) {
      _ready = true;
      toast('error', 'Mode offline');
      console.warn('[db-sync]', e.message);
    }
  }

  ['renderLists','renderEvList','showMsg','loadLinAdmin'].forEach(fn => {
    const orig = window[fn];
    window[fn] = function (...a) { const r = orig?orig.apply(this,a):undefined; scheduleSync(); return r; };
  });

  window._sync = doSync; window._load = loadFromDB;
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', loadFromDB) : setTimeout(loadFromDB, 50);
})();