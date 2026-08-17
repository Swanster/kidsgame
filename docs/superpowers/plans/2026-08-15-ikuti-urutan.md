# Ikuti Urutan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game memori kerja Simon mini untuk anak 3–5: 4 pad warna menyala berurutan (demo), anak mengulang dengan mengetuk; 8 ronde (urutan 2→5), 1 bintang/ronde; salah = shake + "Coba lagi!" tanpa penalti (posisi tetap — tidak mungkin macet); auto-return ke dashboard.

**Architecture:** `games/ikuti-urutan/{index.html, simon.js, game.js, style.css, tests/simon.test.js}` + entri `shared/games-registry.js` (#7). `simon.js` = logika murni + aset pad SVG (UMD-lite, tesable); `game.js` = DOM/audio/TTS/skor/navigasi (pola `games/ketuk-bola/game.js`).

**Tech Stack:** Vanilla HTML/CSS/JS; nol dependensi; `node --test` (Node ≥22); CDP smoke via `google-chrome --headless=new`.

## Global Constraints

- Nol dependensi/build/network; jalan dari `file://` DAN `http://`.
- Script klasik `<script>` (bukan ES modules).
- UMD-lite: `window.Simon` + `module.exports`; **DILARANG ref `root.` di dalam factory** (pola `games/ketuk-bola/balls.js`).
- `pointerdown` semua interaksi; target sentuh ≥96px (pad 140px FIX via CSS); ikon fungsional = SVG inline, BUKAN emoji (emoji hanya dekorasi teks — title "Ikuti Urutan 🎵").
- TTS id-ID via `GameAudio.speak`; `GameAudio.unlock()` gestur pertama.
- `GameAudio.fx` HANYA kind yang ada: `'ding' | 'wrong' | 'cheer'` — `shared/audio.js` TIDAK BOLEH diubah.
- JANGAN ubah `shared/profile.js`, `shared/audio.js`, dashboard, game lain; satu-satunya file shared yang berubah: `shared/games-registry.js`.
- Tes dari root: **`node --test` (bare, tanpa argumen path)**.
- Auto-return: `setTimeout(backToDashboard, 6000)`; `clearTimeout(returnTimer)` SEBELUM membuat timer baru (pola `db02a00`).
- Tanpa timer/pressure; tanpa skor efisiensi; ronde selesai = 1 bintang, selalu.
- **Pelajaran smoke #3/#5/#6:** jangan dispatch `pointerdown` ke tombol tersembunyi dari layar lain; tap `#btn-celebrate` HANYA setelah overlay terlihat; asersi progress pakai ekspektasi EKSPLISIT; ukur `getBoundingClientRect` HANYA saat layar aktif; WebSocket CDP await `'open'` sebelum send; jangan dispatch `#btn-celebrate` dua kali (ronde terlewat).
- **Lock via state machine saja** (`state.lock`; handler return early) — pad TIDAK di-`disabled` (pola balls.js); visual lock = class `.dim`.

---

### Task 1: simon.js — logika murni & aset pad + tes

**Files:**
- Create: `games/ikuti-urutan/simon.js`
- Create: `games/ikuti-urutan/tests/simon.test.js`

**Interfaces:**
- Consumes: — (mandiri)
- Produces (kontrak Task 2):
  - `Simon.PADS[i]` → `{id, name, hex, shape}` (4; urutan red/blue/yellow/green)
  - `Simon.SEQUENCE_LENGTHS` → `[2,2,3,3,4,4,5,5]`
  - `Simon.makeSequence(len)` → `[colorId, …]` | null (len <= 0 / bukan angka → null; pengulangan warna BOLEH)
  - `Simon.padSVG(colorId)` → `<svg …>` lengkap (aria-label "Pad {Nama}") | null
  - `Simon.matches(tap, expected)` → bool
  - `Simon.isRoundDone(placed, len)` → bool

- [ ] **Step 1: Tulis tes gagal dulu** — `games/ikuti-urutan/tests/simon.test.js` (8 blok):

```js
const test = require('node:test');
const assert = require('node:assert');
const Simon = require('../simon.js');

test('PADS: 4 pad dengan id unik, nama, hex, dan shape valid', () => {
  assert.strictEqual(Simon.PADS.length, 4);
  const ids = new Set();
  const SHAPES = ['circle', 'square', 'triangle', 'star'];
  Simon.PADS.forEach((p) => {
    assert.ok(p.id && !ids.has(p.id), 'id duplikat: ' + p.id);
    ids.add(p.id);
    assert.ok(p.name && p.name.trim().length > 0, 'nama kosong: ' + p.id);
    assert.ok(/^#[0-9A-F]{6}$/.test(p.hex), 'hex invalid: ' + p.id + ' -> ' + p.hex);
    assert.ok(SHAPES.includes(p.shape), 'shape invalid: ' + p.id + ' -> ' + p.shape);
  });
  assert.deepStrictEqual([...ids], ['red', 'blue', 'yellow', 'green']);
});

test('SEQUENCE_LENGTHS: 8 ronde, nilai [2,2,3,3,4,4,5,5]', () => {
  assert.deepStrictEqual(Simon.SEQUENCE_LENGTHS, [2, 2, 3, 3, 4, 4, 5, 5]);
});

test('makeSequence: panjang tepat dan semua elemen id pad dikenal', () => {
  [1, 2, 3, 4, 5, 6, 7, 8].forEach((len) => {
    const seq = Simon.makeSequence(len);
    assert.ok(Array.isArray(seq), 'bukan array len ' + len);
    assert.strictEqual(seq.length, len, 'panjang len ' + len);
    seq.forEach((id) => {
      assert.ok(Simon.PADS.some((p) => p.id === id), 'id tak dikenal: ' + id);
    });
  });
});

test('makeSequence acak (pengulangan diperbolehkan)', () => {
  const variants = new Set();
  for (let i = 0; i < 20; i++) {
    variants.add(Simon.makeSequence(3).join(','));
  }
  assert.ok(variants.size >= 2, 'urutan harus acak (varian terlihat: ' + variants.size + ')');
});

test('makeSequence: input invalid -> null', () => {
  assert.strictEqual(Simon.makeSequence(-1), null);
  assert.strictEqual(Simon.makeSequence(0), null);
  assert.strictEqual(Simon.makeSequence('x'), null);
  assert.strictEqual(Simon.makeSequence(null), null);
  assert.strictEqual(Simon.makeSequence(), null);
});

test('padSVG: svg lengkap, aria-label Pad {Nama}, hex, bentuk identitas, tanpa bocor', () => {
  const red = Simon.padSVG('red');
  assert.ok(red.startsWith('<svg'), 'harus <svg>');
  assert.ok(red.includes('role="img"') && red.includes('aria-label="Pad Merah"'), 'aria-label');
  assert.ok(red.includes('#E53935'), 'fill merah');
  assert.ok(red.includes('rx="10"'), 'body membulat');
  assert.ok(red.includes('<circle cx="24" cy="24" r="10" fill="#FFFFFF"'), 'bentuk circle putih');
  assert.ok(!red.includes('#1E88E5') && !red.includes('#F9A825') && !red.includes('#43A047'), 'warna lain bocor');
  assert.ok(Simon.padSVG('blue').includes('<rect x="15" y="15" width="18" height="18" rx="2" fill="#FFFFFF"'), 'blue = square putih');
  assert.ok(Simon.padSVG('yellow').includes('<polygon points="24,13 35,34 13,34" fill="#FFFFFF"'), 'yellow = triangle putih');
  assert.ok(Simon.padSVG('green').includes('<path d="M24 14'), 'green = star path putih');
  assert.strictEqual(Simon.padSVG('pink'), null);
  assert.strictEqual(Simon.padSVG(''), null);
});

test('matches: kecocokan warna', () => {
  assert.strictEqual(Simon.matches('red', 'red'), true);
  assert.strictEqual(Simon.matches('red', 'blue'), false);
  assert.strictEqual(Simon.matches('green', 'green'), true);
});

test('isRoundDone boundaries', () => {
  assert.strictEqual(Simon.isRoundDone(0, 5), false);
  assert.strictEqual(Simon.isRoundDone(4, 5), false);
  assert.strictEqual(Simon.isRoundDone(5, 5), true);
  assert.strictEqual(Simon.isRoundDone(8, 8), true);
  assert.strictEqual(Simon.isRoundDone(6, 5), true);
  assert.strictEqual(Simon.isRoundDone(0, 0), false);
});
```

- [ ] **Step 2: Jalankan tes → pastikan GAGAL**

Run: `node --test games/ikuti-urutan/tests/simon.test.js`
Expected: FAIL — `Cannot find module '../simon.js'`

- [ ] **Step 3: Implementasi minimal** — `games/ikuti-urutan/simon.js`:

```js
// simon.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Simon = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PADS = [
    { id: 'red', name: 'Merah', hex: '#E53935', shape: 'circle' },
    { id: 'blue', name: 'Biru', hex: '#1E88E5', shape: 'square' },
    { id: 'yellow', name: 'Kuning', hex: '#F9A825', shape: 'triangle' },
    { id: 'green', name: 'Hijau', hex: '#43A047', shape: 'star' }
  ];

  var SEQUENCE_LENGTHS = [2, 2, 3, 3, 4, 4, 5, 5];

  function padById(id) {
    for (var i = 0; i < PADS.length; i++) {
      if (PADS[i].id === id) return PADS[i];
    }
    return null;
  }

  function makeSequence(len) {
    if (typeof len !== 'number' || len <= 0) return null;
    var seq = [];
    for (var i = 0; i < len; i++) {
      seq.push(PADS[Math.floor(Math.random() * PADS.length)].id);
    }
    return seq;
  }

  var STAR_PATH = 'M24 14 L27.4 21.2 L35.2 21.8 L29.3 27.3 L31 35 L24 30.9 L17 35 L18.7 27.3 L12.8 21.8 L20.6 21.2 Z';

  function shapeMarkup(shape) {
    if (shape === 'circle') return '<circle cx="24" cy="24" r="10" fill="#FFFFFF"/>';
    if (shape === 'square') return '<rect x="15" y="15" width="18" height="18" rx="2" fill="#FFFFFF"/>';
    if (shape === 'triangle') return '<polygon points="24,13 35,34 13,34" fill="#FFFFFF"/>';
    if (shape === 'star') return '<path d="' + STAR_PATH + '" fill="#FFFFFF"/>';
    return null;
  }

  function padSVG(colorId) {
    var p = padById(colorId);
    if (!p) return null;
    var shape = shapeMarkup(p.shape);
    if (!shape) return null;
    return '<svg viewBox="0 0 48 48" role="img" aria-label="Pad ' + p.name + '">' +
      '<rect x="1" y="1" width="46" height="46" rx="10" fill="' + p.hex + '" stroke="#4A3728" stroke-width="2"/>' +
      shape +
      '</svg>';
  }

  function matches(tap, expected) {
    return tap === expected;
  }

  function isRoundDone(placed, len) {
    return len > 0 && placed >= len;
  }

  return {
    PADS: PADS,
    SEQUENCE_LENGTHS: SEQUENCE_LENGTHS,
    makeSequence: makeSequence,
    padSVG: padSVG,
    matches: matches,
    isRoundDone: isRoundDone
  };
});
```

- [ ] **Step 4: Jalankan tes → pastikan LULUS**

Run: `node --test games/ikuti-urutan/tests/simon.test.js`
Expected: PASS — 8 blok.

- [ ] **Step 5: Jalankan suite penuh dari root**

Run: `node --test` (bare, dari root git)
Expected: PASS semua — baseline 60 + 8 = **68**. Semua hijau (spec §9 #1).

- [ ] **Step 6: Commit**

```bash
git add games/ikuti-urutan/simon.js games/ikuti-urutan/tests/simon.test.js
git commit -m "feat: add pure simon logic (pads, sequence lengths, sequences)"
```

---

### Task 2: halaman game + registri (integrasi penuh)

**Files:**
- Create: `games/ikuti-urutan/index.html`
- Create: `games/ikuti-urutan/style.css`
- Create: `games/ikuti-urutan/game.js`
- Modify: `shared/games-registry.js` (tambah entri `ikuti-urutan` SETELAH entri `ketuk-bola`)

**Interfaces:**
- Consumes: `Simon` (Task 1), `GameAudio` (`unlock/speak/fx/setMuted/isMuted`), `Profiles` (`addScore` — guard `root.Profiles`)
- Produces: game page yang dimuat dashboard via `games/ikuti-urutan/index.html`; `Profiles.addScore('ikuti-urutan', stars)`

- [ ] **Step 1: Fail-first via tes registri (TDD)**

Tambahkan entri registri dulu (kode di Step 3, blok Modify), lalu run:

Run: `node --test shared/tests/games-registry.test.js`
Expected: FAIL — `games/ikuti-urutan/index.html` belum ada (fail-first yang sah).

- [ ] **Step 2: Buat `games/ikuti-urutan/index.html`** (VERBATIM):

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ikuti Urutan 🎵</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <section id="menu" class="screen">
    <h1 class="title">Ikuti Urutan 🎵</h1>
    <p class="subtitle">Ingat urutan lampunya ya!</p>
    <button id="btn-start" class="btn-big">Main Yuk!</button>
    <button id="btn-sound" class="btn-sound" aria-label="Suara"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
  </section>

  <section id="round-screen" class="screen hidden">
    <header class="topbar">
      <span id="round-label" class="round-label">Ronde 1</span>
      <span id="progress-label" class="progress-label">1/2</span>
    </header>
    <p id="status" class="status">Perhatikan lampu ya...</p>
    <main id="pads" class="pads" aria-label="Pad-pad warna"></main>
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
  <script src="simon.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: Modify `shared/games-registry.js`** — tambahkan entri ke-7 setelah entri `ketuk-bola` (sebelum `];`):

```js
    {
      id: 'ikuti-urutan',
      name: 'Ikuti Urutan',
      maxStars: 8,
      path: 'games/ikuti-urutan/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="4" width="20" height="20" rx="3" fill="#E53935" stroke="#4A3728" stroke-width="2"/><rect x="24" y="4" width="20" height="20" rx="3" fill="#1E88E5" stroke="#4A3728" stroke-width="2"/><rect x="4" y="24" width="20" height="20" rx="3" fill="#F9A825" stroke="#4A3728" stroke-width="2"/><rect x="24" y="24" width="20" height="20" rx="3" fill="#43A047" stroke="#4A3728" stroke-width="2"/></svg>'
    }
```

- [ ] **Step 4: Buat `games/ikuti-urutan/style.css`** (VERBATIM):

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

/* Status line */
.status {
  font-size: 1.6rem;
  font-weight: bold;
  background: #fff;
  border-radius: 24px;
  padding: 12px 28px;
  box-shadow: 0 4px 12px rgba(109, 76, 65, 0.15);
  text-align: center;
  min-height: 3.4rem;
  display: flex;
  align-items: center;
  animation: pop 0.25s ease;
}

/* Pads */
.pads {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 640px;
  padding: 8px;
}
.pad {
  width: 140px;
  height: 140px;
  min-width: 140px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  border-radius: 18px;
  transition: transform 0.12s ease, filter 0.12s ease;
}
.pad svg { width: 100%; height: 100%; display: block; }
.pad:active { transform: translateY(4px); }
.pad.lit {
  filter: brightness(1.3);
  transform: scale(1.04);
  box-shadow: 0 0 24px rgba(255, 255, 255, 0.8), 0 6px 0 rgba(0, 0, 0, 0.25);
}
.pad.shake { animation: shake 0.45s ease; }
.pad.dim { opacity: 0.6; }

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

- [ ] **Step 5: Buat `games/ikuti-urutan/game.js`** (VERBATIM):

```js
// game.js
(function (root) {
  'use strict';

  var Simon = root.Simon;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Simon.SEQUENCE_LENGTHS.length;
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
    posisi: 0,
    lock: false
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.roundLabel = $('round-label');
    els.progressLabel = $('progress-label');
    els.status = $('status');
    els.pads = $('pads');
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

  function setStatus(text) {
    els.status.textContent = text;
  }

  function padButton(colorId) {
    return els.pads.querySelector('.pad[data-color="' + colorId + '"]');
  }

  function setDim(on) {
    var pads = els.pads.querySelectorAll('.pad');
    for (var i = 0; i < pads.length; i++) {
      pads[i].classList.toggle('dim', on);
    }
  }

  function nextRound() {
    state.round = Simon.makeSequence(Simon.SEQUENCE_LENGTHS[state.roundIndex]);
    state.posisi = 0;
    state.lock = true;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    els.progressLabel.textContent = '1/' + state.round.length;
    render('round');
    setStatus('Perhatikan lampu ya...');
    GameAudio.speak('Perhatikan!');
    buildPads();
    playDemo();
  }

  function buildPads() {
    els.pads.innerHTML = '';
    Simon.PADS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pad';
      b.dataset.color = p.id;
      b.innerHTML = Simon.padSVG(p.id);
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onPadTap(p.id, b);
      });
      els.pads.appendChild(b);
    });
  }

  function playDemo() {
    var i = 0;
    var seq = state.round;
    state.lock = true;
    setDim(true);
    function step() {
      if (state.screen !== 'round') return;
      if (i >= seq.length) {
        setDim(false);
        state.lock = false;
        setStatus('Sekarang giliranmu!');
        GameAudio.speak('Ayo ulangi!');
        return;
      }
      var pad = padButton(seq[i]);
      var litPad = pad;
      if (pad) {
        pad.classList.add('lit');
        GameAudio.fx('ding');
      }
      i++;
      setTimeout(function () {
        if (litPad) litPad.classList.remove('lit');
        setTimeout(step, 250);
      }, 650);
    }
    step();
  }

  function onPadTap(colorId, btn) {
    if (state.screen !== 'round') return;
    if (state.lock) return;
    if (!Simon.matches(colorId, state.round[state.posisi])) {
      GameAudio.fx('wrong');
      btn.classList.remove('shake');
      void btn.offsetWidth; // restart animasi shake
      btn.classList.add('shake');
      setStatus('Coba lagi!');
      GameAudio.speak('Coba lagi!');
      window.setTimeout(function () {
        btn.classList.remove('shake');
        state.lock = false;
      }, 450);
      return;
    }
    state.lock = true;
    GameAudio.fx('ding');
    btn.classList.add('lit');
    window.setTimeout(function () {
      btn.classList.remove('lit');
    }, 200);
    state.posisi++;
    els.progressLabel.textContent = (state.posisi + 1) + '/' + state.round.length;
    window.setTimeout(function () {
      if (Simon.isRoundDone(state.posisi, state.round.length)) {
        finishRound();
      } else {
        state.lock = false;
      }
    }, 350);
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
    if (root.Profiles) root.Profiles.addScore('ikuti-urutan', state.stars);
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

  root.IkutiUrutan = { init: init };
})(typeof window !== 'undefined' ? window : this);
```

- [ ] **Step 6: Jalankan suite penuh dari root**

Run: `node --test` (bare)
Expected: PASS semua — **68**; dashboard.test.js kini meng-iterasi **7 game** (path ada, script `../../shared/audio.js` + `../../shared/profile.js` dimuat — index.html di atas sudah sesuai).

- [ ] **Step 7: Commit**

```bash
git add games/ikuti-urutan/index.html games/ikuti-urutan/style.css games/ikuti-urutan/game.js shared/games-registry.js
git commit -m "feat: add Ikuti Urutan game with stars and auto-return"
```

---

### Task 3: Verifikasi final (controller — bukan subagen implementer)

**Files:** tanpa perubahan kode; hanya verifikasi + review.

**Interfaces:**
- Consumes: seluruh hasil Task 1–2
- Produces: keputusan merge + repo bersih

- [ ] **Step 1: Suite penuh**

Run: `node --test` dari root — wajib PASS (**68**). Konfirmasi `git status --short` hanya berisi file Task 1–2 (atau bersih setelah commit).

- [ ] **Step 2: Smoke E2E CDP (controller) — file:// + http:// + ponsel 360×640**

Pola `/tmp/smoke-ketuk.mjs` (Node ≥22 WebSocket + `google-chrome --headless=new --remote-debugging-port`; WS await `open`; profil dibuat SEBELUM asersi kartu; `.game-stars` untuk skor 0 = null; ekspektasi progress EKSPLISIT; tap `#btn-celebrate` hanya saat overlay terlihat; jangan dispatch ganda):
- **Tangkap urutan demo**: polling `document.querySelector('.pad.lit')` setiap 60ms; catat `data-color` saat berubah — dedupe SAMA warna hanya jika < 500ms sejak catatan terakhir (warna berurutan bisa sama; jarak antar-langkah demo = 650+250=900ms); berhenti saat `#status` = "Sekarang giliranmu!". Panjang tangkapan harus == panjang ronde.
- Fase A `file://index.html`: dashboard **7 kartu** (setelah profil); buka kartu "Ikuti Urutan" (`document.title === 'Ikuti Urutan 🎵'`); `#btn-start` ≥96px; ronde 1: `#pads .pad` = 4 (urutan grid: data-color pertama 'red'); status demo; tangkap urutan (len 2); **mismatch sengaja ronde 1 langkah 1**: tap `.pad[data-color]` ≠ urutan[0] → `.shake` + `#status` = "Coba lagi!" + `#progress-label` TETAP "1/2"; lalu tap urutan[0] → progress "2/2" → celebrate → Lanjut; ronde 2–7: tangkap urutan (len `[2,2,3,3,4,4,5,5][r-1]`), tap penuh, progress eksplisit `(i+2)/len`, celebrate tiap ronde; ronde 8 → `#end-screen`: "Sempurna! 🌟", `#stars .star.filled` = 8, "Lainnya?"; auto-return ≤8 dtk (`document.title === 'Game Anak'`); kartu Ikuti `.game-stars` = "Bintang 8/8", kartu lain TANPA span `.game-stars` (null); 0 error konsol; 0 request gagal.
- Fase B `http://127.0.0.1:<port>/index.html` (python3 http.server): viewport 768×1024: `scrollWidth <= innerWidth`; `#btn-start` ≥96px; ronde 1 aktif: `.pad` rect = 140×140; 8 ronde penuh (tangkap+tap); "Sempurna! 🌟"; "Lainnya?" → dashboard; "Bintang 8/8" persist; 0 konsol (tanpa 404 favicon).
- Fase C `http://` ponsel: `Emulation.setDeviceMetricsOverride` 360×640: dashboard + menu game: `scrollWidth <= innerWidth`; `.pad` rect 140×140; **2 kolom**: pad ke-3 `y >` pad ke-1 (wrap); board tidak overflow; 0 error.

- [ ] **Step 3: Ledger SDD** — tulis hasil di `.superpowers/sdd/2026-08-15-ikuti-urutan/progress.md` (buat; dir gitignored).

- [ ] **Step 4: Review cabang penuh (agent reviewer)** — lensa: kepatuhan plan VERBATIM (Task 1–2), kontrak `Simon.*` dipakai persis di game.js (PADS/SEQUENCE_LENGTHS/makeSequence/padSVG/matches/isRoundDone — no drift), registri entri ke-7 benar (posisi, icon 4 kuadran, path), acceptance spec §9 (8 kriteria) satu-per-satu dengan nomor kriteria dari spec, amanat global (pointerdown, ≥96px, SVG bukan emoji, TTS id-ID, nol perubahan shared selain registri, UMD-lite tanpa `root.` di factory, lock state-machine tanpa disabled), UX (demo lampu berurutan; salah → shake + Coba lagi + posisi tetap; benar → lampu + progress; kata status tepat) + bukti verifikasi smoke (dari ledger).

- [ ] **Step 5: Merge** — `git checkout master && git merge <branch>` (FF); suite root 68 lulus di master; `git worktree remove .worktrees/ikuti-urutan` + prune; `git branch -d <branch>`; `git status` bersih.

- [ ] **Step 6: Ledger final + retain memory** — tulis hasil merge; simpan fakta durable (commit, 68/68, smoke pass).

---

## Self-Review Catatan

- **Spec §9 #1/#6/#8** → Task 1 (68/68: baseline 60 + **8 blok baru — dihitung dari kode brief sebelum menulis angka**) + Task 2 (pad 140px FIX → ≥96px semua viewport; auto-return + clearTimeout) ✓
- **Spec §9 #2/#3/#4/#5/#7** → Task 2 + Task 3 (registri ke-7 auto-render; file://+http://+360 smoke; 8 ronde + SEQUENCE_LENGTHS; demo lampu; benar → posisi naik; salah → shake + Coba lagi + posisi tetap; skor via addScore guard; auto-return "Bintang 8/8") ✓
- **Spec §8 kontrak** → Task 1 Interfaces + tes (8 blok): star = `<path d="M24 14…` (bukan polygon), bentuk identitas per shape, `padSVG` null unknown ✓
- Pelajaran G5/G6 diterapkan: angka blok tes dihitung dari kode (8); smoke progress eksplisit; dedupe warna-sama di tangkapan demo pakai jeda waktu 500ms (bukan sekadar warna berubah) ✓
- Registri: dashboard.test.js meng-iterasi GAMES → entri ke-7 otomatis dicakup ✓