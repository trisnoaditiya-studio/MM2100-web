/* =======================================================================
   MM2100 — Shared cross-app sync layer
   Satu sumber kebenaran status laporan, dipakai bersama oleh:
     - index.html   (portal tenant)
     - cms.html     (dashboard pengelola)
     - teknisi.html (aplikasi lapangan teknisi)
   Mekanisme: localStorage (same-origin) + BroadcastChannel untuk update
   real-time antar-tab. Menimpa status per NOMOR laporan — non-invasif,
   tidak mengubah data seed tiap aplikasi.
   Catatan: ini membuat demo terasa nyata dalam SATU browser. Untuk
   real-time lintas perangkat sungguhan tetap butuh backend (API + DB).
   ======================================================================= */
(function (global) {
  var KEY = 'mm2100_sync';
  var CH = ('BroadcastChannel' in global) ? new BroadcastChannel('mm2100') : null;

  function readMap() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function writeMap(m) {
    try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {}
  }

  /* Ambil record status 1 laporan (atau null). */
  function getStatus(no) { return readMap()[no] || null; }

  /* Semua record status. */
  function all() { return readMap(); }

  /* Tulis/merge perubahan status 1 laporan, lalu siarkan ke tab lain. */
  function setStatus(no, patch) {
    var m = readMap();
    var cur = m[no] || {};
    var next = {};
    var k;
    for (k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) next[k] = cur[k];
    for (k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
    next.no = no;
    next.updatedAt = Date.now();
    m[no] = next;
    writeMap(m);
    if (CH) { try { CH.postMessage({ no: no, at: next.updatedAt }); } catch (e) {} }
    return next;
  }

  /* Hapus seluruh status (reset demo). */
  function reset() { try { localStorage.removeItem(KEY); } catch (e) {} if (CH) { try { CH.postMessage({ reset: true }); } catch (e) {} } }

  /* techState teknisi -> status publik (tenant/CMS). */
  function statusFor(techState) {
    return ({
      masuk: 'Ditugaskan',
      menuju: 'Petugas menuju lokasi',
      lokasi: 'Dalam penanganan',
      selesai: 'Selesai',
      ditolak: 'Perlu ditugaskan'
    })[techState] || 'Perlu ditugaskan';
  }

  /* status publik -> tahap timeline 4 langkah (1..4; 5 = semua selesai). */
  function stageFor(status) {
    if (status === 'Selesai') return 5;
    if (status === 'Petugas menuju lokasi' || status === 'Dalam penanganan') return 3;
    if (status === 'Ditinjau' || status === 'Perlu ditugaskan' || status === 'Ditugaskan') return 2;
    return 1;
  }

  /* status publik -> kelas pill warna. */
  function pillFor(status) {
    if (status === 'Selesai') return 'pill-green';
    if (status === 'Dalam penanganan') return 'pill-amber';
    if (status === 'Perlu ditugaskan') return 'pill-red';
    return 'pill-blue'; /* Ditinjau / Ditugaskan / Petugas menuju lokasi */
  }

  /* Daftarkan callback saat ada perubahan (tab ini maupun tab lain). */
  function onChange(cb) {
    if (CH) { CH.addEventListener('message', function (e) { cb(e.data); }); }
    global.addEventListener('storage', function (e) { if (e.key === KEY) cb(); });
  }

  global.MMSync = {
    getStatus: getStatus,
    all: all,
    setStatus: setStatus,
    reset: reset,
    statusFor: statusFor,
    stageFor: stageFor,
    pillFor: pillFor,
    onChange: onChange
  };
})(window);
