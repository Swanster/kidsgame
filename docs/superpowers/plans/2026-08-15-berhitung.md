# Berhitung (Balon) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game berhitung "ketuk & hitung" untuk anak 3–5: 8 ronde (1→8 balon), 1 bintang per ronde, maks 8, auto-return ke dashboard.

**Architecture:** Game folder ketiga dalam multi-page dashboard: `games/berhitung/{index.html, counting.js, game.js, style.css, tests/counting.test.js}` + entri `shared/games-registry.js`. `counting.js` = logika murni + aset SVG (UMD-lite, tesable via `node --test`); `game.js` = DOM/audio/TTS/skor/navigasi pola `games/memory-match/game.js`.

**Tech Stack:** Vanilla HTML/CSS/JS; nol dependensi; `node --test` (Node ≥22); CDP smoke via `google-chrome --headless=new`.

## Global Constraints

- Nol dependensi/build/network; harus jalan dari `file://` DAN `http://`.
- Script klasik `<script>` (bukan ES modules); posisi balon via `position:absolute` + persen.
- UMD-lite: `window.Counting` + `module.exports`; **DILARANG ref `root.` di dalam factory** (lihat pola `games/memory-match/memory.js` — bug audio `ee6f620`).
- `pointerdown` untuk semua interaksi; target sentuh ≥96px (balon & tombol); ikon fungsional = SVG inline, BUKAN emoji (emoji hanya dekorasi teks).
- TTS id-ID fallback senyap via `GameAudio.speak`; `GameAudio.unlock()` saat gestur pertama.
- `GameAudio.fx` HANYA kind yang ada: `'pop' | 'ding' | 'wrong' | 'cheer'` — `shared/audio.js` TIDAK BOLEH diubah.
- JANGAN ubah `shared/profile.js`, `shared/audio.js`, dashboard, atau game lain; satu-satunya file shared yang berubah: `shared/games-registry.js`.
- Tes dari root: **`node --test` (bare, tanpa argumen path)** — bentuk `node --test tests/` GAGAL di setup ini; per-file WORKS.
- Auto-return: `setTimeout(backToDashboard, 6000)`; `clearTimeout(returnTimer)` SEBELUM membuat timer baru (pola `db02a00`).
- Tanpa timer/tekanan waktu; tanpa skor efisiensi: ronde selesai = 1 bintang, selalu.

---

### Task 1: counting.js — logika murni & aset balon + tes

**Files:**
- Create: `games/berhitung/counting.js`
- Create: `games/berhitung/tests/counting.test.js`

**Interfaces:**
- Consumes: — (mandiri)
- Produces (kontrak Task 2):
  - `Counting.OBJECTS_PER_ROUND` → `[1, 2, 3, 4, 5, 6, 7, 8]`
  - `Counting.BALLOONS[i]` → `{id, name, svg}` (8 entry; `svg` = markup DALAM tanpa tag `<svg>`; `name` = warna Indonesia)
  - `Counting.layout(count)` → array `count` posisi `{x, y, s}` (pusat, persen area; s = diameter %; deterministik; nol tumpang-tindih; margin aman)
  - `Counting.shuffle(arr)` → salinan teracak (Fisher–Yates; tidak mengubah input)
  - `Counting.isDone(tapped, total)` → `total > 0 && tapped >= total`

- [ ] **Step 1: Tulis tes gagal dulu** — `games/berhitung/tests/counting.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const Counting = require('../counting.js');

test('ada 8 balon dengan id unik dan nama non-kosong', () => {
  assert.strictEqual(Counting.BALLOONS.length, 8);
  const ids = new Set();
  Counting.BALLOONS.forEach((b) => {
    assert.ok(b.id && !ids.has(b.id), 'id duplikat: ' + b.id);
    ids.add(b.id);
    assert.ok(b.name && b.name.trim().length > 0, 'nama kosong: ' + b.id);
  });
  assert.ok(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'teal']
    .every((c) => ids.has(c)), 'harus ada 8 warna standar');
});

test('setiap balon punya svg inner tanpa tag luar', () => {
  Counting.BALLOONS.forEach((b) => {
    assert.ok(typeof b.svg === 'string' && b.svg.length > 0, 'svg kosong: ' + b.id);
    assert.ok(b.svg.includes('<circle'), 'svg tanpa bentuk lingkaran: ' + b.id);
    assert.ok(!b.svg.includes('<svg'), 'svg tidak boleh membungkus tag <svg>: ' + b.id);
  });
});

test('OBJECTS_PER_ROUND = 1..8', () => {
  assert.deepStrictEqual(Counting.OBJECTS_PER_ROUND, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('layout deterministik, dalam batas, tanpa tumpang-tindih untuk 1..8', () => {
  for (let n = 1; n <= 8; n++) {
    const pos = Counting.layout(n);
    assert.strictEqual(pos.length, n, 'jumlah posisi: ' + n);
    pos.forEach((p) => {
      assert.ok(p.s >= 17, 'ukuran minimum: ' + n + ' -> ' + p.s);
      assert.ok(p.x - p.s / 2 >= 4 && p.x + p.s / 2 <= 96, 'dalam batas x: ' + n);
      assert.ok(p.y - p.s / 2 >= 4 && p.y + p.s / 2 <= 96, 'dalam batas y: ' + n);
    });
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const dx = pos[a].x - pos[b].x;
        const dy = pos[a].y - pos[b].y;
        assert.ok(Math.hypot(dx, dy) >= (pos[a].s + pos[b].s) / 2,
          'tumpang tindih: ' + n + ' antara ' + a + ' dan ' + b);
      }
    }
  }
  assert.deepStrictEqual(Counting.layout(3), Counting.layout(3), 'layout harus deterministik');
  assert.deepStrictEqual(Counting.layout(0), []);
  assert.deepStrictEqual(Counting.layout(9), []);
  assert.deepStrictEqual(Counting.layout(1.5), []);
});

test('shuffle adalah permutasi dan tidak mengubah input', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = Counting.shuffle(input);
  assert.deepStrictEqual(input, [1, 2, 3, 4, 5, 6, 7, 8], 'input tidak berubah');
  assert.strictEqual(out.length, input.length);
  assert.deepStrictEqual([...out].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8], 'permutasi');
});

test('isDone menegakkan kontrak selesai', () => {
  assert.strictEqual(Counting.isDone(0, 3), false);
  assert.strictEqual(Counting.isDone(2, 3), false);
  assert.strictEqual(Counting.isDone(3, 3), true);
  assert.strictEqual(Counting.isDone(5, 3), true, 'over-tap tidak merusak');
  assert.strictEqual(Counting.isDone(0, 0), false, 'total 0 bukan ronde sah');
});
```

- [ ] **Step 2: Jalankan tes → pastikan GAGAL**

Run: `node --test games/berhitung/tests/counting.test.js`
Expected: FAIL — `Cannot find module '../counting.js'`

- [ ] **Step 3: Implementasi minimal** — `games/berhitung/counting.js`:

```js
// counting.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Counting = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BALLOONS = [
    { id: 'red', name: 'Merah', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#E53935" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#E53935" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#E53935" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'orange', name: 'Oranye', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#FB8C00" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#FB8C00" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#FB8C00" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'yellow', name: 'Kuning', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#F9A825" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#F9A825" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#F9A825" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'green', name: 'Hijau', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#43A047" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#43A047" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#43A047" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'blue', name: 'Biru', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#1E88E5" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#1E88E5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#1E88E5" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'purple', name: 'Ungu', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#8E24AA" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#8E24AA" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#8E24AA" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'pink', name: 'Pink', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#EC407A" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#EC407A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#EC407A" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'teal', name: 'Toska', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#26C6DA" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#26C6DA" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#26C6DA" stroke-width="3" stroke-linecap="round"/>' }
  ];

  var OBJECTS_PER_ROUND = [1, 2, 3, 4, 5, 6, 7, 8];

  function layout(count) {
    if (!Number.isInteger(count) || count < 1 || count > 8) return [];
    var cols = count <= 1 ? 1 : count <= 3 ? 3 : count === 4 ? 2 : count <= 6 ? 3 : 4;
    var rows = Math.ceil(count / cols);
    var cellW = 100 / cols;
    var cellH = 100 / rows;
    var s = Math.min(cellW, cellH) - 8;
    var out = [];
    for (var i = 0; i < count; i++) {
      var c = i % cols;
      var r = Math.floor(i / cols);
      out.push({ x: (c + 0.5) * cellW, y: (r + 0.5) * cellH, s: s });
    }
    return out;
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

  function isDone(tapped, total) {
    return total > 0 && tapped >= total;
  }

  return { BALLOONS: BALLOONS, OBJECTS_PER_ROUND: OBJECTS_PER_ROUND, layout: layout, shuffle: shuffle, isDone: isDone };
});
```

- [ ] **Step 4: Jalankan tes → pastikan LULUS**

Run: `node --test games/berhitung/tests/counting.test.js`
Expected: PASS — 6/6 (jelas: 5 blok test di atas adalah 5; blok 'layout' memuat 1 blok + assersi; jumlah blok = 5 → 34 suite total dengan 29 baseline? Hitung saat Task 1: baseline 30 blok + 5 = 35 blok. **Harap catat angka sebenarnya dari output** — target: ≥34.)

- [ ] **Step 5: Jalankan suite penuh dari root**

Run: `node --test` (bare, dari root git)
Expected: PASS semua (30 lama + 5 baru = **35**) — pastikan tidak ada regresi.

- [ ] **Step 6: Commit**

```bash
git add games/berhitung/counting.js games/berhitung/tests/counting.test.js
git commit -m "feat: add pure counting logic (balloons, layout, done)"
```

---

### Task 2: halaman game + registri (integrasi penuh)

**Files:**
- Create: `games/berhitung/index.html`
- Create: `games/berhitung/style.css`
- Create: `games/berhitung/game.js`
- Modify: `shared/games-registry.js` (tambah entri `berhitung` SETELAH entri `memory-match`)

**Interfaces:**
- Consumes: `Counting` (Task 1), `GameAudio` (`unlock/speak/fx/setMuted/isMuted`), `Profiles` (`addScore` — guard `root.Profiles`)
- Produces: game page yang dimuat dashboard via `games/berhitung/index.html`; `Profiles.addScore('berhitung', stars)`

- [ ] **Step 1: Fail-first via tes registri (TDD)**

Tambahkan entri registri dulu (kode di Step 3, blok Modify), lalu run:

Run: `node --test shared/tests/games-registry.test.js`
Expected: FAIL — `games/berhitung/index.html` belum ada (inilah fail-first yang sah).

- [ ] **Step 2: Buat `games/berhitung/index.html`** (VERBATIM):

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Berhitung 🎈</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <section id="menu" class="screen">
    <h1 class="title">Berhitung 🎈</h1>
    <p class="subtitle">Ketuk balonnya satu per satu!</p>
    <button id="btn-start" class="btn-big">Main Yuk!</button>
    <button id="btn-sound" class="btn-sound" aria-label="Suara"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
  </section>

  <section id="round-screen" class="screen hidden">
    <header class="topbar">
      <span id="round-label" class="round-label">Ronde 1</span>
      <span id="counter-label" class="counter-label">0</span>
    </header>
    <main id="area" class="area"></main>
  </section>

  <div id="celebrate" class="overlay hidden">
    <div id="confetti" class="confetti"></div>
    <p id="celebrate-num" class="celebrate-num">3</p>
    <p id="celebrate-msg" class="celebrate-msg">tiga</p>
    <button id="btn-celebrate" class="btn-big">Lanjut!</button>
  </div>

  <section id="end-screen" class="screen hidden">
    <h2 id="end-title" class="end-title">Selesai!</h2>
    <div id="stars" class="stars"></div>
    <button id="btn-again" class="btn-big">Lainnya?</button>
  </section>

  <script src="../../shared/audio.js"></script>
  <script src="../../shared/profile.js"></script>
  <script src="counting.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: Modify `shared/games-registry.js`** — tambahkan entri ke-3 setelah entri `memory-match` (sebelum `];`):

```js
    {
      id: 'berhitung',
      name: 'Berhitung',
      maxStars: 8,
      path: 'games/berhitung/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="18" r="14" fill="none" stroke="#E53935" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#E53935" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#E53935" stroke-width="3" stroke-linecap="round"/></svg>'
    }
```

- [ ] **Step 4: Buat `games/berhitung/style.css`** (VERBATIM):

```css
/* style.css */
:root {
  --bg: #E8F4F8;
  --card: #FFFFFF;
  --ink: #31505F;
  --accent: #43A9C3;
  --accent-dark: #2C7A8F;
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
  min-height: 96px;
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
  box-shadow: 0 4px 10px rgba(49, 80, 95, 0.2);
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
  box-shadow: 0 4px 12px rgba(49, 80, 95, 0.15);
  width: 100%;
  max-width: 640px;
}
.round-label { font-size: 1.5rem; font-weight: bold; color: var(--accent-dark); }

.counter-label {
  font-size: 1.8rem;
  font-weight: bold;
  color: var(--accent-dark);
  background: var(--bg);
  border-radius: 50%;
  min-width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Play area */
.area {
  position: relative;
  width: 100%;
  max-width: 640px;
  aspect-ratio: 1 / 1;
  max-height: 72vh;
}

.obj {
  position: absolute;
  width: var(--size);
  aspect-ratio: 1 / 1;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.obj svg { width: 100%; height: 100%; display: block; }
.obj:active { transform: translate(-50%, -50%) scale(0.9); }

.obj.done {
  opacity: 0.35;
  transform: translate(-50%, -50%) scale(0.78);
  cursor: default;
}

/* Celebrate overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(232, 244, 248, 0.94);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
  animation: pop 0.3s ease;
}
@keyframes pop {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.celebrate-num { font-size: 6rem; font-weight: bold; color: var(--accent-dark); margin: 0; }
.celebrate-msg { font-size: 2.2rem; color: var(--accent-dark); text-align: center; margin: 0; }

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

- [ ] **Step 5: Buat `games/berhitung/game.js`** (VERBATIM):

```js
// game.js
(function (root) {
  'use strict';

  var Counting = root.Counting;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Counting.OBJECTS_PER_ROUND.length;
  var NUMBER_WORDS = ['satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan'];
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    total: 0,
    tapped: []
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.area = $('area');
    els.roundLabel = $('round-label');
    els.counterLabel = $('counter-label');
    els.celebrate = $('celebrate');
    els.celebrateNum = $('celebrate-num');
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
      renderObjects();
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
    state.total = Counting.OBJECTS_PER_ROUND[state.roundIndex];
    state.tapped = [];
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    els.counterLabel.textContent = '0';
    render('round');
    GameAudio.speak('Hitung balonnya!');
  }

  function renderObjects() {
    els.area.innerHTML = '';
    var order = Counting.shuffle(Counting.BALLOONS.map(function (b) { return b.id; }));
    var pos = Counting.layout(state.total);
    pos.forEach(function (p, i) {
      var balloon = Counting.BALLOONS.filter(function (b) { return b.id === order[i]; })[0];
      var obj = document.createElement('button');
      obj.type = 'button';
      obj.className = 'obj';
      obj.dataset.idx = String(i);
      obj.style.left = p.x + '%';
      obj.style.top = p.y + '%';
      obj.style.setProperty('--size', p.s + '%');
      obj.innerHTML = '<svg viewBox="0 0 48 48" role="img" aria-label="balon ' + balloon.name + '">' + balloon.svg + '</svg>';
      obj.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onObjTap(obj, i);
      });
      els.area.appendChild(obj);
    });
  }

  function onObjTap(obj, i) {
    if (state.screen !== 'round') return;
    if (obj.classList.contains('done')) return;
    obj.classList.add('done');
    state.tapped.push(i);
    GameAudio.fx('pop');
    GameAudio.speak(NUMBER_WORDS[state.tapped.length - 1]);
    els.counterLabel.textContent = String(state.tapped.length);
    if (Counting.isDone(state.tapped.length, state.total)) {
      finishRound();
    }
  }

  function finishRound() {
    state.stars++;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
      GameAudio.fx('cheer');
      GameAudio.speak('Hebat! Ada ' + NUMBER_WORDS[state.total - 1] + ' balon!');
      showCelebrate();
    } else {
      render('end');
    }
  }

  function showCelebrate() {
    els.celebrateNum.textContent = String(state.total);
    els.celebrateMsg.textContent = NUMBER_WORDS[state.total - 1];
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
    if (root.Profiles) root.Profiles.addScore('berhitung', state.stars);
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

- [ ] **Step 6: Jalankan suite penuh dari root**

Run: `node --test` (bare)
Expected: PASS semua — 30 lama + 5 counting = **35**; dashboard.test.js kini meng-iterasi **3 game** (path ada, script `../../shared/audio.js` + `../../shared/profile.js` dimuat — index.html di atas sudah sesuai).

- [ ] **Step 7: Commit**

```bash
git add games/berhitung/index.html games/berhitung/style.css games/berhitung/game.js shared/games-registry.js
git commit -m "feat: add Berhitung game with stars and auto-return"
```

---

### Task 3: Verifikasi final (controller — bukan subagen implementer)

**Files:** tanpa perubahan kode; hanya verifikasi + review.

**Interfaces:**
- Consumes: seluruh hasil Task 1–2
- Produces: keputusan merge + repo bersih

- [ ] **Step 1: Suite penuh**

Run: `node --test` dari root — wajib PASS (35). Konfirmasi `git status --short` hanya berisi file Task 1–2 (atau bersih setelah commit).

- [ ] **Step 2: Smoke E2E CDP (controller) — file:// + http:// 768×1024**

Pola `/tmp/smoke-memory.mjs` (Node ≥22 WebSocket + `google-chrome --headless=new --remote-debugging-port`):
- Fase A `file://index.html`: dashboard tampil **3 kartu**; buat profil; buka kartu "Berhitung" (`document.title === 'Berhitung 🎈'`, menu); "Main Yuk!" → ronde 1: `#area .obj` = 1, `#counter-label` = "0"; ketuk semua `.obj` (loop: `document.querySelectorAll('#area .obj:not(.done)')` berurutan DOM-order, dispatch `pointerdown`); setelah N-tap: `#counter-label` === "N"; ronde 1–7 → overlay `#celebrate` (cek `#celebrate-num` === "N" dan `#celebrate-msg` === kata angka) → `#btn-celebrate`; ronde 8 → `#end-screen`; asersi: `#end-title` = "Sempurna! 🌟", `#stars .star.filled` = 8, `#btn-again` "Lainnya?"; auto-return ≤8 dtk (`document.title === 'Game Anak'`) → kartu Berhitung `.game-stars` = "Bintang 8/8", kartu lain tanpa bintang; 0 error konsol; 0 request http (favicon `data:,`).
- Fase B `http://127.0.0.1:<port>/index.html` (python3 http.server): viewport 768×1024: `scrollWidth <= innerWidth`; balon `getBoundingClientRect().width >= 96` (semua ronde 1–8 — jalankan 8 ronde penuh seperti Fase A); `#btn-start` ≥96px; 0 error konsol (tanpa 404 favicon); "Bintang 8/8" persist.

- [ ] **Step 3: Ledger SDD** — catat hasil di `.superpowers/sdd/2026-08-15-berhitung/progress.md` (buat jika belum ada; dir gitignored).

- [ ] **Step 4: Review cabang penuh (agent reviewer)** — lensa: kepatuhan plan VERBATIM (Task 1–2), kontrak `Counting.*` dipakai persis, registri entri ke-3 benar, acceptance spec §9 (8 kriteria) satu-per-satu, amanat (pointerdown, ≥96px, SVG bukan emoji, TTS id-ID, nol perubahan shared selain registri, UMD-lite tanpa `root.` di factory).

- [ ] **Step 5: Merge** — `git checkout master && git merge <branch>` (FF); suite root 35 lulus di master; `git worktree remove .worktrees/berhitung` + prune; `git branch -d <branch>`; `git status` bersih.

- [ ] **Step 6: Ledger final + retain memory** — tulis hasil merge; simpan fakta durable (commit, 35/35, smoke pass).

---

## Self-Review Catatan

- **Spec §9 #4/#5/#6/#8** → Task 2 (alur, interaksi, ≥96px via `min-height:96px` `.btn-big` + `--size` s≥17%×640=109px, auto-return+clearTimeout) ✓
- **Spec §9 #1/#2/#3/#7** → Task 1 + Task 2 Step 1/6 (≥34 tes: 35; kartu dashboard dari registri; file://+http:// via Task 3 smoke; skor per profil via `addScore` guard — `profile.test.js` tak berubah, fallback memori tetap) ✓
- Konsistensi nama: `Counting` / `BALLOONS` / `OBJECTS_PER_ROUND` / `layout` / `shuffle` / `isDone` dipakai identik di Task 1 & Task 2 ✓
- Registri: dashboard.test.js meng-iterasi GAMES → entri ke-3 otomatis dicakup ✓