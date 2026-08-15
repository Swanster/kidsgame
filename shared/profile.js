(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Profiles = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEY = 'thk:profiles';
  var ACTIVE_KEY = 'thk:activeProfile';
  var store = null;
  var mem = { profiles: [], active: null };

  function defaultStore() {
    try {
      var ls = (typeof window !== 'undefined' && window.localStorage) || null;
      if (ls) {
        ls.setItem('__thk_probe__', '1');
        ls.removeItem('__thk_probe__');
        return ls;
      }
    } catch (e) { /* mode privat — pakai memori */ }
    return null;
  }

  function readAll() {
    if (!store) return mem.profiles;
    try {
      var raw = store.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function writeAll(list) {
    if (!store) { mem.profiles = list; return; }
    try { store.setItem(KEY, JSON.stringify(list)); } catch (e) { /* diam */ }
  }

  function readActiveId() {
    if (!store) return mem.active;
    try { return store.getItem(ACTIVE_KEY); } catch (e) { return null; }
  }

  function writeActiveId(id) {
    if (!store) { mem.active = id; return; }
    try { store.setItem(ACTIVE_KEY, id); } catch (e) { /* diam */ }
  }

  function freshId() {
    return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
  }

  function norm(p) {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string' || !p.name.trim()) return null;
    return {
      id: p.id,
      name: p.name.trim(),
      avatarId: (typeof p.avatarId === 'string' && p.avatarId) ? p.avatarId : 'star',
      scores: (p.scores && typeof p.scores === 'object') ? p.scores : {}
    };
  }

  function list() {
    var out = [];
    (readAll() || []).forEach(function (p) {
      var ok = norm(p);
      if (ok) out.push(ok);
    });
    return out;
  }

  function find(id) {
    return list().filter(function (p) { return p.id === id; })[0] || null;
  }

  function create(name, avatarId) {
    if (typeof name !== 'string' || !name.trim() || typeof avatarId !== 'string' || !avatarId) return null;
    var p = { id: freshId(), name: name.trim(), avatarId: avatarId, scores: {} };
    var all = list();
    all.push(p);
    writeAll(all);
    return p;
  }

  function activate(id) {
    if (!find(id)) return false;
    writeActiveId(id);
    return true;
  }

  function active() {
    var id = readActiveId();
    return id ? find(id) : null;
  }

  function addScore(gameId, stars) {
    var p = active();
    if (!p || typeof gameId !== 'string' || !gameId || typeof stars !== 'number' || stars < 0) return null;
    if (!(gameId in p.scores) || stars > p.scores[gameId]) {
      p.scores[gameId] = stars;
      var all = list();
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === p.id) all[i] = p;
      }
      writeAll(all);
    }
    return p.scores[gameId];
  }

  function getScore(profileId, gameId) {
    var p = find(profileId);
    if (!p || typeof gameId !== 'string' || !(gameId in p.scores)) return 0;
    return p.scores[gameId];
  }

  function init(storage) {
    if (arguments.length === 0) {
      store = defaultStore();
    } else {
      store = storage;
    }
  }

  init(); // auto-init localStorage saat dimuat; init() eksplisit untuk tes

  return {
    init: init, list: list, create: create, activate: activate,
    active: active, addScore: addScore, getScore: getScore
  };
});
