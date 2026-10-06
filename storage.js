(function () {
  var DB = 'deen-backup', ST = 'ls', KEY = 'snapshot', FLAG = 'deen-restored';
  function open() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(ST); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function snapshot() {
    var o = {};
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); o[k] = localStorage.getItem(k); } } catch (e) {}
    return o;
  }
  function save() {
    var o = snapshot();
    if (!Object.keys(o).length) return Promise.resolve();
    return open().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction(ST, 'readwrite'); tx.objectStore(ST).put(o, KEY);
        tx.oncomplete = tx.onerror = tx.onabort = function () { db.close(); res(); };
      });
    }).catch(function () {});
  }
  function load() {
    return open().then(function (db) {
      return new Promise(function (res) {
        var q = db.transaction(ST).objectStore(ST).get(KEY);
        q.onsuccess = function () { db.close(); res(q.result || null); };
        q.onerror = function () { db.close(); res(null); };
      });
    }).catch(function () { return null; });
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  var empty = true;
  try { empty = localStorage.length === 0; } catch (e) { return; }
  var t;
  function later() { clearTimeout(t); t = setTimeout(save, 400); }
  try {
    var P = Storage.prototype, s = P.setItem, r = P.removeItem;
    P.setItem = function () { var v = s.apply(this, arguments); if (this === localStorage) later(); return v; };
    P.removeItem = function () { var v = r.apply(this, arguments); if (this === localStorage) later(); return v; };
  } catch (e) {}
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') save(); });
  if (empty) {
    load().then(function (o) {
      if (!o || !Object.keys(o).length) return;
      try { sessionStorage.getItem(FLAG) } catch (e) { return; }
      if (sessionStorage.getItem(FLAG)) return;
      for (var k in o) { try { localStorage.setItem(k, o[k]); } catch (e) {} }
      sessionStorage.setItem(FLAG, '1');
      location.reload();
    });
  } else { save(); }
})();
