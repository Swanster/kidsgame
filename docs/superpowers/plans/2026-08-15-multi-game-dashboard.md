# Multi-Game Dashboard (Fondasi) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun dashboard pemilih game ramah anak (profil per anak + bintang terbaik per game) dan migrasikan Temukan Hewan ke struktur multi-game.

**Architecture:** Multi-halaman — dashboard di root (`index.html`), tiap game di `games/<id>/` dengan halaman sendiri, modul bersama di `shared/` (UMD-lite, `globalThis` di dalam factory, `module.exports` untuk Node). Navigasi tautan relatif → jalan di `file://` dan `http://`.

**Tech Stack:** Vanilla HTML/CSS/JS, nol dependensi, `localStorage`, `node --test`.

## Global Constraints

- Zero dependencies, zero build, zero network: tidak ada import/paket; semua aset inline/dekat.
- Wajib jalan dari `file://` MAUPUN `http://` (server statis apa pun) dengan `<script>` klasik (bukan ES module).
- Pola modul UMD-lite: `(function (root, factory){ if (module.exports) module.exports = factory(); else root.NAME = factory(); })(typeof self !== 'undefined' ? self : this, function () { … })`. Di dalam factory, deklarasikan `var root = (typeof globalThis !== 'undefined') ? globalThis : (typeof self !== 'undefined' ? self : this);` bila memakai `root.*` (lihat `shared/audio.js`). JANGAN pernah pakai `root` polos dari parameter IIFE di dalam factory.
- Bahasa UI: Indonesia. TTS id-ID dengan fallback visual; efek Web Audio opsional (game tetap jalan tanpa suara).
- Interaksi `pointerdown` (sentuh + mouse); target sentuh ≥96px.
- Ikon fungsional = SVG inline, BUKAN emoji.
- `localStorage` diblokir (mode privat) → aplikasi tetap jalan, progres hanya sesi (fallback memori).
- Command test: `node --test` (bare, auto-discovery dari root). CATATAN: bentuk direktori `node --test tests/` GAGAL; bentuk per-file `node --test path/file.test.js` berfungsi.

---

### Task 1: Migrasi mekanis Temukan Hewan + shared/audio.js

**Files:**
- Move: `audio.js` → `shared/audio.js`
- Move: `index.html`, `game.js`, `style.css`, `rounds.js`, `animals.js`, `tests/` → `games/temukan-hewan/`
- Modify: `games/temukan-hewan/index.html:42-45` (path script/link)
- Modify: `games/temukan-hewan/tests/audio.test.js:3` (path require)

**Interfaces:**
- Consumes: (tidak ada — file gerak murni)
- Produces: `shared/audio.js` dengan global `window.GameAudio` (API: `unlock`, `speak`, `fx`, `setMuted`, `isMuted`, `primeVoices`, `pickIdVoice`, `ctxState`) dan `module.exports` untuk Node; game di `games/temukan-hewan/` dengan 12 tes lama.

- [ ] **Step 1: Pindahkan file dengan git**

Run:
```bash
cd /home/swanster/projects/games/games-kay
mkdir -p shared games/temukan-hewan
git mv audio.js shared/audio.js
git mv index.html game.js style.css rounds.js animals.js games/temukan-hewan/
git mv tests games/temukan-hewan/tests
```
Hasil: `index.html`, `game.js`, `style.css`, `rounds.js`, `animals.js`, `tests/` ada di `games/temukan-hewan/`; `shared/audio.js` di root.

- [ ] **Step 2: Sesuaikan path script di `games/temukan-hewan/index.html`**

Isi `index.html` saat ini (script terakhir dalam `<body>`):
```html
  <script src="animals.js"></script>
  <script src="rounds.js"></script>
  <script src="audio.js"></script>
  <script src="game.js"></script>
```
Ubah menjadi:
```html
  <script src="animals.js"></script>
  <script src="rounds.js"></script>
  <script src="../../shared/audio.js"></script>
  <script src="game.js"></script>
```
(`<link rel="stylesheet" href="style.css">` tetap — file satu folder.)

- [ ] **Step 3: Sesuaikan require di `games/temukan-hewan/tests/audio.test.js`**

Baris 3: `const GameAudio = require('../audio.js');` → `const GameAudio = require('../../shared/audio.js');`

- [ ] **Step 4: Jalankan seluruh suite dari root**

Run (dari root repo): `node --test`
Expected: `ℹ tests 12`, `ℹ pass 12`, `ℹ fail 0`.
Jika bare discovery TIDAK menemukan tes bersarang (Node lama), fallback:
`node --test games/temukan-hewan/tests/rounds.test.js games/temukan-hewan/tests/animals.test.js games/temukan-hewan/tests/audio.test.js`

- [ ] **Step 5: Smoke halaman game via browser (file://)**

Buka `file:///home/swanster/projects/games/games-kay/games/temukan-hewan/index.html` → klik `#btn-start` → grid kartu muncul; console tidak ada error; `window.GameAudio.ctxState()` = `running` setelah start.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move Temukan Hewan into games/ and audio into shared/"
```

---

### Task 2: shared/avatars.js + tes

**Files:**
- Create: `shared/avatars.js`
- Test: `shared/tests/avatars.test.js`

**Interfaces:**
- Consumes: (tidak ada)
- Produces: `window.Avatars.AVATARS` — array 6 objek `{ id, name, svg }` (id unik, svg string SVG inline). Dipakai Task 5 (pemilih avatar).

- [ ] **Step 1: Tulis tes gagal**

```js
const test = require('node:test');
const assert = require('node:assert');
const { AVATARS } = require('../avatars.js');

test('memiliki 6 avatar', () => {
  assert.strictEqual(AVATARS.length, 6);
});

test('id unik, nama & svg tidak kosong', () => {
  const ids = new Set();
  AVATARS.forEach((a) => {
    assert.ok(a.id && typeof a.id === 'string');
    assert.ok(!ids.has(a.id), 'id duplikat: ' + a.id);
    ids.add(a.id);
    assert.ok(a.name && a.name.trim().length > 0);
    assert.ok(a.svg.includes('<svg') && a.svg.includes('</svg>'));
  });
});
```

- [ ] **Step 2: Run — pastikan gagal**

Run: `node --test shared/tests/avatars.test.js`
Expected: FAIL (`Cannot find module '../avatars.js'`).

- [ ] **Step 3: Implementasi `shared/avatars.js`**

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Avatars = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var AVATARS = [
    { id: 'cat', name: 'Kucing', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 20 L6 10 L16 14 L24 6 L32 14 L42 10 L36 20 Q42 28 42 34 Q42 42 24 42 Q6 42 6 34 Q6 28 12 20 Z" fill="#F2A65E"/><path d="M14 24 L20 24 L20 30 L14 30 Z M28 24 L34 24 L34 30 L28 30 Z" fill="#3E2723"/><path d="M20 34 Q24 38 28 34" stroke="#3E2723" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="17" cy="36" r="1.6" fill="#F48FB1"/><circle cx="31" cy="36" r="1.6" fill="#F48FB1"/></svg>' },
    { id: 'duck', name: 'Bebek', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="16" cy="30" r="12" fill="#FFD54F"/><circle cx="30" cy="20" r="9" fill="#FFC107"/><path d="M37 14 L46 20 L37 24 Z" fill="#F57C00"/><circle cx="33" cy="16" r="1.8" fill="#3E2723"/></svg>' },
    { id: 'fish', name: 'Ikan', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 18 L20 24 L6 30 Z" fill="#42A5F5"/><ellipse cx="28" cy="24" rx="14" ry="10" fill="#64B5F6"/><circle cx="34" cy="21" r="2" fill="#0D47A1"/><path d="M24 16 L26 24 L24 32 Z" fill="#E3F2FD"/></svg>' },
    { id: 'rabbit', name: 'Kelinci', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 24 L14 8 Q20 2 20 12 Z" fill="#B0BEC5"/><path d="M30 24 L34 8 Q28 2 28 12 Z" fill="#B0BEC5"/><ellipse cx="24" cy="32" rx="14" ry="12" fill="#CFD8DC"/><circle cx="18" cy="30" r="2" fill="#37474F"/><circle cx="30" cy="30" r="2" fill="#37474F"/><path d="M21 38 Q24 41 27 38" stroke="#EF9A9A" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
    { id: 'car', name: 'Mobil', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="22" width="36" height="12" rx="4" fill="#EF5350"/><path d="M14 14 L9 22 L39 22 L34 14 Z" fill="#90CAF9"/><circle cx="16" cy="36" r="4" fill="#263238"/><circle cx="32" cy="36" r="4" fill="#263238"/><rect x="18" y="18" width="6" height="4" fill="#BBDEFB"/><rect x="26" y="18" width="6" height="4" fill="#BBDEFB"/></svg>' },
    { id: 'star', name: 'Bintang', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 L29.5 18.5 L44 20 L33 30 L36.5 45 L24 37 L11.5 45 L15 30 L4 20 L18.5 18.5 Z" fill="#FFD54F"/></svg>' }
  ];
  return { AVATARS: AVATARS };
});
```

- [ ] **Step 4: Run — pastikan lulus**

Run: `node --test shared/tests/avatars.test.js`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add shared/avatars.js shared/tests/avatars.test.js
git commit -m "feat: add avatar icon set for child profiles"
```

---

### Task 3: shared/profile.js + tes

**Files:**
- Create: `shared/profile.js`
- Test: `shared/tests/profile.test.js`

**Interfaces:**
- Consumes: (tidak ada)
- Produces: `window.Profiles` (dan `module.exports`) dengan API:
  - `init(storage)` — storage `{getItem,setItem,removeItem}`; `init(null)` → memori; tanpa argumen → `window.localStorage` (auto-init saat modul dimuat).
  - `list()` → array profil `{id, name, avatarId, scores:{gameId:bestStars}}` (dibersihkan dari data rusak).
  - `create(name, avatarId)` → profil baru atau `null` bila argumen invalid.
  - `activate(id)` → `true`/`false`.
  - `active()` → profil aktif atau `null`.
  - `addScore(gameId, stars)` → skor tersimpan lalu (hanya jika lebih baik), atau `null` tanpa profil aktif.
  - `getScore(profileId, gameId)` → angka tersimpan atau `0`.
  Digunakan oleh Task 5 (dashboard) dan Task 5 bagian game (penulisan bintang).

- [ ] **Step 1: Tulis tes gagal**

```js
const test = require('node:test');
const assert = require('node:assert');
const Profiles = require('../profile.js');

function MockStorage() {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    dump: () => m
  };
}

test('create menyimpan profil dan mempertahankan nama ter-trim', () => {
  const s = MockStorage();
  Profiles.init(s);
  const p = Profiles.create('  Lala  ', 'cat');
  assert.ok(p);
  assert.strictEqual(p.name, 'Lala');
  assert.strictEqual(p.avatarId, 'cat');
  assert.deepStrictEqual(p.scores, {});
  assert.strictEqual(Profiles.list().length, 1);
  assert.ok(JSON.parse(s.getItem('thk:profiles')).length === 1, 'tersimpan di storage');
});

test('create menolak argumen invalid', () => {
  Profiles.init(MockStorage());
  assert.strictEqual(Profiles.create('', 'cat'), null);
  assert.strictEqual(Profiles.create('A', ''), null);
  assert.strictEqual(Profiles.create('A', null), null);
  assert.strictEqual(Profiles.create(undefined, 'cat'), null);
  assert.strictEqual(Profiles.list().length, 0);
});

test('activate/active memilih profil aktif', () => {
  const s = MockStorage();
  Profiles.init(s);
  assert.strictEqual(Profiles.active(), null);
  const p = Profiles.create('Budi', 'duck');
  assert.strictEqual(Profiles.activate(p.id), true);
  assert.strictEqual(Profiles.activate('tidak-ada'), false);
  assert.strictEqual(Profiles.active().id, p.id);
});

test('addScore hanya menyimpan yang lebih baik', () => {
  Profiles.init(MockStorage());
  const p = Profiles.create('Sari', 'fish');
  Profiles.activate(p.id);
  assert.strictEqual(Profiles.addScore('temukan-hewan', 5), 5);
  assert.strictEqual(Profiles.addScore('temukan-hewan', 3), 5);
  assert.strictEqual(Profiles.addScore('temukan-hewan', 8), 8);
  assert.strictEqual(Profiles.getScore(p.id, 'temukan-hewan'), 8);
  assert.strictEqual(Profiles.getScore(p.id, 'memory-match'), 0);
  assert.strictEqual(Profiles.getScore('profil-lain', 'temukan-hewan'), 0);
});

test('addScore tanpa profil aktif mengembalikan null', () => {
  Profiles.init(MockStorage());
  assert.strictEqual(Profiles.addScore('game', 3), null);
});

test('fallback memori (init null) tetap berfungsi tanpa storage', () => {
  Profiles.init(null);
  const p = Profiles.create('Oka', 'star');
  Profiles.activate(p.id);
  Profiles.addScore('temukan-hewan', 4);
  assert.strictEqual(Profiles.getScore(p.id, 'temukan-hewan'), 4);
  assert.strictEqual(Profiles.active().id, p.id);
});

test('JSON storage rusak tidak membuat crash', () => {
  const s = MockStorage();
  s.setItem('thk:profiles', '{rusak!!');
  Profiles.init(s);
  assert.deepStrictEqual(Profiles.list(), []);
});
```

- [ ] **Step 2: Run — pastikan gagal**

Run: `node --test shared/tests/profile.test.js`
Expected: FAIL (`Cannot find module '../profile.js'`).

- [ ] **Step 3: Implementasi `shared/profile.js`**

```js
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

  init(); // auto-init localStorage saat dimuat; init() eksplisit untuk tes

  return {
    init: init, list: list, create: create, activate: activate,
    active: active, addScore: addScore, getScore: getScore
  };
});
```

- [ ] **Step 4: Run — pastikan lulus**

Run: `node --test shared/tests/profile.test.js`
Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add shared/profile.js shared/tests/profile.test.js
git commit -m "feat: add per-child profile store with best-score persistence"
```

---

### Task 4: shared/games-registry.js + tes

**Files:**
- Create: `shared/games-registry.js`
- Test: `shared/tests/games-registry.test.js`

**Interfaces:**
- Consumes: (tidak ada)
- Produces: `window.GameRegistry.GAMES` — array objek `{ id, name, maxStars, path, icon }`. `path` = relatif dari root (`games/<id>/index.html`). Task 5 memakai seluruh field.

- [ ] **Step 1: Tulis tes gagal**

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { GAMES } = require('../games-registry.js');

test('registri tidak kosong dan lancar', () => {
  assert.ok(GAMES.length >= 1);
  const ids = new Set();
  GAMES.forEach((g) => {
    assert.ok(g.id && !ids.has(g.id), 'id duplikat: ' + g.id);
    ids.add(g.id);
    assert.ok(g.name && g.name.trim().length > 0);
    assert.ok(g.maxStars >= 1);
    assert.strictEqual(g.path, 'games/' + g.id + '/index.html');
    assert.ok(g.icon.includes('<svg') && g.icon.includes('</svg>'));
    assert.ok(fs.existsSync(path.join(__dirname, '..', '..', g.path)), 'file game ada: ' + g.path);
  });
});
```

- [ ] **Step 2: Run — pastikan gagal**

Run: `node --test shared/tests/games-registry.test.js`
Expected: FAIL (`Cannot find module '../games-registry.js'`).

- [ ] **Step 3: Implementasi `shared/games-registry.js`**

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameRegistry = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var GAMES = [
    {
      id: 'temukan-hewan',
      name: 'Temukan Hewan',
      maxStars: 8,
      path: 'games/temukan-hewan/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="#7E57C2" stroke-width="4"/><path d="M30 30 L42 42" stroke="#7E57C2" stroke-width="4" stroke-linecap="round"/><path d="M14 22 Q17 25 26 22" stroke="#B39DDB" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="16" cy="17" r="2" fill="#B39DDB"/><circle cx="24" cy="17" r="2" fill="#B39DDB"/></svg>'
    }
  ];
  return { GAMES: GAMES };
});
```

- [ ] **Step 4: Run — pastikan lulus**

Run: `node --test shared/tests/games-registry.test.js`
Expected: PASS (1/1).

- [ ] **Step 5: Commit**

```bash
git add shared/games-registry.js shared/tests/games-registry.test.js
git commit -m "feat: add game registry for dashboard"
```

---

### Task 5: Dashboard + navigasi pulang + bintang game

**Files:**
- Create: `index.html` (root — menggantikan posisi lama, isi baru), `dashboard.css`, `dashboard.js`
- Modify: `games/temukan-hewan/index.html` (tambah script `profile.js`; ubah teks tombol akhir)
- Modify: `games/temukan-hewan/game.js` (renderEnd: tulis bintang + auto-return; init: tombol akhir → pulang)
- Test: `shared/tests/dashboard.test.js` (kontrak navigasi+registri yang bisa diuji di Node)

**Interfaces:**
- Consumes: `GameAudio` (Task 1), `Avatars.AVATARS` (Task 2), `Profiles.*` (Task 3), `GameRegistry.GAMES` (Task 4).
- Produces: `window.Dashboard = { init }`; alur UI: layar setup (buat profil) ⇄ layar utama (avatar + grid game); kartu game menavigasi ke `g.path`; game menulis skor via `Profiles.addScore('temukan-hewan', stars)` lalu otomatis kembali ke `../../index.html` ±6 detik dengan tombol "Lainnya?".

- [ ] **Step 1: Tulis tes kontrak (gagal dulu)**

```js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { GAMES } = require('../games-registry.js');

test('setiap game punya halaman game yang memuat profile.js dan shared/audio.js', () => {
  GAMES.forEach((g) => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', g.path), 'utf8');
    assert.ok(html.includes('../../shared/audio.js'), g.id + ': memuat audio bersama');
    assert.ok(html.includes('../../shared/profile.js'), g.id + ': memuat profile bersama');
  });
});

test('halaman dashboard memuat semua shared module', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  assert.ok(html.includes('shared/audio.js'));
  assert.ok(html.includes('shared/avatars.js'));
  assert.ok(html.includes('shared/profile.js'));
  assert.ok(html.includes('shared/games-registry.js'));
  assert.ok(html.includes('dashboard.js'));
});
```

- [ ] **Step 2: Run — pastikan gagal**

Run: `node --test shared/tests/dashboard.test.js`
Expected: FAIL (file belum berpindah/ada; assertion path gagal).

- [ ] **Step 3: Tulis `index.html` (root) — dashboard**

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Game Anak</title>
  <link rel="stylesheet" href="dashboard.css">
</head>
<body>

  <section id="setup-screen" class="screen">
    <h1 class="title">Game Anak</h1>
    <p class="subtitle">Buat profil untuk mulai bermain</p>
    <label class="field-label" for="name-input">Nama</label>
    <input id="name-input" type="text" placeholder="Nama anak" autocomplete="off">
    <p class="field-label">Pilih avatar</p>
    <div id="avatar-pick" class="avatar-pick"></div>
    <button id="btn-create" class="btn-big">Buat!</button>
    <button id="btn-cancel-setup" class="btn-link hidden">Kembali</button>
    <p id="setup-msg" class="setup-msg"></p>
  </section>

  <section id="main-screen" class="screen hidden">
    <header id="avatar-row" class="avatar-row"></header>
    <main id="game-grid" class="game-grid"></main>
  </section>

  <script src="shared/audio.js"></script>
  <script src="shared/avatars.js"></script>
  <script src="shared/profile.js"></script>
  <script src="shared/games-registry.js"></script>
  <script src="dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 4: Tulis `dashboard.css`**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: #6EC6FF;
  min-height: 100vh;
  color: #263238;
}
.hidden { display: none !important; }
.screen { max-width: 780px; margin: 0 auto; padding: 24px 16px 40px; }
.title { font-size: 2rem; text-align: center; color: #FFF; text-shadow: 0 2px 4px rgba(0,0,0,.25); margin-bottom: 6px; }
.subtitle { text-align: center; color: #E3F2FD; font-size: 1.1rem; margin-bottom: 20px; }
.field-label { display: block; font-size: 1.1rem; color: #FFF; margin: 14px 0 6px; font-weight: 600; }
#name-input {
  width: 100%; font-size: 1.4rem; padding: 14px 16px; border-radius: 14px;
  border: 3px solid #FFF; background: #FFF; color: #263238;
}
.avatar-pick, .avatar-row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; margin: 12px 0; }
.avatar-opt, .avatar-btn {
  width: 96px; height: 96px; border-radius: 18px; border: 4px solid transparent;
  background: #FFF; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 2px; cursor: pointer; padding: 6px;
}
.avatar-opt svg, .avatar-btn svg { width: 52px; height: 52px; }
.avatar-name { font-size: .95rem; font-weight: 600; color: #546E7A; }
.avatar-opt.selected { border-color: #FFC107; background: #FFF8E1; transform: scale(1.05); }
.avatar-btn.active { border-color: #FFC107; background: #FFF8E1; }
.btn-big {
  display: block; width: 100%; max-width: 420px; margin: 18px auto 0;
  font-size: 1.5rem; font-weight: 700; padding: 18px 24px; min-height: 96px;
  border: none; border-radius: 22px; background: #FF9F43; color: #FFF;
  cursor: pointer; box-shadow: 0 4px 0 #E07B22;
}
.btn-big:active { transform: translateY(2px); box-shadow: 0 2px 0 #E07B22; }
.setup-msg { text-align: center; color: #FFF; font-weight: 600; margin-top: 10px; min-height: 1.2em; }
.game-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px; margin-top: 20px;
}
.game-card {
  min-height: 140px; border-radius: 22px; border: none; background: #FFF;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 16px; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,.15);
}
.game-card:active { transform: translateY(2px); }
.game-icon svg { width: 64px; height: 64px; }
.game-name { font-size: 1.15rem; font-weight: 700; color: #37474F; }
.game-stars { font-size: .95rem; color: #F9A825; font-weight: 600; }
.avatar-add { font-size: 2.2rem; color: #546E7A; background: rgba(255,255,255,.7); }
.btn-link {
  display: block; margin: 10px auto 0; background: none; border: none;
  color: #E3F2FD; font-size: 1.05rem; text-decoration: underline;
  cursor: pointer; padding: 12px 20px; min-height: 48px;
  /* aksi orang tua — target sentuh anak tetap ≥96px */
}
```

- [ ] **Step 5: Tulis `dashboard.js`**

```js
(function (root) {
  'use strict';

  var Avatars = root.Avatars;
  var Profiles = root.Profiles;
  var GameRegistry = root.GameRegistry;
  var GameAudio = root.GameAudio;

  var els = {};
  var adding = false;

  function $(id) { return document.getElementById(id); }

  function speak(text) { GameAudio.speak(text); }

  function init() {
    els.setup = $('setup-screen');
    els.main = $('main-screen');
    els.nameInput = $('name-input');
    els.avatarPick = $('avatar-pick');
    els.setupMsg = $('setup-msg');
    els.avatarRow = $('avatar-row');
    els.gameGrid = $('game-grid');

    renderAvatarPick();
    $('btn-create').addEventListener('pointerdown', onCreate);
    $('btn-cancel-setup').addEventListener('pointerdown', onCancelSetup);
    render();
  }

  function renderAvatarPick() {
    els.avatarPick.innerHTML = '';
    Avatars.AVATARS.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-opt';
      b.dataset.avatarId = a.id;
      b.innerHTML = a.svg + '<span class="avatar-name">' + a.name + '</span>';
      b.addEventListener('pointerdown', function () {
        els.avatarPick.querySelectorAll('.avatar-opt').forEach(function (x) { x.classList.remove('selected'); });
        b.classList.add('selected');
        speak(a.name);
      });
      els.avatarPick.appendChild(b);
    });
  }

  function selectedAvatar() {
    var sel = els.avatarPick.querySelector('.avatar-opt.selected');
    return sel ? sel.dataset.avatarId : null;
  }

  function onCreate() {
    var name = els.nameInput.value.trim();
    var avatarId = selectedAvatar();
    if (!name) { els.setupMsg.textContent = 'Tulis dulu nama anak.'; return; }
    if (!avatarId) { els.setupMsg.textContent = 'Pilih satu avatar.'; return; }
    var p = Profiles.create(name, avatarId);
    if (!p) { els.setupMsg.textContent = 'Gagal membuat profil.'; return; }
    Profiles.activate(p.id);
    adding = false;
    speak('Halo, ' + p.name + '!');
    render();
  }

  function onCancelSetup() {
    adding = false;
    els.setupMsg.textContent = '';
    render();
  }

  function render() {
    var profiles = Profiles.list();
    var has = profiles.length > 0;
    var showSetup = !has || adding;
    els.setup.classList.toggle('hidden', !showSetup);
    els.main.classList.toggle('hidden', showSetup);
    if (has) {
      if (!Profiles.active()) Profiles.activate(profiles[0].id);
      renderAvatars(profiles);
      renderGames();
    }
  }

  function renderAvatars(profiles) {
    els.avatarRow.innerHTML = '';
    var active = Profiles.active();
    profiles.forEach(function (p) {
      var avatar = Avatars.AVATARS.filter(function (x) { return x.id === p.avatarId; })[0] || Avatars.AVATARS[0];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-btn' + (active && active.id === p.id ? ' active' : '');
      b.innerHTML = avatar.svg + '<span class="avatar-name">' + p.name + '</span>';
      b.addEventListener('pointerdown', function () {
        Profiles.activate(p.id);
        speak('Halo, ' + p.name + '!');
        render();
      });
      els.avatarRow.appendChild(b);
    });
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'avatar-btn avatar-add';
    add.textContent = '+';
    add.setAttribute('aria-label', 'Tambah profil');
    add.addEventListener('pointerdown', function () {
      adding = true;
      els.nameInput.value = '';
      els.avatarPick.querySelectorAll('.avatar-opt').forEach(function (x) { x.classList.remove('selected'); });
      els.setupMsg.textContent = '';
      render();
    });
    els.avatarRow.appendChild(add);
  }

  function renderGames() {
    els.gameGrid.innerHTML = '';
    var active = Profiles.active();
    GameRegistry.GAMES.forEach(function (g) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'game-card';
      var stars = active ? Profiles.getScore(active.id, g.id) : 0;
      card.innerHTML =
        '<span class="game-icon">' + g.icon + '</span>' +
        '<span class="game-name">' + g.name + '</span>' +
        (stars > 0 ? '<span class="game-stars">Bintang ' + stars + '/' + g.maxStars + '</span>' : '');
      card.addEventListener('pointerdown', function () {
        speak(g.name);
        setTimeout(function () { window.location.href = g.path; }, 350);
      });
      els.gameGrid.appendChild(card);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.Dashboard = { init: init };
})(typeof window !== 'undefined' ? window : this);
```

- [ ] **Step 6: Adaptasi halaman game — `games/temukan-hewan/index.html`**

a) Tambah script `profile.js` SEBELUM `game.js` (daftar akhir `<body>`):
```html
  <script src="animals.js"></script>
  <script src="rounds.js"></script>
  <script src="../../shared/audio.js"></script>
  <script src="../../shared/profile.js"></script>
  <script src="game.js"></script>
```
b) Ubah teks tombol layar akhir: `<button id="btn-again" class="btn-big">Main Lagi?</button>` → `<button id="btn-again" class="btn-big">Lainnya?</button>`

- [ ] **Step 7: Adaptasi `games/temukan-hewan/game.js` — tulis bintang + pulang**

a) Setelah `var els = {};` tambahkan variabel timer:
```js
  var returnTimer = null;
```
b) Ganti binding tombol akhir di `init()`:
```js
    $('btn-again').addEventListener('pointerdown', startSession);
```
menjadi:
```js
    $('btn-again').addEventListener('pointerdown', backToDashboard);
```
c) Tambahkan fungsi di samping `renderEnd()`:
```js
  function backToDashboard() {
    clearTimeout(returnTimer);
    window.location.href = '../../index.html';
  }
```
d) Dalam `renderEnd()` — setelah loop bintang dan sebelum `els.endTitle.textContent = …`, tambahkan:
```js
    if (root.Profiles) root.Profiles.addScore('temukan-hewan', state.stars);
    returnTimer = setTimeout(backToDashboard, 6000);
```

- [ ] **Step 8: Run seluruh suite**

Run (dari root): `node --test`
Expected: seluruh tes lulus — 12 lama + 2 (avatars) + 7 (profile) + 1 (registri) + 2 (dashboard) = `tests 24`, `pass 24`, `fail 0`.

- [ ] **Step 9: Smoke dashboard via browser (file://)**

Buka `file:///home/swanster/projects/games/games-kay/index.html`:
1. Setup screen tampil (belum ada profil); konsol nol error; nol request jaringan (`performance.getEntriesByType('resource')` hanya file lokal 0 — patok: tidak ada request http*).
2. Ketik nama, pilih avatar (klik), klik "Buat!" → layar utama: baris avatar (1 aktif) + kartu "Temukan Hewan" tanpa bintang.
3. Klik kartu game → halaman game terbuka (`games/temukan-hewan/index.html`).
4. Mainkan sampai layar akhir: tiap ronde klik semua kartu `[data-is-target="1"]`, lalu klik `#btn-celebrate` ("Lanjut!") — ulangi untuk 8 ronde → title "Sempurna!" + 8 bintang; teks tombol "Lainnya?".
5. Tunggu ≤6,5 detik → otomatis kembali ke dashboard; kartu game menampilkan "Bintang 8/8"; konsol tetap nol error.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add kid dashboard with profiles, games grid, and auto-return"
```

---

### Task 6: Verifikasi final

**Files:** (tidak ada perubahan kode; hanya verifikasi)

- [ ] **Step 1: Suite penuh dari root**

Run: `node --test`
Expected: `tests 24`, `pass 24`, `fail 0`.

- [ ] **Step 2: E2E via HTTP server**

Run (terminal terpisah): `python3 -m http.server 8890` dari root repo, lalu buka `http://127.0.0.1:8890/index.html` di browser:
1. Alur lengkap: klik "+" di baris avatar → layar setup muncul → buat profil kedua ("Dewi", avatar bintang) → kartu game tampil; bintang milik profil pertama TIDAK muncul di profil Dewi (terpisah per profil). Tombol "Kembali" membatalkan setup tanpa membuat profil.
2. Pilih avatar pertama → bintang 8/8 kembali tampil (profil tersimpan).
3. Konsol nol error.

- [ ] **Step 3: Tablet portrait 768×1024**

Atur viewport 768×1024: dashboard tidak overflow horizontal (`scrollWidth === innerWidth`); kartu game ≥96px; tombol avatar ≥96px.

- [ ] **Step 4: Fallback mode privat (unit, sudah tercakup)** — konfirmasi `node --test` termasuk `fallback memori`.

- [ ] **Step 5: Status git bersih**

Run: `git status --short`
Expected: kosong (semua ter-commit).