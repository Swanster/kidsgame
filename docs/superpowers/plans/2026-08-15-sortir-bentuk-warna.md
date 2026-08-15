# Sortir Bentuk & Warna Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game klasifikasi satu-sentuhan untuk anak 3–5: sortir objek (4 bentuk × 4 warna) ke bin yang benar, 8 ronde progresif, 1 bintang per ronde, auto-return ke dashboard.

**Architecture:** Game folder keempat dalam multi-page dashboard: `games/sortir-bentuk-warna/{index.html, sorting.js, game.js, style.css, tests/sorting.test.js}` + entri `shared/games-registry.js`. `sorting.js` = logika murni + aset SVG (UMD-lite, tesable); `game.js` = DOM/audio/TTS/skor/navigasi (pola `games/berhitung/game.js`).

**Tech Stack:** Vanilla HTML/CSS/JS; nol dependensi; `node --test` (Node ≥22); CDP smoke via `google-chrome --headless=new`.

## Global Constraints

- Nol dependensi/build/network; harus jalan dari `file://` DAN `http://`.
- Script klasik `<script>` (bukan ES modules).
- UMD-lite: `window.Sorting` + `module.exports`; **DILARANG ref `root.` di dalam factory** (pola `games/berhitung/counting.js`).
- `pointerdown` untuk semua interaksi; target sentuh ≥96px (objek, bin, tombol); ikon fungsional = SVG inline, BUKAN emoji (emoji hanya dekorasi teks).
- TTS id-ID fallback senyap via `GameAudio.speak`; `GameAudio.unlock()` saat gestur pertama.
- `GameAudio.fx` HANYA kind yang ada: `'pop' | 'ding' | 'wrong' | 'cheer'` — `shared/audio.js` TIDAK BOLEH diubah.
- JANGAN ubah `shared/profile.js`, `shared/audio.js`, dashboard, atau game lain; satu-satunya file shared yang berubah: `shared/games-registry.js`.
- Tes dari root: **`node --test` (bare, tanpa argumen path)** — bentuk `node --test tests/` GAGAL di setup ini; per-file WORKS.
- Auto-return: `setTimeout(backToDashboard, 6000)`; `clearTimeout(returnTimer)` SEBELUM membuat timer baru (pola `db02a00`).
- Tanpa timer/tekanan waktu; tanpa skor efisiensi: ronde selesai = 1 bintang, selalu.
- **Pelajaran smoke siklus sebelumnya:** jangan dispatch `pointerdown` ke tombol tersembunyi dari layar lain (mis. `#btn-start` saat ronde berjalan) — listener tetap terpanggil dan me-reset sesi.

---

### Task 1: sorting.js — logika murni & aset bentuk/warna + tes

**Files:**
- Create: `games/sortir-bentuk-warna/sorting.js`
- Create: `games/sortir-bentuk-warna/tests/sorting.test.js`

**Interfaces:**
- Consumes: — (mandiri)
- Produces (kontrak Task 2):
  - `Sorting.SHAPES[i]` → `{id, name, body}` (4; `body` = markup DALAM dengan placeholder `{FILL}` & `{STROKE}`, tanpa tag `<svg>`)
  - `Sorting.COLORS[i]` → `{id, name, hex}` (4)
  - `Sorting.ROUNDS` → 8 × `{attr:'color'|'shape', bins:[id...], count:int}`
  - `Sorting.makeItem(shapeId, colorId)` → `{shape, color, svg}` | null
  - `Sorting.binIcon(attr, id)` → string `<svg ...>…</svg>` lengkap | null
  - `Sorting.matches(attr, item, binId)` → bool
  - `Sorting.roundItems(roundIndex)` → array `count` item (semua ter-answerable)
  - `Sorting.shuffle(arr)` → salinan teracak (Fisher–Yates; tidak mengubah input)
  - `Sorting.isRoundDone(placed, count)` → bool

- [ ] **Step 1: Tulis tes gagal dulu** — `games/sortir-bentuk-warna/tests/sorting.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const Sorting = require('../sorting.js');

test('ada 4 bentuk dengan id unik, nama, dan body ber-placeholder', () => {
  assert.strictEqual(Sorting.SHAPES.length, 4);
  const ids = new Set();
  Sorting.SHAPES.forEach((s) => {
    assert.ok(s.id && !ids.has(s.id), 'id duplikat: ' + s.id);
    ids.add(s.id);
    assert.ok(s.name && s.name.trim().length > 0, 'nama kosong: ' + s.id);
    assert.ok(s.body.includes('{FILL}') && s.body.includes('{STROKE}'), 'placeholder hilang: ' + s.id);
    assert.ok(!s.body.includes('<svg'), 'body tidak boleh membungkus tag <svg>');
  });
  assert.ok(['circle', 'square', 'triangle', 'star'].every((x) => ids.has(x)), '4 bentuk standar');
});

test('ada 4 warna dengan id unik, nama, dan hex', () => {
  assert.strictEqual(Sorting.COLORS.length, 4);
  const ids = new Set();
  Sorting.COLORS.forEach((c) => {
    assert.ok(c.id && !ids.has(c.id), 'id duplikat: ' + c.id);
    ids.add(c.id);
    assert.ok(c.name && c.name.trim().length > 0, 'nama kosong: ' + c.id);
    assert.ok(/^#[0-9A-F]{6}$/.test(c.hex), 'hex invalid: ' + c.id + ' -> ' + c.hex);
  });
  assert.ok(['red', 'blue', 'yellow', 'green'].every((x) => ids.has(x)), '4 warna standar');
});

test('ROUNDS: 8 ronde dengan progresi bin 2,2,3,4,2,3,4,4', () => {
  assert.strictEqual(Sorting.ROUNDS.length, 8);
  const counts = Sorting.ROUNDS.map((r) => r.bins.length);
  assert.deepStrictEqual(counts, [2, 2, 3, 4, 2, 3, 4, 4]);
  Sorting.ROUNDS.forEach((r, i) => {
    assert.ok(r.attr === 'color' || r.attr === 'shape', 'attr invalid ronde ' + i);
    assert.ok(r.bins.length > 0, 'bins kosong ronde ' + i);
    assert.ok(r.count === 4 || r.count === 5, 'count invalid ronde ' + i + ' -> ' + r.count);
    r.bins.forEach((b) => {
      const pool = r.attr === 'color' ? Sorting.COLORS : Sorting.SHAPES;
      assert.ok(pool.some((x) => x.id === b), 'bin tak dikenal ronde ' + i + ': ' + b);
    });
  });
});

test('makeItem: 16 kombinasi valid, input tak dikenal -> null', () => {
  Sorting.SHAPES.forEach((s) => {
    Sorting.COLORS.forEach((c) => {
      const item = Sorting.makeItem(s.id, c.id);
      assert.ok(item, 'item null: ' + s.id + '/' + c.id);
      assert.strictEqual(item.shape, s.id);
      assert.strictEqual(item.color, c.id);
      assert.ok(item.svg.includes(c.hex), 'fill tidak sesuai: ' + s.id + '/' + c.id);
      assert.ok(item.svg.includes('#4A3728'), 'stroke objek harus gelap');
      assert.ok(!item.svg.includes('<svg'), 'svg tidak boleh membungkus tag <svg>');
    });
  });
  assert.strictEqual(Sorting.makeItem('hexagon', 'red'), null);
  assert.strictEqual(Sorting.makeItem('circle', 'pink'), null);
});

test('binIcon: color blob filled; shape stroke abu netral; unknown -> null', () => {
  const redBin = Sorting.binIcon('color', 'red');
  assert.ok(redBin.includes('<svg'), 'bin color harus berupa <svg> lengkap');
  assert.ok(redBin.includes('#E53935') && redBin.includes('aria-label="Merah"'), 'bin merah');
  const circleBin = Sorting.binIcon('shape', 'circle');
  assert.ok(circleBin.includes('#90A4AE') && circleBin.includes('fill="none"'), 'bin bentuk netral abu');
  assert.ok(!circleBin.includes('#E53935') && !circleBin.includes('#1E88E5'), 'bin bentuk tanpa warna');
  assert.strictEqual(Sorting.binIcon('color', 'pink'), null);
  assert.strictEqual(Sorting.binIcon('shape', 'hexagon'), null);
  assert.strictEqual(Sorting.binIcon('size', 'red'), null);
});

test('matches menegakkan kontrak atribut', () => {
  const item = { shape: 'circle', color: 'red' };
  assert.strictEqual(Sorting.matches('color', item, 'red'), true);
  assert.strictEqual(Sorting.matches('color', item, 'blue'), false);
  assert.strictEqual(Sorting.matches('shape', item, 'circle'), true);
  assert.strictEqual(Sorting.matches('shape', item, 'square'), false);
  assert.strictEqual(Sorting.matches('color', null, 'red'), false);
  assert.strictEqual(Sorting.matches('size', item, 'red'), false);
});

test('roundItems: tiap ronde ter-answerable dan konsisten atributnya', () => {
  const fixedShapes = ['circle', 'square', 'triangle', 'star'];
  Sorting.ROUNDS.forEach((r, i) => {
    const items = Sorting.roundItems(i);
    assert.strictEqual(items.length, r.count, 'jumlah item ronde ' + i);
    items.forEach((it) => {
      assert.ok(r.bins.some((b) => Sorting.matches(r.attr, it, b)),
        'item tanpa bin jawaban ronde ' + i + ': ' + JSON.stringify(it));
      if (r.attr === 'color') {
        assert.ok(r.bins.includes(it.color), 'warna di luar bin ronde ' + i);
      } else {
        assert.ok(r.bins.includes(it.shape), 'bentuk di luar bin ronde ' + i);
      }
    });
    if (i < 4) {
      const shapes = new Set(items.map((it) => it.shape));
      assert.strictEqual(shapes.size, 1, 'ronde warna ' + i + ' harus bentuk konstan: ' + fixedShapes[i]);
      assert.ok(shapes.has(fixedShapes[i]), 'bentuk konstan ronde ' + i);
    }
  });
});

test('shuffle adalah permutasi dan tidak mengubah input; isRoundDone boundaries', () => {
  const input = [1, 2, 3, 4];
  const out = Sorting.shuffle(input);
  assert.deepStrictEqual(input, [1, 2, 3, 4], 'input tidak berubah');
  assert.deepStrictEqual([...out].sort((a, b) => a - b), [1, 2, 3, 4], 'permutasi');
  assert.strictEqual(Sorting.isRoundDone(0, 4), false);
  assert.strictEqual(Sorting.isRoundDone(3, 4), false);
  assert.strictEqual(Sorting.isRoundDone(4, 4), true);
  assert.strictEqual(Sorting.isRoundDone(9, 4), true, 'over-place tidak merusak');
  assert.strictEqual(Sorting.isRoundDone(0, 0), false, 'count 0 bukan ronde sah');
});
```

- [ ] **Step 2: Jalankan tes → pastikan GAGAL**

Run: `node --test games/sortir-bentuk-warna/tests/sorting.test.js`
Expected: FAIL — `Cannot find module '../sorting.js'`

- [ ] **Step 3: Implementasi minimal** — `games/sortir-bentuk-warna/sorting.js`:

```js
// sorting.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Sorting = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SHAPES = [
    { id: 'circle', name: 'Lingkaran', body: '<circle cx="24" cy="24" r="14" fill="{FILL}" stroke="{STROKE}" stroke-width="4"/>' },
    { id: 'square', name: 'Kotak', body: '<rect x="10" y="10" width="28" height="28" rx="4" fill="{FILL}" stroke="{STROKE}" stroke-width="4" stroke-linejoin="round"/>' },
    { id: 'triangle', name: 'Segitiga', body: '<path d="M24 8 L40 34 L8 34 Z" fill="{FILL}" stroke="{STROKE}" stroke-width="4" stroke-linejoin="round"/>' },
    { id: 'star', name: 'Bintang', body: '<path d="M24 7 l4.5 9 9.8 1.1 -7.2 6.8 2 9.7L24 29.4 15 33.6l2 -9.7L9.8 17.1l9.8 -1.1Z" fill="{FILL}" stroke="{STROKE}" stroke-width="4" stroke-linejoin="round"/>' }
  ];

  var COLORS = [
    { id: 'red', name: 'Merah', hex: '#E53935' },
    { id: 'blue', name: 'Biru', hex: '#1E88E5' },
    { id: 'yellow', name: 'Kuning', hex: '#F9A825' },
    { id: 'green', name: 'Hijau', hex: '#43A047' }
  ];

  var ROUNDS = [
    { attr: 'color', bins: ['red', 'blue'], count: 4 },
    { attr: 'color', bins: ['yellow', 'green'], count: 4 },
    { attr: 'color', bins: ['red', 'yellow', 'blue'], count: 5 },
    { attr: 'color', bins: ['red', 'blue', 'yellow', 'green'], count: 5 },
    { attr: 'shape', bins: ['circle', 'square'], count: 5 },
    { attr: 'shape', bins: ['circle', 'square', 'triangle'], count: 5 },
    { attr: 'shape', bins: ['circle', 'square', 'triangle', 'star'], count: 5 },
    { attr: 'color', bins: ['red', 'blue', 'yellow', 'green'], count: 5 }
  ];

  function byId(pool, id) {
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function makeItem(shapeId, colorId) {
    var shape = byId(SHAPES, shapeId);
    var color = byId(COLORS, colorId);
    if (!shape || !color) return null;
    return {
      shape: shapeId,
      color: colorId,
      svg: shape.body.replace('{FILL}', color.hex).replace('{STROKE}', '#4A3728')
    };
  }

  function binIcon(attr, id) {
    if (attr === 'color') {
      var c = byId(COLORS, id);
      if (!c) return null;
      return '<svg viewBox="0 0 48 48" role="img" aria-label="' + c.name + '"><circle cx="24" cy="24" r="18" fill="' + c.hex + '" stroke="#4A3728" stroke-width="4"/></svg>';
    }
    if (attr === 'shape') {
      var s = byId(SHAPES, id);
      if (!s) return null;
      return '<svg viewBox="0 0 48 48" role="img" aria-label="' + s.name + '">' +
        s.body.replace('{FILL}', 'none').replace('{STROKE}', '#90A4AE') + '</svg>';
    }
    return null;
  }

  function matches(attr, item, binId) {
    if (!item) return false;
    if (attr === 'color') return item.color === binId;
    if (attr === 'shape') return item.shape === binId;
    return false;
  }

  function roundItems(roundIndex) {
    var r = ROUNDS[roundIndex];
    if (!r) return [];
    var items = [];
    var fixedShapes = ['circle', 'square', 'triangle', 'star'];
    for (var i = 0; i < r.count; i++) {
      var shapeId, colorId;
      if (r.attr === 'color') {
        colorId = r.bins[Math.floor(Math.random() * r.bins.length)];
        // Ronde 1-4: bentuk konstan (bergantian antar ronde); ronde 8: bentuk penuh bervariasi
        shapeId = roundIndex < 4 ? fixedShapes[roundIndex]
          : SHAPES[Math.floor(Math.random() * SHAPES.length)].id;
      } else {
        shapeId = r.bins[Math.floor(Math.random() * r.bins.length)];
        colorId = COLORS[Math.floor(Math.random() * COLORS.length)].id;
      }
      items.push(makeItem(shapeId, colorId));
    }
    return shuffle(items);
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
    SHAPES: SHAPES,
    COLORS: COLORS,
    ROUNDS: ROUNDS,
    makeItem: makeItem,
    binIcon: binIcon,
    matches: matches,
    roundItems: roundItems,
    shuffle: shuffle,
    isRoundDone: isRoundDone
  };
});
```

- [ ] **Step 4: Jalankan tes → pastikan LULUS**

Run: `node --test games/sortir-bentuk-warna/tests/sorting.test.js`
Expected: PASS — 8/8.

- [ ] **Step 5: Jalankan suite penuh dari root**

Run: `node --test` (bare, dari root git)
Expected: PASS semua — 30 lama + 8 baru = **38**? HITUNG ULANG: baseline sekarang **36** (30 + 6 counting) → 36 + 8 = **44**. Target spec ≥42 → 44 tercapai.

- [ ] **Step 6: Commit**

```bash
git add games/sortir-bentuk-warna/sorting.js games/sortir-bentuk-warna/tests/sorting.test.js
git commit -m "feat: add pure sorting logic (shapes, colors, rounds)"
```

---

### Task 2: halaman game + registri (integrasi penuh)

**Files:**
- Create: `games/sortir-bentuk-warna/index.html`
- Create: `games/sortir-bentuk-warna/style.css`
- Create: `games/sortir-bentuk-warna/game.js`
- Modify: `shared/games-registry.js` (tambah entri `sortir-bentuk-warna` SETELAH entri `berhitung`)

**Interfaces:**
- Consumes: `Sorting` (Task 1), `GameAudio` (`unlock/speak/fx/setMuted/isMuted`), `Profiles` (`addScore` — guard `root.Profiles`)
- Produces: game page yang dimuat dashboard via `games/sortir-bentuk-warna/index.html`; `Profiles.addScore('sortir-bentuk-warna', stars)`

- [ ] **Step 1: Fail-first via tes registri (TDD)**

Tambahkan entri registri dulu (kode di Step 3, blok Modify), lalu run:

Run: `node --test shared/tests/games-registry.test.js`
Expected: FAIL — `games/sortir-bentuk-warna/index.html` belum ada (fail-first yang sah).

- [ ] **Step 2: Buat `games/sortir-bentuk-warna/index.html`** (VERBATIM):

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sortir Bentuk &amp; Warna 🎨</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <section id="menu" class="screen">
    <h1 class="title">Sortir Bentuk &amp; Warna 🎨</h1>
    <p class="subtitle">Letakkan setiap bentuk ke tempatnya!</p>
    <button id="btn-start" class="btn-big">Main Yuk!</button>
    <button id="btn-sound" class="btn-sound" aria-label="Suara"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
  </section>

  <section id="round-screen" class="screen hidden">
    <header class="topbar">
      <span id="round-label" class="round-label">Ronde 1</span>
      <span id="progress-label" class="progress-label">1/4</span>
    </header>
    <main id="object" class="object"></main>
    <nav id="bins" class="bins" aria-label="Tempat sortir"></nav>
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
  <script src="sorting.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: Modify `shared/games-registry.js`** — tambahkan entri ke-4 setelah entri `berhitung` (sebelum `];`):

```js
    {
      id: 'sortir-bentuk-warna',
      name: 'Sortir Bentuk & Warna',
      maxStars: 8,
      path: 'games/sortir-bentuk-warna/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="16" cy="19" r="8" fill="none" stroke="#E53935" stroke-width="4"/><rect x="26" y="11" width="14" height="14" rx="3" fill="none" stroke="#1E88E5" stroke-width="4"/><path d="M24 33 l4.5 7 h-9 Z" fill="none" stroke="#F9A825" stroke-width="4" stroke-linejoin="round"/></svg>'
    }
```

- [ ] **Step 4: Buat `games/sortir-bentuk-warna/style.css`** (VERBATIM):

```css
/* style.css */
:root {
  --bg: #FFF8E1;
  --card: #FFFFFF;
  --ink: #5D4A2E;
  --accent: #F9A825;
  --accent-dark: #D08A00;
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
  gap: 18px;
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
  box-shadow: 0 4px 10px rgba(93, 74, 46, 0.2);
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
  box-shadow: 0 4px 12px rgba(93, 74, 46, 0.15);
  width: 100%;
  max-width: 640px;
}
.round-label { font-size: 1.5rem; font-weight: bold; color: var(--accent-dark); }
.progress-label { font-size: 1.4rem; font-weight: bold; color: var(--ink); }

/* Object */
.object {
  width: min(52%, 240px);
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pop 0.25s ease;
  transition: transform 0.22s ease, opacity 0.22s ease;
}
.object svg { width: 100%; height: 100%; }
.object.done {
  transform: scale(0.1);
  opacity: 0;
}
.object.shake { animation: shake 0.45s ease; }

@keyframes pop {
  from { transform: scale(0.7); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  50% { transform: translateX(10px); }
  75% { transform: translateX(-6px); }
}

/* Bins */
.bins {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  width: 100%;
  max-width: 640px;
}
.bin {
  width: 140px;
  height: 140px;
  min-width: 96px;
  border: none;
  border-radius: 28px;
  background: #fff;
  box-shadow: 0 4px 10px rgba(93, 74, 46, 0.18);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}
.bin svg { width: 76%; height: 76%; }
.bin:active { transform: scale(0.92); }
.bin.pulse {
  animation: binPulse 0.35s ease;
  box-shadow: 0 0 0 6px var(--ok) inset;
}
@keyframes binPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.12); }
}

/* Celebrate overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 248, 225, 0.94);
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

- [ ] **Step 5: Buat `games/sortir-bentuk-warna/game.js`** (VERBATIM):

```js
// game.js
(function (root) {
  'use strict';

  var Sorting = root.Sorting;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Sorting.ROUNDS.length;
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    items: [],
    itemIndex: 0,
    item: null,
    placed: 0,
    lock: false
  };

  function $(id) { return document.getElementById(id); }
  function roundAttr() { return Sorting.ROUNDS[state.roundIndex].attr; }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.roundLabel = $('round-label');
    els.progressLabel = $('progress-label');
    els.object = $('object');
    els.bins = $('bins');
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
      renderBin();
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
    var r = Sorting.ROUNDS[state.roundIndex];
    state.items = Sorting.roundItems(state.roundIndex);
    state.itemIndex = 0;
    state.placed = 0;
    state.lock = false;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    render('round');
    showItem();
  }

  function attrName(attr, id) {
    var pool = attr === 'color' ? Sorting.COLORS : Sorting.SHAPES;
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === id) return pool[i].name;
    }
    return '';
  }

  function renderBin() {
    els.bins.innerHTML = '';
    var r = Sorting.ROUNDS[state.roundIndex];
    r.bins.forEach(function (binId) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bin';
      b.dataset.bin = binId;
      b.innerHTML = Sorting.binIcon(r.attr, binId);
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onBinTap(binId, b);
      });
      els.bins.appendChild(b);
    });
  }

  function showItem() {
    state.item = state.items[state.itemIndex];
    els.object.className = 'object';
    els.progressLabel.textContent = (state.itemIndex + 1) + '/' + state.items.length;
    els.object.innerHTML = '<svg viewBox="0 0 48 48" role="img" aria-label="' +
      attrName(roundAttr(), roundAttr() === 'color' ? state.item.color : state.item.shape) + '">' +
      state.item.svg + '</svg>';
    state.lock = false;
    GameAudio.speak(attrName(roundAttr(), roundAttr() === 'color' ? state.item.color : state.item.shape) + '!');
  }

  function onBinTap(binId, btn) {
    if (state.screen !== 'round') return;
    if (state.lock) return;
    if (Sorting.matches(roundAttr(), state.item, binId)) {
      state.lock = true;
      GameAudio.fx('ding');
      btn.classList.add('pulse');
      els.object.classList.add('done');
      GameAudio.speak('Yeay! Betul!');
      window.setTimeout(function () {
        btn.classList.remove('pulse');
        state.placed++;
        if (Sorting.isRoundDone(state.placed, state.items.length)) {
          finishRound();
        } else {
          state.itemIndex++;
          showItem();
        }
      }, 320);
    } else {
      GameAudio.fx('wrong');
      els.object.classList.remove('shake');
      void els.object.offsetWidth; // restart animasi shake
      els.object.classList.add('shake');
      GameAudio.speak('Coba lagi!');
      window.setTimeout(function () {
        els.object.classList.remove('shake');
      }, 500);
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
    if (root.Profiles) root.Profiles.addScore('sortir-bentuk-warna', state.stars);
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
Expected: PASS semua — 36 lama + 8 sorting = **44**; dashboard.test.js kini meng-iterasi **4 game** (path ada, script `../../shared/audio.js` + `../../shared/profile.js` dimuat — index.html di atas sudah sesuai).

- [ ] **Step 7: Commit**

```bash
git add games/sortir-bentuk-warna/index.html games/sortir-bentuk-warna/style.css games/sortir-bentuk-warna/game.js shared/games-registry.js
git commit -m "feat: add Sortir Bentuk & Warna game with stars and auto-return"
```

---

### Task 3: Verifikasi final (controller — bukan subagen implementer)

**Files:** tanpa perubahan kode; hanya verifikasi + review.

**Interfaces:**
- Consumes: seluruh hasil Task 1–2
- Produces: keputusan merge + repo bersih

- [ ] **Step 1: Suite penuh**

Run: `node --test` dari root — wajib PASS (**44**). Konfirmasi `git status --short` hanya berisi file Task 1–2 (atau bersih setelah commit).

- [ ] **Step 2: Smoke E2E CDP (controller) — file:// + http:// 768×1024**

Pola `/tmp/smoke-berhitung.mjs` (Node ≥22 WebSocket + `google-chrome --headless=new --remote-debugging-port`) — **jangan tap tombol tersembunyi di dalam loop** (pelajaran siklus #3):
- Fase A `file://index.html`: dashboard tampil **4 kartu**; buat profil; buka kartu "Sortir Bentuk & Warna" (`document.title === 'Sortir Bentuk & Warna 🎨'`, menu); "Main Yuk!" → ronde 1: `#bins .bin` = 2 dan `#round-label` = "Ronde 1"; objek `#object svg` aria-label = nama atribut (mis. "Merah"); **mismatch sengaja ronde 1**: tap bin yang aria-label-nya ≠ atribut objek → asersi `#object.shake` muncul, `#object` TIDAK `.done`, dan tetap 1 objek (belum maju); lalu tap bin yang benar (aria-label == aria-label objek) → objek `.done`, `#progress-label` maju; ulangi sampai semua objek tersortir (tiap ronde: bins count = `[2,2,3,4,2,3,4,4][r-1]`); ronde 1–7 → overlay `#celebrate` → `#btn-celebrate`; ronde 8 → `#end-screen`; asersi: `#end-title` = "Sempurna! 🌟", `#stars .star.filled` = 8, `#btn-again` "Lainnya?"; auto-return ≤8 dtk (`document.title === 'Game Anak'`) → kartu game-4 `.game-stars` = "Bintang 8/8", kartu lain tanpa bintang; 0 error konsol; 0 request http.
- Fase B `http://127.0.0.1:<port>/index.html` (python3 http.server): viewport 768×1024: `scrollWidth <= innerWidth`; `#bins .bin` `getBoundingClientRect().width >= 96`; `#object` ≥96px; mainkan 8 ronde penuh seperti Fase A; asersi `#end-title` Sempurna; "Lainnya?" → dashboard; "Bintang 8/8" persist; 0 error konsol (tanpa 404 favicon).

- [ ] **Step 3: Ledger SDD** — tulis hasil di `.superpowers/sdd/2026-08-15-sortir-bentuk-warna/progress.md` (buat jika belum ada; dir gitignored).

- [ ] **Step 4: Review cabang penuh (agent reviewer)** — lensa: kepatuhan plan VERBATIM (Task 1–2), kontrak `Sorting.*` dipakai persis, registri entri ke-4 benar, acceptance spec §9 (8 kriteria) satu-per-satu, amanat (pointerdown, ≥96px, SVG bukan emoji, TTS id-ID, nol perubahan shared selain registri, UMD-lite tanpa `root.` di factory).

- [ ] **Step 5: Merge** — `git checkout master && git merge <branch>` (FF); suite root 44 lulus di master; `git worktree remove .worktrees/sortir-bentuk-warna` + prune; `git branch -d <branch>`; `git status` bersih.

- [ ] **Step 6: Ledger final + retain memory** — tulis hasil merge; simpan fakta durable (commit, 44/44, smoke pass).

---

## Self-Review Catatan

- **Spec §9 #1/#6/#8** → Task 1 (≥42: 44) + Task 2 (≥96px: bin 140px tetap, `.btn-big` min-height 96, `.btn-sound` 96; overflow: 4×140+gaps ≤ 640; auto-return + clearTimeout) ✓
- **Spec §9 #2/#3/#4/#5/#7** → Task 2 + Task 3 (registri ke-4 auto-render; file://+http:// smoke; alur penuh 8 ronde + bins count tabel; bin benar → ding + done + pujian, bin salah → wrong + shake + coba lagi + lock transisi 320ms≈250ms amanat; skor per profil via addScore guard) ✓
- **Spec §8 kontrak** → Task 1 Interfaces + tes (8 blok) ✓; helper lokal `roundAttr()` di game.js = akses `Sorting.ROUNDS[state.roundIndex].attr`; kontrak publik Sorting tidak berubah ✓
- Konsistensi nama: `Sorting.SHAPES/COLORS/ROUNDS/makeItem/binIcon/matches/roundItems/shuffle/isRoundDone` identik di Task 1 & Task 2 ✓
- Registri: dashboard.test.js meng-iterasi GAMES → entri ke-4 otomatis dicakup ✓