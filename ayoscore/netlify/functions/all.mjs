import { getStore } from '@netlify/blobs';

// ── Seed data default (dipakai jika DB masih kosong) ──────────────────────────
const SEED = {
  ligas: [
    { id:1, nama:'Liga Super Indonesia', sport:'⚽ Sepak Bola', musim:'2025/2026', ds:'2025-09-01', de:'2026-05-30', photo:null, sistem:'double_rr', sisCfg:{} },
    { id:2, nama:'Copa Futsal Jakarta',  sport:'🎯 Futsal',     musim:'2026',      ds:'2026-01-10', de:'2026-06-30', photo:null, sistem:'round_robin', sisCfg:{} },
    { id:3, nama:'Liga Basket Nusantara',sport:'🏀 Basket',     musim:'2025/2026', ds:'2025-10-01', de:'2026-04-20', photo:null, sistem:'liga_playoff', sisCfg:{ playoffTeams:4 } },
  ],
  teams: [
    { id:1, ligaId:1, nama:'Garuda FC',          kota:'Jakarta',    color:'#ef4444', photo:null },
    { id:2, ligaId:1, nama:'Sriwijaya United',   kota:'Palembang',  color:'#f59e0b', photo:null },
    { id:3, ligaId:1, nama:'Majapahit City',     kota:'Surabaya',   color:'#10b981', photo:null },
    { id:4, ligaId:1, nama:'Borobudur Athletic', kota:'Yogyakarta', color:'#7c3aed', photo:null },
    { id:5, ligaId:2, nama:'MINU FC',            kota:'Jakarta',    color:'#00e5ff', photo:null },
    { id:6, ligaId:2, nama:'Saliwunto FS',       kota:'Balikpapan', color:'#ec4899', photo:null },
    { id:7, ligaId:3, nama:'Jakarta Bulls',      kota:'Jakarta',    color:'#ef4444', photo:null },
    { id:8, ligaId:3, nama:'Bandung Tigers',     kota:'Bandung',    color:'#f59e0b', photo:null },
  ],
  players: [
    { id:1,  teamId:1, nama:'Bima Sakti',      no:10, pos:'Penyerang', nisn:'1234567890', usia:24, tinggi:178, photo:null, gol:12, assist:5,  km:0 },
    { id:2,  teamId:1, nama:'Wahyu Pratama',   no:1,  pos:'Kiper',     nisn:'',           usia:27, tinggi:185, photo:null, gol:0,  assist:1,  km:0 },
    { id:3,  teamId:1, nama:'Aldi Kurniawan',  no:5,  pos:'Bertahan',  nisn:'',           usia:26, tinggi:182, photo:null, gol:1,  assist:2,  km:0 },
    { id:4,  teamId:1, nama:'Rendi Setiawan',  no:8,  pos:'Gelandang', nisn:'',           usia:23, tinggi:174, photo:null, gol:3,  assist:6,  km:0 },
    { id:5,  teamId:1, nama:'Fajar Maulana',   no:11, pos:'Penyerang', nisn:'',           usia:22, tinggi:170, photo:null, gol:5,  assist:3,  km:0 },
    { id:6,  teamId:1, nama:'Rizal Hasibuan',  no:3,  pos:'Bertahan',  nisn:'',           usia:28, tinggi:179, photo:null, gol:0,  assist:1,  km:0 },
    { id:7,  teamId:1, nama:'Dicky Pranata',   no:6,  pos:'Gelandang', nisn:'',           usia:25, tinggi:173, photo:null, gol:2,  assist:4,  km:0 },
    { id:8,  teamId:1, nama:'Yusuf Ramadan',   no:4,  pos:'Bertahan',  nisn:'',           usia:29, tinggi:183, photo:null, gol:0,  assist:0,  km:1 },
    { id:9,  teamId:1, nama:'Hendra Wijaya',   no:7,  pos:'Gelandang', nisn:'',           usia:24, tinggi:171, photo:null, gol:4,  assist:7,  km:0 },
    { id:10, teamId:1, nama:'Andri Santoso',   no:9,  pos:'Penyerang', nisn:'',           usia:21, tinggi:168, photo:null, gol:6,  assist:2,  km:0 },
    { id:11, teamId:1, nama:'Bayu Pratomo',    no:2,  pos:'Bertahan',  nisn:'',           usia:27, tinggi:180, photo:null, gol:1,  assist:0,  km:0 },
    { id:12, teamId:2, nama:'Rizki Maulana',   no:9,  pos:'Penyerang', nisn:'5678901234', usia:22, tinggi:173, photo:null, gol:9,  assist:7,  km:0 },
    { id:13, teamId:2, nama:'Sandi Kurnia',    no:1,  pos:'Kiper',     nisn:'',           usia:25, tinggi:184, photo:null, gol:0,  assist:0,  km:0 },
    { id:14, teamId:3, nama:'Dani Alves Jr',   no:7,  pos:'Gelandang', nisn:'',           usia:25, tinggi:172, photo:null, gol:7,  assist:11, km:1 },
    { id:15, teamId:4, nama:'Slamet Raharjo',  no:4,  pos:'Bertahan',  nisn:'',           usia:28, tinggi:180, photo:null, gol:2,  assist:1,  km:0 },
    { id:16, teamId:5, nama:'Eko Purnomo',     no:11, pos:'Pivot',     nisn:'',           usia:23, tinggi:170, photo:null, gol:8,  assist:6,  km:0 },
    { id:17, teamId:7, nama:'Kevin Anggara',   no:23, pos:'Gelandang', nisn:'',           usia:21, tinggi:175, photo:null, gol:15, assist:8,  km:0 },
  ],
  pelatihs: [
    { id:1, teamId:1, nama:'Bambang Hartono', jabatan:'Pelatih Kepala', usia:45, photo:null },
    { id:2, teamId:2, nama:'Agus Salim',      jabatan:'Pelatih Kepala', usia:42, photo:null },
  ],
  officials: [
    { id:1, teamId:1, nama:'Hendra Gunawan', jabatan:'Manajer Tim', hp:'0812-0003', photo:null },
  ],
  matches: [
    { id:1, ligaId:1, homeId:1, awayId:2, date:'2026-03-04', time:'19:00', status:'done',     scoreH:2, scoreA:1, venue:'GBK Jakarta',      round:1, fase:'Putaran 1' },
    { id:2, ligaId:1, homeId:3, awayId:4, date:'2026-03-04', time:'15:00', status:'done',     scoreH:1, scoreA:1, venue:'Gelora 10 Nov',     round:1, fase:'Putaran 1' },
    { id:3, ligaId:1, homeId:1, awayId:3, date:'2026-03-10', time:'19:00', status:'upcoming', scoreH:0, scoreA:0, venue:'GBK Jakarta',      round:2, fase:'Putaran 1' },
    { id:4, ligaId:1, homeId:2, awayId:4, date:'2026-03-11', time:'15:30', status:'live',     scoreH:1, scoreA:0, venue:'Jakabaring',       round:2, fase:'Putaran 1' },
    { id:5, ligaId:2, homeId:5, awayId:6, date:'2026-03-04', time:'10:30', status:'live',     scoreH:1, scoreA:0, venue:'GOR Futsal',       round:1, fase:'Liga'     },
    { id:6, ligaId:3, homeId:7, awayId:8, date:'2026-03-12', time:'18:00', status:'upcoming', scoreH:0, scoreA:0, venue:'GOR Balai Rakyat', round:1, fase:'Fase Liga' },
  ],
  evs: {
    1: [
      { id:1, type:'goal',   pid:1,  menit:23, ket:'' },
      { id:2, type:'assist', pid:4,  menit:23, ket:'' },
      { id:3, type:'yellow', pid:6,  menit:41, ket:'' },
      { id:4, type:'goal',   pid:1,  menit:67, ket:'' },
    ],
    2: [
      { id:5, type:'goal', pid:14, menit:35, ket:'' },
      { id:6, type:'goal', pid:15, menit:88, ket:'' },
    ],
    4: [{ id:7, type:'goal', pid:12, menit:12, ket:'' }],
    5: [{ id:8, type:'goal', pid:16, menit:7,  ket:'' }],
  },
  berita: [
    { id:1, judul:'Garuda FC Pimpin Klasemen',   cat:'hasil',  ligaId:1, konten:'Garuda FC menang 2-1 atas Sriwijaya United.',         emoji:'🏆', ts: Date.now()-3600000  },
    { id:2, judul:'Derby Jawa Pekan Depan!',      cat:'jadwal', ligaId:1, konten:'Garuda FC vs Majapahit City, 10 Maret 2026 pukul 19.00.', emoji:'📅', ts: Date.now()-7200000  },
    { id:3, judul:'MINU FC Unggul di Copa Futsal',cat:'hasil',  ligaId:2, konten:'MINU FC memimpin 1-0 atas Saliwunto FS.',             emoji:'🎯', ts: Date.now()-1800000  },
  ],
  kartu: [
    { id:1, matchId:1, playerId:6,  type:'yellow', menit:41, alasan:'Pelanggaran keras' },
    { id:2, matchId:2, playerId:14, type:'red',    menit:90, alasan:'Dua kartu kuning'  },
  ],
  lineups: {
    1: { starters:[1,2,3,4,5,6,7,8,9,10,11], cadangan:[] },
    2: { starters:[12,13], cadangan:[] },
  },
};

export default async (req) => {
  // Hanya izinkan GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error:'Method not allowed' }), { status:405 });
  }

  try {
    const store = getStore({ name:'ayoscore', consistency:'strong' });
    const raw   = await store.get('data');

    let data;
    if (!raw) {
      // Pertama kali: simpan seed ke Blobs
      await store.set('data', JSON.stringify(SEED));
      data = SEED;
    } else {
      data = JSON.parse(raw);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[all] Error:', err.message);
    // Fallback ke seed jika Blobs belum tersedia (local dev tanpa env)
    return new Response(JSON.stringify(SEED), {
      status: 200,
      headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' },
    });
  }
};

export const config = { path: '/api/all' };
