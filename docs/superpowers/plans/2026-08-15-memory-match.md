# Memory Match (Kendaraan) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game memori #2 untuk dashboard anak — buka pasangan kartu kendaraan, 8 ronde progresif, bintang per papan, auto-return.

**Architecture:** Halaman mandiri `games/memory-match/` memakai modul murni `vehicles.js` (data 8 kendaraan SVG) + `memory.js` (logika papan/shuffle/match) yang diuji via Node, plus `game.js` untuk DOM/audio/TTS/skor; dashboard mengambil game lewat satu entri baru di `shared/games-registry.js`.

**Tech Stack:** Vanilla HTML/CSS/JS, nol dependensi, pola UMD-lite (global + `module.exports`), `node --test` (Node ≥22), TTS id-ID via `shared/audio.js`.

## Global Constraints

- Nol dependensi; semua halaman harus jalan dari `file://` DAN `http://`; tidak ada request jaringan.
- UMD-lite: `(function (root, factory) { if (typeof module === 'object' && module.exports) { module.exports = factory(); } else { root.NAMA = factory(); } })(typeof self !== 'undefined' ? self : this, function () { 'use strict'; ... })` — factory TIDAK boleh memakai `root` dari parameter IIFE. Hanya `shared/audio.js` (lama) yang memakai `var root = globalThis` DI DALAM factory — JANGAN tiru itu untuk modul baru.
- Command test: `node --test <file>` per-file saat TDD; `node --test` (bare, dari root repo) untuk suite penuh. Direktori form `node --test tests/` GAGAL di Node ini — jangan dipakai.
- Tanpa formatter/linter; kode di plan ini VERBATIM (kecuali diperintahkan).
- Interaksi utama: `pointerdown`; target sentuh ≥96px; ikon fungsional = SVG inline (BUKAN emoji; emoji hanya boleh dekorasi teks seperti 🚗 di title).
- TTS id-ID + WebAudio opsional (game tetap berjalan senyap); `GameAudio.unlock()` pada gesture pertama.
- API shared yang SUDAH ADA (jangan diubah): `GameAudio.unlock/speak/fx/setMuted/isMuted` (kinds fx: `'ding' | 'wrong' | 'pop' | 'cheer'`), `Profiles.addScore(gameId, stars)` (best-only), `GameRegistry.GAMES`.
- Registri: entri `{id, name, maxStars, path: 'games/<id>/index.html', icon}`; `icon` WAJIB string `<svg ...>...</svg>` lengkap; `id` unik huruf kecil.
- Dashboard (root `index.html`) TIDAK boleh diubah; kartu game baru muncul otomatis dari registri.
- Commit style: pesan imperative kecil (`feat: ...`, `refactor: ...`, `fix: ...`).
- Baseline suite saat ini: **24 tes lulus** (master `db02a00`). Target akhir: **30 tes**.

---

### Task 1: vehicles.js (aset 8 kendaraan) + tes

**Files:**
- Create: `games/memory-match/vehicles.js`
- Create: `games/memory-match/tests/vehicles.test.js`

**Interfaces:**
- Consumes: (tidak ada)
- Produces: `root.VEHICLES` = array 8 objek `{id, name, svg}`; `svg` = markup INNER (tanpa tag `<svg>` luar); dipakai `game.js` (Task 3) untuk wajah kartu + TTS nama.

- [ ] **Step 1: Tulis tes gagal**

`games/memory-match/tests/vehicles.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const VEHICLES = require('../vehicles.js');

test('ada 8 kendaraan dengan id unik dan nama non-kosong', () => {
  assert.strictEqual(VEHICLES.length, 8);
  const ids = new Set();
  VEHICLES.forEach((v) => {
    assert.ok(v.id && !ids.has(v.id), 'id duplikat: ' + v.id);
    ids.add(v.id);
    assert.ok(v.name && v.name.trim().length > 0, 'nama kosong: ' + v.id);
  });
  assert.ok(ids.has('car') && ids.has('train') && ids.has('plane') && ids.has('ship') &&
    ids.has('bike') && ids.has('tractor') && ids.has('bus') && ids.has('helicopter'),
    'harus ada 8 kendaraan standar');
});

test('setiap kendaraan punya svg inner tanpa tag luar', () => {
  VEHICLES.forEach((v) => {
    assert.ok(typeof v.svg === 'string' && v.svg.length > 0, 'svg kosong: ' + v.id);
    assert.ok(v.svg.includes('<path') || v.svg.includes('<circle') || v.svg.includes('<ellipse'),
      'svg tanpa bentuk: ' + v.id);
    assert.ok(!v.svg.includes('<svg'), 'svg tidak boleh membungkus tag <svg>: ' + v.id);
  });
});
```

- [ ] **Step 2: Run test → pastikan gagal**

Run: `node --test games/memory-match/tests/vehicles.test.js` (dari root repo)
Expected: FAIL — `Cannot find module '../vehicles.js'`

- [ ] **Step 3: Tulis implementasi**

`games/memory-match/vehicles.js` (VERBATIM):

```js
// vehicles.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VEHICLES = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VEHICLES = [
    {
      id: 'car',
      name: 'Mobil',
      svg: '<path d="M6 26 h26 a4 4 0 0 1 4 4 v4 h-34 v-4 a4 4 0 0 1 4 -4 Z" fill="none" stroke="#E53935" stroke-width="4" stroke-linejoin="round"/><path d="M15 26 l4 -7 a3 3 0 0 1 6 0 l4 7" fill="none" stroke="#E53935" stroke-width="4" stroke-linecap="round"/><circle cx="14" cy="34" r="4.5" fill="#E53935"/><circle cx="30" cy="34" r="4.5" fill="#E53935"/><circle cx="14" cy="34" r="1.8" fill="#fff"/><circle cx="30" cy="34" r="1.8" fill="#fff"/>'
    },
    {
      id: 'train',
      name: 'Kereta',
      svg: '<path d="M4 22 h28 a4 4 0 0 1 4 4 v4 h-36 v-4 a4 4 0 0 1 4 -4 Z" fill="none" stroke="#1E88E5" stroke-width="4" stroke-linejoin="round"/><path d="M28 22 v-6 a4 4 0 0 1 4 -4 h4 v10" fill="none" stroke="#1E88E5" stroke-width="4" stroke-linejoin="round"/><path d="M10 22 v-8" stroke="#1E88E5" stroke-width="4" stroke-linecap="round"/><circle cx="8" cy="34" r="4.5" fill="#1E88E5"/><circle cx="18" cy="34" r="4.5" fill="#1E88E5"/><circle cx="28" cy="34" r="4.5" fill="#1E88E5"/><circle cx="8" cy="34" r="1.8" fill="#fff"/><circle cx="18" cy="34" r="1.8" fill="#fff"/><circle cx="28" cy="34" r="1.8" fill="#fff"/>'
    },
    {
      id: 'plane',
      name: 'Pesawat',
      svg: '<path d="M6 26 h30 a4 4 0 0 1 4 4" fill="none" stroke="#FB8C00" stroke-width="4" stroke-linecap="round"/><path d="M16 26 l-6 10" stroke="#FB8C00" stroke-width="4" stroke-linecap="round"/><path d="M40 20 v10" stroke="#FB8C00" stroke-width="4" stroke-linecap="round"/><circle cx="14" cy="36" r="2" fill="#FB8C00"/>'
    },
    {
      id: 'ship',
      name: 'Kapal',
      svg: '<path d="M8 30 h32 l-6 8 h-20 Z" fill="none" stroke="#26C6DA" stroke-width="4" stroke-linejoin="round"/><path d="M24 30 v-12" stroke="#26C6DA" stroke-width="4" stroke-linecap="round"/><path d="M24 24 h6 l-6 5" fill="none" stroke="#26C6DA" stroke-width="4" stroke-linejoin="round"/><path d="M6 38 h36" stroke="#26C6DA" stroke-width="4" stroke-linecap="round"/>'
    },
    {
      id: 'bike',
      name: 'Sepeda',
      svg: '<circle cx="12" cy="30" r="8" fill="none" stroke="#43A047" stroke-width="4"/><circle cx="36" cy="30" r="8" fill="none" stroke="#43A047" stroke-width="4"/><path d="M12 30 L24 14 L36 30 M24 14 L23 30 M12 30 L36 30" fill="none" stroke="#43A047" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    {
      id: 'tractor',
      name: 'Traktor',
      svg: '<circle cx="12" cy="32" r="9" fill="none" stroke="#6D4C41" stroke-width="4"/><circle cx="36" cy="34" r="4.5" fill="#6D4C41"/><path d="M12 23 v-9 a4 4 0 0 1 4 -4 h4 v13 M20 14 h14 a4 4 0 0 1 4 4 v5" fill="none" stroke="#6D4C41" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    {
      id: 'bus',
      name: 'Bus',
      svg: '<rect x="4" y="12" width="34" height="18" rx="5" fill="none" stroke="#F9A825" stroke-width="4"/><path d="M4 20 h34" stroke="#F9A825" stroke-width="4"/><rect x="10" y="15" width="7" height="3" rx="1.5" fill="#F9A825"/><rect x="21" y="15" width="7" height="3" rx="1.5" fill="#F9A825"/><circle cx="12" cy="34" r="4.5" fill="#F9A825"/><circle cx="30" cy="34" r="4.5" fill="#F9A825"/><circle cx="12" cy="34" r="1.8" fill="#fff"/><circle cx="30" cy="34" r="1.8" fill="#fff"/>'
    },
    {
      id: 'helicopter',
      name: 'Helikopter',
      svg: '<path d="M4 12 L44 12" stroke="#8E24AA" stroke-width="4" stroke-linecap="round"/><ellipse cx="18" cy="26" rx="12" ry="8" fill="none" stroke="#8E24AA" stroke-width="4"/><path d="M30 26 h12 a3 3 0 0 1 3 3" fill="none" stroke="#8E24AA" stroke-width="4" stroke-linecap="round"/><path d="M12 34 h8 M30 34 h8" stroke="#8E24AA" stroke-width="4" stroke-linecap="round"/>'
    }
  ];

  return VEHICLES;
});
```

- [ ] **Step 4: Run test → pastikan lulus**

Run: `node --test games/memory-match/tests/vehicles.test.js`
Expected: `pass 2`

- [ ] **Step 5: Suite penuh + commit**

Run: `node --test` (dari root)
Expected: `tests 26`, `pass 26`, `fail 0` (24 lama + 2 baru)

```bash
git add games/memory-match/vehicles.js games/memory-match/tests/vehicles.test.js
git commit -m "feat: add vehicle icon set for memory match"
```

---

### Task 2: memory.js (logika murni) + tes

**Files:**
- Create: `games/memory-match/memory.js`
- Create: `games/memory-match/tests/memory.test.js`

**Interfaces:**
- Consumes: (tidak ada)
- Produces: `root.Memory` dengan:
  - `buildBoard(pairs)` → array kartu `[{pair, id}]` panjang `2*pairs`; `pair` bilangan 0..pairs-1, tiap pair tepat 2 kartu; kartu sudah diacak; `pairs` non-integer / < 1 → `[]`.
  - `shuffle(arr)` → salinan teracak (Fisher–Yates), TIDAK mengubah input.
  - `isMatch(cardA, cardB)` → bool (`pair` sama; null/undefined → false).
  - `boardDone(foundPairs, totalPairs)` → bool (`foundPairs.length >= totalPairs`).

- [ ] **Step 1: Tulis tes gagal**

`games/memory-match/tests/memory.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const Memory = require('../memory.js');

test('buildBoard membuat 2*pairs kartu dengan tiap pair tepat 2 kartu', () => {
  const board = Memory.buildBoard(3);
  assert.strictEqual(board.length, 6);
  const counts = {};
  const ids = new Set();
  board.forEach((c) => {
    counts[c.pair] = (counts[c.pair] || 0) + 1;
    ids.add(c.id);
  });
  assert.strictEqual(ids.size, 6, 'id harus unik');
  assert.deepStrictEqual(Object.values(counts).sort(), [2, 2, 2]);
});

test('buildBoard menolak jumlah pasangan invalid', () => {
  assert.deepStrictEqual(Memory.buildBoard(0), []);
  assert.deepStrictEqual(Memory.buildBoard(-1), []);
  assert.deepStrictEqual(Memory.buildBoard(1.5), []);
  assert.deepStrictEqual(Memory.buildBoard('x'), []);
});

test('shuffle adalah permutasi dan tidak mengubah input', () => {
  const input = [0, 1, 2, 3, 4, 5, 6, 7];
  const out = Memory.shuffle(input);
  assert.deepStrictEqual(input, [0, 1, 2, 3, 4, 5, 6, 7], 'input tidak berubah');
  assert.strictEqual(out.length, input.length);
  assert.deepStrictEqual([...out].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7], 'permutasi');
});

test('isMatch dan boardDone menegakkan kontrak cocok', () => {
  const a = { pair: 2, id: 'x' };
  const b = { pair: 2, id: 'y' };
  const c = { pair: 3, id: 'z' };
  assert.strictEqual(Memory.isMatch(a, b), true);
  assert.strictEqual(Memory.isMatch(a, c), false);
  assert.strictEqual(Memory.isMatch(a, null), false);
  assert.strictEqual(Memory.isMatch(null, null), false);
  assert.strictEqual(Memory.boardDone([], 4), false);
  assert.strictEqual(Memory.boardDone([1, 2], 2), true);
  assert.strictEqual(Memory.boardDone([1, 2, 3], 3), true);
});
```

- [ ] **Step 2: Run test → pastikan gagal**

Run: `node --test games/memory-match/tests/memory.test.js`
Expected: FAIL — `Cannot find module '../memory.js'`

- [ ] **Step 3: Tulis implementasi**

`games/memory-match/memory.js` (VERBATIM):

```js
// memory.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Memory = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function buildBoard(pairs) {
    if (!Number.isInteger(pairs) || pairs < 1) return [];
    var cards = [];
    var id = 0;
    for (var p = 0; p < pairs; p++) {
      cards.push({ pair: p, id: 'c' + (id++) });
      cards.push({ pair: p, id: 'c' + (id++) });
    }
    return shuffle(cards);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function isMatch(a, b) {
    return !!(a && b && a.pair === b.pair);
  }

  function boardDone(foundPairs, totalPairs) {
    return foundPairs.length >= totalPairs;
  }

  return { buildBoard: buildBoard, shuffle: shuffle, isMatch: isMatch, boardDone: boardDone };
});
```

- [ ] **Step 4: Run test → pastikan lulus**

Run: `node --test games/memory-match/tests/memory.test.js`
Expected: `pass 4`

- [ ] **Step 5: Suite penuh + commit**

Run: `node --test` (dari root)
Expected: `tests 30`, `pass 30`, `fail 0`

```bash
git add games/memory-match/memory.js games/memory-match/tests/memory.test.js
git commit -m "feat: add pure memory logic (board, shuffle, match)"
```

---

### Task 3: Halaman game + registri (integrasi penuh)

**Files:**
- Create: `games/memory-match/index.html`
- Create: `games/memory-match/style.css`
- Create: `games/memory-match/game.js`
- Modify: `shared/games-registry.js` (tambah 1 entri di array `GAMES`)

**Interfaces:**
- Consumes: `VEHICLES` (Task 1) — `Vehicles[card.pair]` = `{id,name,svg}`; `Memory.buildBoard/isMatch/boardDone` (Task 2); `GameAudio.unlock/speak/fx/setMuted/isMuted`; `Profiles.addScore('memory-match', stars)` (best-only, shared).
- Produces: halaman `games/memory-match/index.html` dengan `<script>` urut: `vehicles.js`, `memory.js`, `../../shared/audio.js`, `../../shared/profile.js`, `game.js` (WAJIB — dicek `shared/tests/dashboard.test.js`); registri berisi `memory-match` (WAJIB `path` nyata — dicek `shared/tests/games-registry.test.js`).

- [ ] **Step 1: TDD fail-first — tambah entri registri**

Tambahkan entri KEDUA di `shared/games-registry.js`, tepat setelah entri `temukan-hewan`:

```js
    {
      id: 'memory-match',
      name: 'Memory Match',
      maxStars: 8,
      path: 'games/memory-match/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 26 h26 a4 4 0 0 1 4 4 v4 h-34 v-4 a4 4 0 0 1 4 -4 Z" fill="none" stroke="#E53935" stroke-width="4" stroke-linejoin="round"/><path d="M15 26 l4 -7 a3 3 0 0 1 6 0 l4 7" fill="none" stroke="#E53935" stroke-width="4" stroke-linecap="round"/><circle cx="14" cy="34" r="4.5" fill="#E53935"/><circle cx="30" cy="34" r="4.5" fill="#E53935"/><circle cx="14" cy="34" r="1.8" fill="#fff"/><circle cx="30" cy="34" r="1.8" fill="#fff"/></svg>'
    }
```

Run: `node --test shared/tests/games-registry.test.js`
Expected: FAIL — `file game ada: games/memory-match/index.html` (path belum ada). Ini test gagal yang sah.

- [ ] **Step 2: Tulis halaman index.html**

`games/memory-match/index.html` (VERBATIM):

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Memory Match 🚗</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <section id="menu" class="screen">
    <h1 class="title">Memory Match 🚗</h1>
    <p class="subtitle">Buka kartu dan cocokkan pasangannya!</p>
    <button id="btn-start" class="btn-big">Main Yuk!</button>
    <button id="btn-sound" class="btn-sound" aria-label="Suara"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
  </section>

  <section id="round-screen" class="screen hidden">
    <header class="topbar">
      <span id="round-label" class="round-label">Ronde 1</span>
      <span id="pairs-label" class="pairs-label">0/2 pasang</span>
    </header>
    <main id="board" class="board cols2"></main>
  </section>

  <div id="celebrate" class="overlay hidden">
    <div id="confetti" class="confetti"></div>
    <p id="celebrate-msg" class="celebrate-msg">Yeay! 🎉</p>
    <button id="btn-celebrate" class="btn-big">Lanjut!</button>
  </div>

  <section id="end-screen" class="screen hidden">
    <h2 id="end-title" class="end-title">Selesai!</h2>
    <div id="stars" class="stars"></div>
    <button id="btn-again" class="btn-big">Lainnya?</button>
  </section>

  <script src="vehicles.js"></script>
  <script src="memory.js"></script>
  <script src="../../shared/audio.js"></script>
  <script src="../../shared/profile.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: Tulis style.css**

`games/memory-match/style.css` (VERBATIM):

```css
/* style.css */
:root {
  --bg: #FFEFD5;
  --card: #FFFFFF;
  --ink: #4A3728;
  --accent: #FF9F43;
  --accent-dark: #E87E2E;
  --ok: #6FBF44;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; }

body {
  font-family: "Comic Sans MS", "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--ink);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px;
}

.hidden { display: none !important; }

.title { font-size: 2.4rem; color: var(--accent-dark); text-align: center; }
.subtitle { font-size: 1.3rem; text-align: center; }

.btn-big {
  font-size: 1.8rem;
  font-family: inherit;
  padding: 18px 44px;
  border: none;
  border-radius: 60px;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 6px 0 var(--accent-dark);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.btn-big:active {
  transform: translateY(5px);
  box-shadow: 0 1px 0 var(--accent-dark);
}

.btn-sound {
  position: fixed;
  top: 14px;
  right: 14px;
  width: 96px;
  height: 96px;
  border: none;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 10px rgba(74, 55, 40, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-sound svg { width: 52px; height: 52px; }

/* Round screen */
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  background: #fff;
  border-radius: 24px;
  padding: 10px 22px;
  box-shadow: 0 4px 12px rgba(74, 55, 40, 0.15);
  width: 100%;
  max-width: 640px;
}
.round-label, .pairs-label { font-size: 1.5rem; font-weight: bold; color: var(--accent-dark); }

.board {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 640px;
  padding: 8px;
}
.board.cols2 { grid-template-columns: repeat(2, minmax(96px, 1fr)); }
.board.cols3 { grid-template-columns: repeat(3, minmax(96px, 1fr)); }
.board.cols4 { grid-template-columns: repeat(4, minmax(96px, 1fr)); }
.board.cols5 { grid-template-columns: repeat(5, minmax(96px, 1fr)); }

.card {
  background: var(--card);
  border: none;
  border-radius: 20px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  min-height: 96px;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(74, 55, 40, 0.15);
  transition: transform 0.1s ease;
}
.card svg { width: 100%; height: 100%; }
.card:active { transform: scale(0.94); }

.card.open { background: #FFF8E1; }

.card.done {
  box-shadow: 0 0 0 4px var(--ok) inset;
  background: #F3FBE8;
  opacity: 0.85;
}

/* Celebrate overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 239, 213, 0.94);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  z-index: 10;
  animation: pop 0.3s ease;
}
@keyframes pop {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.celebrate-msg { font-size: 2.2rem; color: var(--accent-dark); text-align: center; }

.confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.confetti i {
  position: absolute;
  top: -20px;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  animation: fall linear forwards;
}
@keyframes fall {
  to { transform: translateY(105vh) rotate(720deg); }
}

/* End screen */
.stars {
  display: flex;
  gap: 10px;
  font-size: 2.6rem;
  flex-wrap: wrap;
  justify-content: center;
}
.star { opacity: 0.22; filter: grayscale(1); }
.star.filled { opacity: 1; filter: none; }
.end-title { font-size: 2rem; color: var(--accent-dark); }
```

- [ ] **Step 4: Tulis game.js**

`games/memory-match/game.js` (VERBATIM):

```js
// game.js
(function (root) {
  'use strict';

  var Vehicles = root.VEHICLES;
  var Memory = root.Memory;
  var GameAudio = root.GameAudio;

  var PAIRS_PER_ROUND = [2, 3, 4, 4, 5, 5, 6, 6];
  var TOTAL_ROUNDS = PAIRS_PER_ROUND.length;
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var BACK_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="none" stroke="#7E57C2" stroke-width="4"/><circle cx="24" cy="24" r="7" fill="none" stroke="#B39DDB" stroke-width="4"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    pairs: 0,
    found: [],
    open: [],
    locked: false,
    board: []
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.board = $('board');
    els.roundLabel = $('round-label');
    els.pairsLabel = $('pairs-label');
    els.celebrate = $('celebrate');
    els.celebrateMsg = $('celebrate-msg');
    els.endScreen = $('end-screen');
    els.endTitle = $('end-title');
    els.stars = $('stars');

    $('btn-start').addEventListener('pointerdown', startSession);
    $('btn-again').addEventListener('pointerdown', backToDashboard);
    $('btn-celebrate').addEventListener('pointerdown', continueAfterCelebrate);
    $('btn-sound').addEventListener('pointerdown', toggleSound);

    render('menu');
  }

  function toggleSound() {
    GameAudio.setMuted(!GameAudio.isMuted());
    $('btn-sound').innerHTML = GameAudio.isMuted() ? ICON_MUTED : ICON_SOUND;
    if (!GameAudio.isMuted()) GameAudio.unlock();
  }

  function render(screen) {
    state.screen = screen;
    els.menu.classList.toggle('hidden', screen !== 'menu');
    els.roundScreen.classList.toggle('hidden', screen !== 'round');
    els.endScreen.classList.toggle('hidden', screen !== 'end');
    els.celebrate.classList.add('hidden');
    if (screen === 'round') {
      renderBoard();
    } else if (screen === 'end') {
      renderEnd();
    }
  }

  function startSession() {
    GameAudio.unlock();
    state.roundIndex = 0;
    state.stars = 0;
    nextRound();
  }

  function nextRound() {
    state.pairs = PAIRS_PER_ROUND[state.roundIndex];
    state.board = Memory.buildBoard(state.pairs);
    state.found = [];
    state.open = [];
    state.locked = false;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    els.pairsLabel.textContent = '0/' + state.pairs + ' pasang';
    render('round');
    GameAudio.speak('Cocokkan kartu yang sama!');
  }

  function renderBoard() {
    els.board.className = 'board cols' + colsFor(state.board.length);
    els.board.innerHTML = '';
    state.board.forEach(function (card) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.dataset.pair = String(card.pair);
      b.innerHTML = BACK_SVG;
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onCardTap(b, card);
      });
      els.board.appendChild(b);
    });
  }

  function colsFor(n) {
    if (n <= 4) return 2;
    if (n <= 6) return 3;
    if (n <= 8) return 4;
    if (n <= 10) return 5;
    return 4;
  }

  function onCardTap(btn, card) {
    if (state.screen !== 'round') return;
    if (state.locked) return;
    if (btn.classList.contains('done')) return;
    if (state.open.length === 2) return;
    if (state.open.length === 1 && state.open[0].btn === btn) return;
    btn.classList.add('open');
    btn.innerHTML = faceOf(card);
    GameAudio.fx('pop');
    state.open.push({ btn: btn, card: card });
    if (state.open.length === 2) {
      state.locked = true;
      checkPair();
    }
  }

  function faceOf(card) {
    var v = Vehicles[card.pair];
    return '<svg viewBox="0 0 48 48" role="img" aria-label="' + v.name + '">' + v.svg + '</svg>';
  }

  function checkPair() {
    var a = state.open[0];
    var b = state.open[1];
    if (Memory.isMatch(a.card, b.card)) {
      window.setTimeout(function () {
        a.btn.classList.add('done');
        b.btn.classList.add('done');
        if (state.found.indexOf(a.card.pair) === -1) state.found.push(a.card.pair);
        els.pairsLabel.textContent = state.found.length + '/' + state.pairs + ' pasang';
        GameAudio.fx('ding');
        GameAudio.speak(Vehicles[a.card.pair].name + '!');
        state.open = [];
        state.locked = false;
        if (Memory.boardDone(state.found, state.pairs)) {
          finishRound();
        }
      }, 350);
    } else {
      window.setTimeout(function () {
        a.btn.classList.remove('open');
        b.btn.classList.remove('open');
        a.btn.innerHTML = BACK_SVG;
        b.btn.innerHTML = BACK_SVG;
        GameAudio.fx('wrong');
        state.open = [];
        state.locked = false;
      }, 700);
    }
  }

  function finishRound() {
    state.stars++;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
      GameAudio.fx('cheer');
      GameAudio.speak(Math.random() < 0.5 ? 'Yeay!' : 'Bagus sekali!');
      showCelebrate();
    } else {
      render('end');
    }
  }

  function showCelebrate() {
    els.celebrate.classList.remove('hidden');
    var conf = els.celebrate.querySelector('#confetti');
    conf.innerHTML = '';
    var colors = ['#FF9F43', '#6FBF44', '#5AA9E6', '#F2A5B8', '#F6D32D'];
    for (var i = 0; i < 14; i++) {
      var piece = document.createElement('i');
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      conf.appendChild(piece);
    }
  }

  function continueAfterCelebrate() {
    state.roundIndex++;
    nextRound();
  }

  function backToDashboard() {
    clearTimeout(returnTimer);
    window.location.href = '../../index.html';
  }

  function renderEnd() {
    clearTimeout(returnTimer);
    var maxStars = 8;
    els.stars.innerHTML = '';
    for (var i = 0; i < maxStars; i++) {
      var s = document.createElement('span');
      s.className = 'star' + (i < state.stars ? ' filled' : '');
      s.innerHTML = STAR_SVG;
      els.stars.appendChild(s);
    }
    if (root.Profiles) root.Profiles.addScore('memory-match', state.stars);
    returnTimer = setTimeout(backToDashboard, 6000);
    els.endTitle.textContent =
      state.stars === maxStars ? 'Sempurna! 🌟' :
      state.stars >= 5 ? 'Hebat sekali!' :
      state.stars >= 3 ? 'Mantap!' : 'Ayo coba lagi!';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.Game = { init: init };
})(typeof window !== 'undefined' ? window : this);
```

- [ ] **Step 5: Suite penuh + commit**

Run: `node --test` (dari root)
Expected: `tests 30`, `pass 30`, `fail 0` — registri & dashboard test kini menguji 2 game (path nyata + script shared ada).

```bash
git add games/memory-match/index.html games/memory-match/style.css games/memory-match/game.js shared/games-registry.js
git commit -m "feat: add Memory Match game with stars and auto-return"
```

---

### Task 4: Verifikasi final (controller + implementer)

**Files:** (tidak ada perubahan kode; hanya verifikasi)

- [ ] **Step 1: Suite penuh dari root**

Run: `node --test` (dari root repo)
Expected: `tests 30`, `pass 30`, `fail 0`.

- [ ] **Step 2: Smoke file:// — alur penuh 8 ronde + auto-return**

Lakukan via browser E2E pada `file://<repo>/index.html` (jika tool browser tidak tersedia, gunakan script CDP zero-dep — pola `google-chrome --headless=new --remote-debugging-port` + WebSocket Node; lihat catatan controller). Asersi:

1. Dashboard: kartu game berjumlah **2** (`Temukan Hewan` + `Memory Match`).
2. Buat/aktifkan profil Bima → kartu Memory Match **tanpa** `.game-stars`.
3. Buka Memory Match → menu "Main Yuk!" → ronde 1 menampilkan **4 kartu** (`#board .card` = 4), label "Ronde 1" dan "0/2 pasang".
4. **Mismatch sengaja** (ronde 1): klik 1 kartu `[data-pair="0"]`, lalu 1 kartu `[data-pair="1"]` → tunggu ~900 ms → kedua kartu itu TIDAK `.done` dan TIDAK `.open` (tertutup kembali; input tidak terkunci).
5. Selesaikan ronde: untuk tiap pasang `p` dari 0 sampai `pairs-1`, klik kartu `[data-pair="p"]` pertama → klik kartu kedua `[data-pair="p"]` → tunggu ~450 ms (resolusi cocok). Label pasangan bertambah; papan selesai → overlay "Yeay! 🎉" + `#btn-celebrate`.
6. Ulangi untuk 8 ronde (ronde 8 = **12 kartu**); ronde terakhir → langsung layar akhir TANPA overlay.
7. Layar akhir: `#end-title` = "Sempurna! 🌟", `#stars .star.filled` = **8**, `#btn-again` teks = "Lainnya?".
8. Tunggu ≤8 dtk → kembali ke dashboard (`document.title === 'Game Anak'`); kartu Memory Match menampilkan **"Bintang 8/8"**; kartu Temukan Hewan tetap tanpa bintang (skor terpisah per game).
9. Konsol: **0 error**; jaringan: **0 request http\***.

- [ ] **Step 3: Smoke http:// + tablet 768×1024**

Server: `python3 -m http.server 8890` dari root repo; buka `http://127.0.0.1:8890/index.html`; viewport 768×1024:
1. Dashboard: **tidak overflow horizontal** (`scrollWidth <= innerWidth`); kartu game ≥96px; tombol avatar ≥96px.
2. Buka Memory Match → main 1 ronde → layar akhir → kembali; konsol 0 error (perhatikan 404 favicon TIDAK boleh muncul — sudah dicegah `<link rel="icon" href="data:,">`).
3. Bintang Bima 8/8 tetap tampil (persistensi localStorage http).

- [ ] **Step 4: Fallback memori + skor per game**

Konfirmasi unit sudah mencakup: `shared/tests/profile.test.js` berisi uji `init(null)` → memori; `addScore` best-only. Tidak perlu tindakan.

- [ ] **Step 5: Status git bersih; commit ledger**

Run: `git status --short` → kosong (semua ter-commit).

**Penutup (dikerjakan controller setelah review):** review cabang utuh (plan vs diff) → merge lokal ke `master` (fast-forward) → `git worktree remove` + `git branch -d memory-match`.

---

## Self-Review Notes (untuk controller)

- Kepatuhan spec: §3 ronde & progresi → game.js `PAIRS_PER_ROUND`; §4 mekanik → `onCardTap/checkPair` + guard; §5 layar akhir/auto-return → `renderEnd/backToDashboard`; §6 ikon → `vehicles.js` + BACK_SVG; §7 arsitektur → struktur folder + registri; §9 acceptance → Task 4.
- Potensi racun yang sudah dihindarkan: `clearTimeout(returnTimer)` sebelum timer baru (pola `db02a00`); `fx` hanya memakai kind yang ADA (`pop/ding/wrong/cheer`) — TIDAK menambah kind baru ke `shared/audio.js`; registri & dashboard test bersifat iteratif — otomatis mencakup game baru; game.js memakai `root.Profiles` (guard `if`) seperti Temukan Hewan.