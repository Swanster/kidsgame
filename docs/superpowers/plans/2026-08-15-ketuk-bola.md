# Ketuk Bola Warna Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game fokus-selektif satu-sentuhan untuk anak 3–5: ketuk bola warna sesuai instruksi (kata berwarna + TTS), abaikan bola pengecoh, 8 ronde, 1 bintang per ronde, auto-return ke dashboard.

**Architecture:** Game folder keenam dalam multi-page dashboard: `games/ketuk-bola/{index.html, balls.js, game.js, style.css, tests/balls.test.js}` + entri `shared/games-registry.js`. `balls.js` = logika murni + aset bola SVG (UMD-lite, tesable); `game.js` = DOM/audio/TTS/skor/navigasi (pola `games/puzzle-hewan/game.js`).

**Tech Stack:** Vanilla HTML/CSS/JS; nol dependensi; `node --test` (Node ≥22); CDP smoke via `google-chrome --headless=new`.

## Global Constraints

- Nol dependensi/build/network; harus jalan dari `file://` DAN `http://`.
- Script klasik `<script>` (bukan ES modules).
- UMD-lite: `window.Balls` + `module.exports`; **DILARANG ref `root.` di dalam factory** (pola `games/puzzle-hewan/puzzle.js`).
- `pointerdown` untuk semua interaksi; target sentuh ≥96px (bola 96px FIX via CSS, tombol ≥96); ikon fungsional = SVG inline, BUKAN emoji (emoji hanya dekorasi teks).
- TTS id-ID fallback senyap via `GameAudio.speak`; `GameAudio.unlock()` saat gestur pertama.
- `GameAudio.fx` HANYA kind yang ada: `'pop' | 'wrong' | 'cheer'` (dipakai; `ding` TIDAK wajib) — `shared/audio.js` TIDAK BOLEH diubah.
- JANGAN ubah `shared/profile.js`, `shared/audio.js`, dashboard, game lain; satu-satunya file shared yang berubah: `shared/games-registry.js`.
- Tes dari root: **`node --test` (bare, tanpa argumen path)**.
- Auto-return: `setTimeout(backToDashboard, 6000)`; `clearTimeout(returnTimer)` SEBELUM membuat timer baru (pola `db02a00`).
- Tanpa timer/pressure; tanpa skor efisiensi: ronde selesai = 1 bintang, selalu.
- **Pelajaran smoke siklus #3/#5:** jangan dispatch `pointerdown` ke tombol tersembunyi dari layar lain; tap `#btn-celebrate` HANYA setelah overlay terlihat; asersi progress pakai ekspektasi EKSPLISIT (bukan before!=after); ukur `getBoundingClientRect` HANYA saat layar aktif.

---

### Task 1: balls.js — logika murni & aset bola + tes

**Files:**
- Create: `games/ketuk-bola/balls.js`
- Create: `games/ketuk-bola/tests/balls.test.js`

**Interfaces:**
- Consumes: — (mandiri)
- Produces (kontrak Task 2):
  - `Balls.COLORS[i]` → `{id, name, hex}` (4)
  - `Balls.BALLS_PER_ROUND` → `[4,4,6,6,8,8,10,10]`
  - `Balls.makeRound(roundIndex)` → `{balls:[{id,color}], instructions:[{color}]}` | null
  - `Balls.ballSVG(colorId)` → `<svg …>` lengkap (aria-label "Bola {Nama}") | null
  - `Balls.matches(instColor, ballColor)` → bool
  - `Balls.shuffle(arr)` → salinan teracak (Fisher–Yates; tidak mengubah input)
  - `Balls.isRoundDone(placed, count)` → bool

- [ ] **Step 1: Tulis tes gagal dulu** — `games/ketuk-bola/tests/balls.test.js` (9 blok):

```js
const test = require('node:test');
const assert = require('node:assert');
const Balls = require('../balls.js');

test('COLORS: 4 warna dengan id unik, nama, dan hex', () => {
  assert.strictEqual(Balls.COLORS.length, 4);
  const ids = new Set();
  Balls.COLORS.forEach((c) => {
    assert.ok(c.id && !ids.has(c.id), 'id duplikat: ' + c.id);
    ids.add(c.id);
    assert.ok(c.name && c.name.trim().length > 0, 'nama kosong: ' + c.id);
    assert.ok(/^#[0-9A-F]{6}$/.test(c.hex), 'hex invalid: ' + c.id + ' -> ' + c.hex);
  });
  assert.ok(['red', 'blue', 'yellow', 'green'].every((x) => ids.has(x)), '4 warna standar');
});

test('BALLS_PER_ROUND: 8 ronde, nilai [4,4,6,6,8,8,10,10]', () => {
  assert.deepStrictEqual(Balls.BALLS_PER_ROUND, [4, 4, 6, 6, 8, 8, 10, 10]);
});

test('makeRound: jumlah bola, id unik, minimal 2 warna, instruksi valid', () => {
  Balls.BALLS_PER_ROUND.forEach((count, i) => {
    const round = Balls.makeRound(i);
    assert.ok(round, 'round null ronde ' + i);
    assert.strictEqual(round.balls.length, count, 'jumlah bola ronde ' + i);
    const ids = new Set();
    round.balls.forEach((b) => {
      assert.ok(b.id && !ids.has(b.id), 'id bola duplikat: ' + b.id);
      ids.add(b.id);
      assert.ok(Balls.COLORS.some((c) => c.id === b.color), 'warna tak dikenal: ' + b.color);
    });
    const colorSet = new Set(round.balls.map((b) => b.color));
    assert.ok(colorSet.size >= 2, 'harus >= 2 warna ronde ' + i);
    assert.strictEqual(round.instructions.length, count, 'jumlah instruksi ronde ' + i);
    round.instructions.forEach((inst) => {
      assert.ok(Balls.COLORS.some((c) => c.id === inst.color), 'instruksi warna tak dikenal: ' + inst.color);
    });
  });
});

test('makeRound: selalu solvable — tiap instruksi punya bola tersisa (simulasi pop)', () => {
  Balls.BALLS_PER_ROUND.forEach((count, i) => {
    const round = Balls.makeRound(i);
    const remaining = {};
    round.balls.forEach((b) => { remaining[b.color] = (remaining[b.color] || 0) + 1; });
    round.instructions.forEach((inst) => {
      assert.ok(remaining[inst.color] > 0, 'macet ronde ' + i + ' warna ' + inst.color);
      remaining[inst.color]--;
    });
  });
});

test('makeRound: index tak dikenal -> null', () => {
  assert.strictEqual(Balls.makeRound(-1), null);
  assert.strictEqual(Balls.makeRound(8), null);
  assert.strictEqual(Balls.makeRound(99), null);
});

test('ballSVG: svg lengkap, aria-label Bola {Nama}, isi warna, unknown -> null', () => {
  const svg = Balls.ballSVG('red');
  assert.ok(svg.startsWith('<svg'), 'harus <svg> lengkap');
  assert.ok(svg.includes('role="img"') && svg.includes('aria-label="Bola Merah"'), 'aria-label');
  assert.ok(svg.includes('#E53935'), 'isi warna merah');
  assert.ok(!svg.includes('#1E88E5') && !svg.includes('#F9A825') && !svg.includes('#43A047'), 'warna lain bocor');
  assert.ok(svg.includes('<circle') && svg.includes('<ellipse'), 'harus ada highlight');
  assert.strictEqual(Balls.ballSVG('pink'), null);
  assert.strictEqual(Balls.ballSVG(''), null);
});

test('matches: kecocokan warna', () => {
  assert.strictEqual(Balls.matches('red', 'red'), true);
  assert.strictEqual(Balls.matches('red', 'blue'), false);
  assert.strictEqual(Balls.matches('yellow', 'yellow'), true);
});

test('shuffle adalah permutasi, tidak mengubah input, dan mengacak urutan panjang', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const out = Balls.shuffle(input);
  assert.deepStrictEqual(input, input.slice(0).sort((a, b) => a - b), 'input tidak berubah');
  assert.deepStrictEqual([...out].sort((a, b) => a - b), input, 'permutasi');
  assert.notDeepStrictEqual(out, input, 'urutan harus teracak (prob 1/20! ~ 0)');
});

test('isRoundDone boundaries', () => {
  assert.strictEqual(Balls.isRoundDone(0, 4), false);
  assert.strictEqual(Balls.isRoundDone(3, 4), false);
  assert.strictEqual(Balls.isRoundDone(4, 4), true);
  assert.strictEqual(Balls.isRoundDone(10, 10), true);
  assert.strictEqual(Balls.isRoundDone(5, 4), true, 'over-place tidak merusak');
  assert.strictEqual(Balls.isRoundDone(0, 0), false, 'count 0 bukan ronde sah');
});
```

- [ ] **Step 2: Jalankan tes → pastikan GAGAL**

Run: `node --test games/ketuk-bola/tests/balls.test.js`
Expected: FAIL — `Cannot find module '../balls.js'`

- [ ] **Step 3: Implementasi minimal** — `games/ketuk-bola/balls.js`:

```js
// balls.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Balls = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COLORS = [
    { id: 'red', name: 'Merah', hex: '#E53935' },
    { id: 'blue', name: 'Biru', hex: '#1E88E5' },
    { id: 'yellow', name: 'Kuning', hex: '#F9A825' },
    { id: 'green', name: 'Hijau', hex: '#43A047' }
  ];

  var BALLS_PER_ROUND = [4, 4, 6, 6, 8, 8, 10, 10];

  function byId(pool, id) {
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function makeRound(roundIndex) {
    var count = BALLS_PER_ROUND[roundIndex];
    if (!count) return null;
    var balls = [];
    for (var i = 0; i < count; i++) {
      balls.push({ id: 'ball-' + (i + 1), color: COLORS[i % COLORS.length].id });
    }
    balls = shuffle(balls);
    var instructions = shuffle(balls.map(function (b) { return { color: b.color }; }));
    return { balls: balls, instructions: instructions };
  }

  function ballSVG(colorId) {
    var c = byId(COLORS, colorId);
    if (!c) return null;
    return '<svg viewBox="0 0 48 48" role="img" aria-label="Bola ' + c.name + '">' +
      '<circle cx="24" cy="24" r="21" fill="' + c.hex + '" stroke="#4A3728" stroke-width="3"/>' +
      '<ellipse cx="17" cy="15" rx="7" ry="5" fill="#FFFFFF" opacity="0.45"/>' +
      '</svg>';
  }

  function matches(instColor, ballColor) {
    return instColor === ballColor;
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

  function isRoundDone(placed, count) {
    return count > 0 && placed >= count;
  }

  return {
    COLORS: COLORS,
    BALLS_PER_ROUND: BALLS_PER_ROUND,
    makeRound: makeRound,
    ballSVG: ballSVG,
    matches: matches,
    shuffle: shuffle,
    isRoundDone: isRoundDone
  };
});
```

- [ ] **Step 4: Jalankan tes → pastikan LULUS**

Run: `node --test games/ketuk-bola/tests/balls.test.js`
Expected: PASS — 9 blok.

- [ ] **Step 5: Jalankan suite penuh dari root**

Run: `node --test` (bare, dari root git)
Expected: PASS semua — baseline 51 + 9 = **60**. Semua hijau (spec §9 #1).

- [ ] **Step 6: Commit**

```bash
git add games/ketuk-bola/balls.js games/ketuk-bola/tests/balls.test.js
git commit -m "feat: add pure ball logic (colors, rounds, solvable instructions)"
```

---

### Task 2: halaman game + registri (integrasi penuh)

**Files:**
- Create: `games/ketuk-bola/index.html`
- Create: `games/ketuk-bola/style.css`
- Create: `games/ketuk-bola/game.js`
- Modify: `shared/games-registry.js` (tambah entri `ketuk-bola` SETELAH entri `puzzle-hewan`)

**Interfaces:**
- Consumes: `Balls` (Task 1), `GameAudio` (`unlock/speak/fx/setMuted/isMuted`), `Profiles` (`addScore` — guard `root.Profiles`)
- Produces: game page yang dimuat dashboard via `games/ketuk-bola/index.html`; `Profiles.addScore('ketuk-bola', stars)`

- [ ] **Step 1: Fail-first via tes registri (TDD)**

Tambahkan entri registri dulu (kode di Step 3, blok Modify), lalu run:

Run: `node --test shared/tests/games-registry.test.js`
Expected: FAIL — `games/ketuk-bola/index.html` belum ada (fail-first yang sah).

- [ ] **Step 2: Buat `games/ketuk-bola/index.html`** (VERBATIM):

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ketuk Bola Warna ⚽</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <section id="menu" class="screen">
    <h1 class="title">Ketuk Bola Warna ⚽</h1>
    <p class="subtitle">Ketuk bola sesuai warnanya!</p>
    <button id="btn-start" class="btn-big">Main Yuk!</button>
    <button id="btn-sound" class="btn-sound" aria-label="Suara"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
  </section>

  <section id="round-screen" class="screen hidden">
    <header class="topbar">
      <span id="round-label" class="round-label">Ronde 1</span>
      <span id="progress-label" class="progress-label">1/4</span>
    </header>
    <p id="instruction" class="instruction">Ketuk bola <span id="inst-word"></span>!</p>
    <main id="board" class="board" aria-label="Bola-bola"></main>
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

  <script src="../../shared/audio.js"></script>
  <script src="../../shared/profile.js"></script>
  <script src="balls.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: Modify `shared/games-registry.js`** — tambahkan entri ke-6 setelah entri `puzzle-hewan` (sebelum `];`):

```js
    {
      id: 'ketuk-bola',
      name: 'Ketuk Bola Warna',
      maxStars: 8,
      path: 'games/ketuk-bola/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="14" cy="30" r="11" fill="#E53935" stroke="#4A3728" stroke-width="2"/><circle cx="36" cy="14" r="11" fill="#1E88E5" stroke="#4A3728" stroke-width="2"/><circle cx="32" cy="38" r="11" fill="#F9A825" stroke="#4A3728" stroke-width="2"/></svg>'
    }
```

- [ ] **Step 4: Buat `games/ketuk-bola/style.css`** (VERBATIM):

```css
/* style.css */
:root {
  --bg: #FFF3E0;
  --card: #FFFFFF;
  --ink: #6D4C41;
  --accent: #FF9F43;
  --accent-dark: #E07B1F;
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
  gap: 16px;
  padding: 20px;
}

.hidden { display: none !important; }

.title { font-size: 2rem; color: var(--accent-dark); text-align: center; }
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
  box-shadow: 0 4px 10px rgba(109, 76, 65, 0.2);
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
  box-shadow: 0 4px 12px rgba(109, 76, 65, 0.15);
  width: 100%;
  max-width: 640px;
}
.round-label { font-size: 1.5rem; font-weight: bold; color: var(--accent-dark); }
.progress-label { font-size: 1.4rem; font-weight: bold; color: var(--ink); }

/* Instruction banner */
.instruction {
  font-size: 1.9rem;
  font-weight: bold;
  background: #fff;
  border-radius: 24px;
  padding: 12px 28px;
  box-shadow: 0 4px 12px rgba(109, 76, 65, 0.15);
  text-align: center;
  animation: pop 0.25s ease;
}
#inst-word { text-transform: capitalize; }

/* Board */
.board {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 640px;
  padding: 8px;
}
.ball {
  width: 96px;
  height: 96px;
  min-width: 96px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.ball svg { width: 100%; height: 100%; display: block; }
.ball:active { transform: scale(0.92); }
.ball.popped {
  transform: scale(0.05);
  opacity: 0;
  pointer-events: none;
}
.ball.shake { animation: shake 0.45s ease; }

@keyframes pop {
  from { transform: scale(0.7); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-5px); }
}

/* Celebrate overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 243, 224, 0.94);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  z-index: 10;
  animation: pop 0.3s ease;
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

- [ ] **Step 5: Buat `games/ketuk-bola/game.js`** (VERBATIM):

```js
// game.js
(function (root) {
  'use strict';

  var Balls = root.Balls;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Balls.BALLS_PER_ROUND.length;
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    round: null,
    popped: 0,
    lock: false
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.roundLabel = $('round-label');
    els.progressLabel = $('progress-label');
    els.instruction = $('instruction');
    els.instWord = $('inst-word');
    els.board = $('board');
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
    if (screen === 'end') renderEnd();
  }

  function startSession() {
    GameAudio.unlock();
    state.roundIndex = 0;
    state.stars = 0;
    nextRound();
  }

  function colorById(id) {
    for (var i = 0; i < Balls.COLORS.length; i++) {
      if (Balls.COLORS[i].id === id) return Balls.COLORS[i];
    }
    return null;
  }

  function nextRound() {
    state.round = Balls.makeRound(state.roundIndex);
    state.popped = 0;
    state.lock = false;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    render('round');
    buildBoard();
    showInstruction();
  }

  function buildBoard() {
    els.board.innerHTML = '';
    state.round.balls.forEach(function (ball) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ball';
      b.dataset.color = ball.color;
      b.innerHTML = Balls.ballSVG(ball.color);
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onBallTap(ball, b);
      });
      els.board.appendChild(b);
    });
  }

  function currentInstruction() {
    return state.round.instructions[state.popped];
  }

  function showInstruction() {
    var inst = currentInstruction();
    var c = colorById(inst.color);
    els.instWord.textContent = c.name;
    els.instWord.style.color = c.hex;
    els.progressLabel.textContent = (state.popped + 1) + '/' + state.round.balls.length;
    state.lock = false;
    GameAudio.speak('Ketuk bola ' + c.name + '!');
  }

  function onBallTap(ball, btn) {
    if (state.screen !== 'round') return;
    if (state.lock) return;
    if (btn.classList.contains('popped')) return;
    if (!Balls.matches(currentInstruction().color, ball.color)) {
      GameAudio.fx('wrong');
      btn.classList.remove('shake');
      void btn.offsetWidth; // restart animasi shake
      btn.classList.add('shake');
      GameAudio.speak('Coba lagi!');
      window.setTimeout(function () {
        btn.classList.remove('shake');
      }, 500);
      return;
    }
    state.lock = true;
    GameAudio.fx('pop');
    btn.classList.add('popped');
    window.setTimeout(function () {
      state.popped++;
      if (Balls.isRoundDone(state.popped, state.round.balls.length)) {
        finishRound();
      } else {
        showInstruction();
      }
    }, 320);
  }

  function finishRound() {
    state.stars++;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
      GameAudio.fx('cheer');
      GameAudio.speak('Hebat!');
      showCelebrate();
    } else {
      render('end');
    }
  }

  function showCelebrate() {
    els.celebrateMsg.textContent = 'Yeay! 🎉';
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
    if (root.Profiles) root.Profiles.addScore('ketuk-bola', state.stars);
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
Expected: PASS semua — **60**; dashboard.test.js kini meng-iterasi **6 game** (path ada, script `../../shared/audio.js` + `../../shared/profile.js` dimuat — index.html di atas sudah sesuai).

- [ ] **Step 7: Commit**

```bash
git add games/ketuk-bola/index.html games/ketuk-bola/style.css games/ketuk-bola/game.js shared/games-registry.js
git commit -m "feat: add Ketuk Bola Warna game with stars and auto-return"
```

---

### Task 3: Verifikasi final (controller — bukan subagen implementer)

**Files:** tanpa perubahan kode; hanya verifikasi + review.

**Interfaces:**
- Consumes: seluruh hasil Task 1–2
- Produces: keputusan merge + repo bersih

- [ ] **Step 1: Suite penuh**

Run: `node --test` dari root — wajib PASS (**60**). Konfirmasi `git status --short` hanya berisi file Task 1–2 (atau bersih setelah commit).

- [ ] **Step 2: Smoke E2E CDP (controller) — file:// + http:// + ponsel 360×640**

Pola `/tmp/smoke-puzzle.mjs` (Node ≥22 WebSocket + `google-chrome --headless=new --remote-debugging-port`) — ekspektasi EKSPLISIT; ukur rect HANYA saat layar aktif; tap `#btn-celebrate` HANYA setelah overlay terlihat:
- Fase A `file://index.html`: dashboard tampil **6 kartu**; buat profil; buka kartu "Ketuk Bola Warna" (`document.title === 'Ketuk Bola Warna ⚽'`, menu); "Main Yuk!" → ronde 1: `#board .ball` = 4 & `#round-label` = "Ronde 1"; `#inst-word` non-kosong & berwarna (`style.color` valid); **mismatch sengaja ronde 1 langkah 1**: tap `.ball` dengan `data-color` ≠ warna instruksi → asersi `.shake` muncul, bola itu BELUM `.popped`, `#inst-word` TETAP, `#progress-label` TETAP; lalu tap `.ball[data-color=warna instruksi]` → `.popped`, `#inst-word` berubah (instruksi berikutnya), `#progress-label` = `(i+2)/count` (ekspektasi eksplisit `Math.min(i+2,count)`); ulangi sampai semua bola terpop (tiap ronde: `#board .ball` count = `[4,4,6,6,8,8,10,10][r-1]`; bola terpop tetap di DOM dengan `.popped`); ronde 1–7 → overlay `#celebrate` → `#btn-celebrate` → `#round-label` naik; ronde 8 → `#end-screen`; asersi: `#end-title` = "Sempurna! 🌟", `#stars .star.filled` = 8, `#btn-again` "Lainnya?"; auto-return ≤8 dtk (`document.title === 'Game Anak'`) → kartu game-6 `.game-stars` = "Bintang 8/8", kartu lain tanpa bintang; 0 error konsol; 0 request http.
- Fase B `http://127.0.0.1:<port>/index.html` (python3 http.server): viewport 768×1024: `scrollWidth <= innerWidth`; `#btn-start` ≥96px; ronde 1 aktif: `.ball` rect = 96×96; mainkan 8 ronde penuh seperti Fase A; asersi `#end-title` Sempurna; "Lainnya?" → dashboard; "Bintang 8/8" persist; 0 error konsol (tanpa 404 favicon).
- Fase C `http://` ponsel: `Emulation.setDeviceMetricsOverride` 360×640: dashboard + menu game: `scrollWidth <= innerWidth`, `.ball` rect 96×96 di ronde 8 (10 bola, 3 kolom flex-wrap — 3×108 = 324 ≤ 360).

- [ ] **Step 3: Ledger SDD** — tulis hasil di `.superpowers/sdd/2026-08-15-ketuk-bola/progress.md` (buat; dir gitignored).

- [ ] **Step 4: Review cabang penuh (agent reviewer)** — lensa: kepatuhan plan VERBATIM (Task 1–2), kontrak `Balls.*` dipakai persis di game.js (COLORS/BALLS_PER_ROUND/makeRound/ballSVG/matches — no drift), registri entri ke-6 benar (posisi, icon, path), acceptance spec §9 (8 kriteria) satu-per-satu dengan nomor kriteria dari spec, amanat global (pointerdown, ≥96px, SVG bukan emoji, TTS id-ID, nol perubahan shared selain registri, UMD-lite tanpa `root.` di factory), UX (bola salah → shake + instruksi tetap; bola benar → pop + instruksi berikutnya; kata warna berwarna di banner; TTS tiap instruksi) + bukti verifikasi smoke (dari ledger).

- [ ] **Step 5: Merge** — `git checkout master && git merge <branch>` (FF); suite root 60 lulus di master; `git worktree remove .worktrees/ketuk-bola` + prune; `git branch -d <branch>`; `git status` bersih.

- [ ] **Step 6: Ledger final + retain memory** — tulis hasil merge; simpan fakta durable (commit, 60/60, smoke pass).

---

## Self-Review Catatan

- **Spec §9 #1/#6/#8** → Task 1 (60/60: baseline 51 + **9 blok baru — dihitung dari kode brief sebelum menulis angka**) + Task 2 (≥96px: bola 96px FIX → terjamin semua viewport; `.btn-big`/`.btn-sound` 96; auto-return + clearTimeout) ✓
- **Spec §9 #2/#3/#4/#5/#7** → Task 2 + Task 3 (registri ke-6 auto-render; file://+http://+360 smoke; 8 ronde + bola [4,4,6,6,8,8,10,10]; tap benar → pop + instruksi berikutnya; salah → wrong + shake + coba lagi + lock 320ms; solvabilitas teruji di Task 1; skor via addScore guard; auto-return "Bintang 8/8") ✓
- **Spec §8 kontrak** → Task 1 Interfaces + tes (9 blok): solvabilitas = simulasi pop berurutan (bukan sekadar hitung warna) ✓
- Pelajaran G5 diterapkan: angka blok tes dihitung dari kode (9); tidak ada klaim kolom grid; smoke progress eksplisit `Math.min(i+2,count)` ✓
- Registri: dashboard.test.js meng-iterasi GAMES → entri ke-6 otomatis dicakup ✓