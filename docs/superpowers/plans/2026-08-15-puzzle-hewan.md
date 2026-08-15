# Puzzle Hewan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game puzzle tile satu-sentuhan untuk anak 3–5: pasangkan potongan bernomor gambar hewan ke slot bernomor, 8 ronde, 1 bintang per ronde, auto-return ke dashboard.

**Architecture:** Game folder kelima dalam multi-page dashboard: `games/puzzle-hewan/{index.html, puzzle.js, game.js, style.css, tests/puzzle.test.js}` + entri `shared/games-registry.js`. `puzzle.js` = logika murni + aset 8 SVG hewan (UMD-lite, tesable); `game.js` = DOM/audio/TTS/skor/navigasi (pola `games/sortir-bentuk-warna/game.js`).

**Tech Stack:** Vanilla HTML/CSS/JS; nol dependensi; `node --test` (Node ≥22); CDP smoke via `google-chrome --headless=new`.

## Global Constraints

- Nol dependensi/build/network; harus jalan dari `file://` DAN `http://`.
- Script klasik `<script>` (bukan ES modules).
- UMD-lite: `window.Puzzle` + `module.exports`; **DILARANG ref `root.` di dalam factory** (pola `games/sortir-bentuk-warna/sorting.js`).
- `pointerdown` untuk semua interaksi; target sentuh ≥96px (slot ≥96, potongan tray ≥120, tombol ≥96); ikon fungsional = SVG inline, BUKAN emoji (emoji hanya dekorasi teks).
- TTS id-ID fallback senyap via `GameAudio.speak`; `GameAudio.unlock()` saat gestur pertama.
- `GameAudio.fx` HANYA kind yang ada: `'ding' | 'wrong' | 'cheer'` (dipakai subset; `pop` TIDAK wajib) — `shared/audio.js` TIDAK BOLEH diubah.
- JANGAN ubah `shared/profile.js`, `shared/audio.js`, dashboard, game lain; satu-satunya file shared yang berubah: `shared/games-registry.js`.
- Tes dari root: **`node --test` (bare, tanpa argumen path)**.
- Auto-return: `setTimeout(backToDashboard, 6000)`; `clearTimeout(returnTimer)` SEBELUM membuat timer baru (pola `db02a00`).
- Tanpa timer/pressure; tanpa skor efisiensi: ronde selesai = 1 bintang, selalu.
- **Pelajaran smoke siklus #3:** jangan dispatch `pointerdown` ke tombol tersembunyi dari layar lain (mis. `#btn-start` saat ronde berjalan) — listener tetap terpanggil dan me-reset sesi. Di sini: jangan tap `#btn-celebrate` sebelum overlay tampil; jangan tap apapun ke `.slot` saat `#celebrate` aktif.

---

### Task 1: puzzle.js — logika murni & aset 8 hewan + tes

**Files:**
- Create: `games/puzzle-hewan/puzzle.js`
- Create: `games/puzzle-hewan/tests/puzzle.test.js`

**Interfaces:**
- Consumes: — (mandiri)
- Produces (kontrak Task 2):
  - `Puzzle.IMAGES[i]` → `{id, name, svg}` (8; `svg` = markup DALAM tanpa tag `<svg>`, viewBox 120×120)
  - `Puzzle.PIECES_PER_ROUND` → `[4,4,6,6,9,9,9,9]`
  - `Puzzle.layout(count)` → `{cols, rows}` | null
  - `Puzzle.makeBoard(imgIndex)` → `{image, pieces:[{n,col,row,x,y,w,h}]}` (pieces diacak) | null
  - `Puzzle.pieceSVG(imgIndex, piece)` → `<svg …>` lengkap (viewBox potongan + gambar ter-translate + `<text>` angka) | null
  - `Puzzle.shuffle(arr)` → salinan teracak (Fisher–Yates; tidak mengubah input)
  - `Puzzle.isRoundDone(placed, count)` → bool

- [ ] **Step 1: Tulis tes gagal dulu** — `games/puzzle-hewan/tests/puzzle.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const Puzzle = require('../puzzle.js');

test('ada 8 gambar hewan dengan id unik, nama, dan svg dalam', () => {
  assert.strictEqual(Puzzle.IMAGES.length, 8);
  const ids = new Set();
  Puzzle.IMAGES.forEach((img) => {
    assert.ok(img.id && !ids.has(img.id), 'id duplikat: ' + img.id);
    ids.add(img.id);
    assert.ok(img.name && img.name.trim().length > 0, 'nama kosong: ' + img.id);
    assert.ok(img.svg && img.svg.length > 0, 'svg kosong: ' + img.id);
    assert.ok(!img.svg.includes('<svg'), 'svg tidak boleh membungkus tag <svg>: ' + img.id);
    assert.ok(/<(circle|ellipse|rect|path)/.test(img.svg), 'svg tanpa bentuk dasar: ' + img.id);
  });
  assert.ok(['cat', 'dog', 'elephant', 'rabbit', 'duck', 'fish', 'bird', 'turtle']
    .every((x) => ids.has(x)), '8 hewan standar');
});

test('PIECES_PER_ROUND: 8 ronde, nilai 4/6/9', () => {
  assert.deepStrictEqual(Puzzle.PIECES_PER_ROUND, [4, 4, 6, 6, 9, 9, 9, 9]);
});

test('layout: 4 -> 2x2, 6 -> 3x2, 9 -> 3x3, lainnya null', () => {
  assert.deepStrictEqual(Puzzle.layout(4), { cols: 2, rows: 2 });
  assert.deepStrictEqual(Puzzle.layout(6), { cols: 3, rows: 2 });
  assert.deepStrictEqual(Puzzle.layout(9), { cols: 3, rows: 3 });
  assert.strictEqual(Puzzle.layout(0), null);
  assert.strictEqual(Puzzle.layout(5), null);
  assert.strictEqual(Puzzle.layout(12), null);
});

test('makeBoard: potongan unik 1..n, partisi 120x120 merata, index tak dikenal -> null', () => {
  Puzzle.IMAGES.forEach((img, i) => {
    const board = Puzzle.makeBoard(i);
    assert.ok(board, 'board null ronde ' + i);
    assert.strictEqual(board.image.id, img.id);
    const count = Puzzle.PIECES_PER_ROUND[i];
    assert.strictEqual(board.pieces.length, count);
    const seen = new Set();
    board.pieces.forEach((p) => {
      assert.ok(p.n >= 1 && p.n <= count && !seen.has(p.n), 'n rusak/duplikat: ' + p.n);
      seen.add(p.n);
      assert.ok(Number.isInteger(p.col) && Number.isInteger(p.row), 'col/row bukan integer');
    });
    // partisi merata tanpa overlap: kombinasi (x,y) unik dan x+w<=120, y+h<=120
    const cells = new Set();
    board.pieces.forEach((p) => {
      assert.strictEqual(p.w, 120 / (count === 4 ? 2 : count === 6 ? 3 : 3), 'lebarkan salah');
      assert.strictEqual(p.h, 120 / (count === 4 ? 2 : count === 6 ? 2 : 3), 'tinggi salah');
      assert.ok(p.x >= 0 && p.x + p.w <= 120.0001 && p.y >= 0 && p.y + p.h <= 120.0001, 'keluar papan');
      cells.add(p.x + ',' + p.y);
    });
    assert.strictEqual(cells.size, count, 'sel tumpang tindih');
  });
  assert.strictEqual(Puzzle.makeBoard(-1), null);
  assert.strictEqual(Puzzle.makeBoard(99), null);
});

test('pieceSVG: viewBox potongan, gambar ter-translate, angka, aria-label', () => {
  const imgIndex = 0;
  const board = Puzzle.makeBoard(imgIndex);
  const piece = board.pieces[0];
  const svg = Puzzle.pieceSVG(imgIndex, piece);
  assert.ok(svg.startsWith('<svg'), 'harus <svg> lengkap');
  assert.ok(svg.includes('role="img"') && svg.includes('aria-label="Potongan ' + piece.n + '"'), 'aria-label');
  assert.ok(svg.includes('viewBox="0 0 ' + piece.w + ' ' + piece.h + '"'), 'viewBox potongan');
  assert.ok(svg.includes('translate(' + (-piece.x) + ' ' + (-piece.y) + ')'), 'gambar ter-translate');
  assert.ok(svg.includes(Puzzle.IMAGES[imgIndex].svg), 'isi gambar utuh');
  assert.ok(svg.includes('<text') && svg.includes('>' + piece.n + '</text>'), 'angka potongan');
  assert.ok(!svg.includes('Potongan ' + (piece.n + 1) + '"'), 'angka salah');
  assert.strictEqual(Puzzle.pieceSVG(99, piece), null);
  assert.strictEqual(Puzzle.pieceSVG(0, null), null);
  assert.strictEqual(Puzzle.pieceSVG(-1, { n: 1 }), null);
});

test('shuffle adalah permutasi, tidak mengubah input, dan mengacak urutan panjang', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const out = Puzzle.shuffle(input);
  assert.deepStrictEqual(input, input.slice(0).sort((a, b) => a - b), 'input tidak berubah');
  assert.deepStrictEqual([...out].sort((a, b) => a - b), input, 'permutasi');
  assert.notDeepStrictEqual(out, input, 'urutan harus teracak (prob 1/20! ~ 0)');
});

test('isRoundDone boundaries', () => {
  assert.strictEqual(Puzzle.isRoundDone(0, 4), false);
  assert.strictEqual(Puzzle.isRoundDone(3, 4), false);
  assert.strictEqual(Puzzle.isRoundDone(4, 4), true);
  assert.strictEqual(Puzzle.isRoundDone(9, 9), true);
  assert.strictEqual(Puzzle.isRoundDone(5, 4), true, 'over-place tidak merusak');
  assert.strictEqual(Puzzle.isRoundDone(0, 0), false, 'count 0 bukan ronde sah');
});
```

- [ ] **Step 2: Jalankan tes → pastikan GAGAL**

Run: `node --test games/puzzle-hewan/tests/puzzle.test.js`
Expected: FAIL — `Cannot find module '../puzzle.js'`

- [ ] **Step 3: Implementasi minimal** — `games/puzzle-hewan/puzzle.js`:

```js
// puzzle.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Puzzle = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var IMAGES = [
    { id: 'cat', name: 'Kucing', svg:
      '<circle cx="60" cy="64" r="38" fill="#F9A825"/>' +
      '<path d="M28 34 L18 6 L46 22 Z" fill="#F9A825"/>' +
      '<path d="M92 34 L102 6 L74 22 Z" fill="#F9A825"/>' +
      '<path d="M30 32 L24 14 L41 23 Z" fill="#F2A5B8"/>' +
      '<path d="M90 32 L96 14 L79 23 Z" fill="#F2A5B8"/>' +
      '<circle cx="44" cy="60" r="6" fill="#4A3636"/>' +
      '<circle cx="76" cy="60" r="6" fill="#4A3636"/>' +
      '<path d="M50 76 Q60 86 70 76" stroke="#4A3636" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M38 80 L20 88 M82 80 l18 8" stroke="#4A3636" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<path d="M4 106 Q30 118 60 114 Q92 118 116 106" stroke="#F9A825" stroke-width="5" fill="none" stroke-linecap="round"/>' },
    { id: 'dog', name: 'Anjing', svg:
      '<ellipse cx="60" cy="70" rx="40" ry="36" fill="#A9744F"/>' +
      '<ellipse cx="28" cy="48" rx="15" ry="26" fill="#8B5A33"/>' +
      '<ellipse cx="92" cy="48" rx="15" ry="26" fill="#8B5A33"/>' +
      '<circle cx="44" cy="64" r="6" fill="#4A3636"/>' +
      '<circle cx="76" cy="64" r="6" fill="#4A3636"/>' +
      '<ellipse cx="60" cy="82" rx="12" ry="9" fill="#F5E6D3"/>' +
      '<circle cx="60" cy="76" r="5" fill="#4A3636"/>' +
      '<path d="M54 88 Q60 92 66 88" stroke="#4A3636" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="42" cy="20" r="8" fill="#8B5A33"/>' },
    { id: 'elephant', name: 'Gajah', svg:
      '<ellipse cx="60" cy="64" rx="42" ry="38" fill="#90A4AE"/>' +
      '<ellipse cx="20" cy="58" rx="17" ry="28" fill="#78909C"/>' +
      '<ellipse cx="100" cy="58" rx="17" ry="28" fill="#78909C"/>' +
      '<circle cx="42" cy="56" r="6" fill="#37474F"/>' +
      '<circle cx="78" cy="56" r="6" fill="#37474F"/>' +
      '<path d="M56 82 Q52 106 62 108 Q72 110 70 92 Q68 84 60 86 Q56 88 56 82 Z" fill="#90A4AE"/>' +
      '<path d="M34 98 Q30 112 46 112" stroke="#78909C" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M86 98 Q90 112 74 112" stroke="#78909C" stroke-width="7" fill="none" stroke-linecap="round"/>' },
    { id: 'rabbit', name: 'Kelinci', svg:
      '<ellipse cx="38" cy="26" rx="13" ry="28" fill="#F5F0E8"/>' +
      '<ellipse cx="82" cy="26" rx="13" ry="28" fill="#F5F0E8"/>' +
      '<ellipse cx="38" cy="26" rx="7" ry="18" fill="#F2A5B8"/>' +
      '<ellipse cx="82" cy="26" rx="7" ry="18" fill="#F2A5B8"/>' +
      '<circle cx="60" cy="62" r="36" fill="#F5F0E8"/>' +
      '<circle cx="46" cy="58" r="6" fill="#4A3636"/>' +
      '<circle cx="74" cy="58" r="6" fill="#4A3636"/>' +
      '<circle cx="60" cy="72" r="7" fill="#F2A5B8"/>' +
      '<path d="M60 79 L55 86 M60 79 l5 7" stroke="#4A3636" stroke-width="4" fill="none" stroke-linecap="round"/>' },
    { id: 'duck', name: 'Bebek', svg:
      '<circle cx="60" cy="56" r="38" fill="#F6D32D"/>' +
      '<circle cx="44" cy="50" r="6" fill="#333333"/>' +
      '<ellipse cx="62" cy="80" rx="20" ry="11" fill="#FF9F43"/>' +
      '<path d="M62 70 L62 90 M50 79 L74 79" stroke="#D08A00" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M30 40 Q44 14 66 26 Q82 36 76 48" stroke="#E8B93C" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="14" cy="84" r="9" fill="#F6D32D"/>' },
    { id: 'fish', name: 'Ikan', svg:
      '<ellipse cx="54" cy="60" rx="36" ry="24" fill="#5AA9E6"/>' +
      '<path d="M84 58 L110 38 L110 82 Z" fill="#4178B8"/>' +
      '<circle cx="40" cy="54" r="6" fill="#37474F"/>' +
      '<path d="M72 40 Q64 34 58 40" stroke="#4178B8" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M70 82 Q62 88 56 82" stroke="#4178B8" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M96 50 Q88 60 82 58" stroke="#5AA9E6" stroke-width="4" fill="none" stroke-linecap="round"/>' },
    { id: 'bird', name: 'Burung', svg:
      '<circle cx="56" cy="58" r="34" fill="#E53935"/>' +
      '<path d="M38 22 L46 34 L30 36 Z" fill="#C62828"/>' +
      '<path d="M84 52 L106 58 L84 64 Z" fill="#FF9F43"/>' +
      '<circle cx="44" cy="50" r="6" fill="#333333"/>' +
      '<ellipse cx="52" cy="70" rx="13" ry="11" fill="#C62828"/>' +
      '<path d="M64 78 Q82 74 90 60" stroke="#C62828" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path d="M76 88 L84 98" stroke="#FFB300" stroke-width="5" stroke-linecap="round"/>' },
    { id: 'turtle', name: 'Kura-kura', svg:
      '<ellipse cx="60" cy="66" rx="44" ry="30" fill="#6FBF44"/>' +
      '<path d="M60 38 L60 94 M30 52 L90 52 M24 78 L96 78 M60 52 L44 78 M60 52 L76 78 M44 56 L30 46 M76 56 L90 46" stroke="#43A047" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="36" cy="40" r="14" fill="#43A047"/>' +
      '<circle cx="32" cy="36" r="4" fill="#263238"/>' +
      '<ellipse cx="22" cy="90" rx="12" ry="8" fill="#43A047"/>' +
      '<ellipse cx="98" cy="90" rx="12" ry="8" fill="#43A047"/>' +
      '<path d="M60 100 Q56 112 66 112 Q76 112 70 100" stroke="#43A047" stroke-width="7" fill="none" stroke-linecap="round"/>' }
  ];

  var PIECES_PER_ROUND = [4, 4, 6, 6, 9, 9, 9, 9];

  function layout(count) {
    if (count === 4) return { cols: 2, rows: 2 };
    if (count === 6) return { cols: 3, rows: 2 };
    if (count === 9) return { cols: 3, rows: 3 };
    return null;
  }

  function makeBoard(imgIndex) {
    var img = IMAGES[imgIndex];
    if (!img) return null;
    var count = PIECES_PER_ROUND[imgIndex];
    var lay = layout(count);
    var w = 120 / lay.cols;
    var h = 120 / lay.rows;
    var pieces = [];
    for (var r = 0; r < lay.rows; r++) {
      for (var c = 0; c < lay.cols; c++) {
        pieces.push({
          n: r * lay.cols + c + 1,
          col: c,
          row: r,
          x: c * w,
          y: r * h,
          w: w,
          h: h
        });
      }
    }
    return { image: img, pieces: shuffle(pieces) };
  }

  function pieceSVG(imgIndex, piece) {
    var img = IMAGES[imgIndex];
    if (!img || !piece) return null;
    return '<svg viewBox="0 0 ' + piece.w + ' ' + piece.h + '" role="img" aria-label="Potongan ' + piece.n + '">' +
      '<g transform="translate(' + (-piece.x) + ' ' + (-piece.y) + ')">' + img.svg + '</g>' +
      '<text x="' + (piece.w - 5) + '" y="' + (piece.h - 2) + '" text-anchor="end" font-size="11" font-weight="bold" fill="#FFFFFF" stroke="#4A3636" stroke-width="2" font-family="sans-serif">' + piece.n + '</text>' +
      '</svg>';
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
    IMAGES: IMAGES,
    PIECES_PER_ROUND: PIECES_PER_ROUND,
    layout: layout,
    makeBoard: makeBoard,
    pieceSVG: pieceSVG,
    shuffle: shuffle,
    isRoundDone: isRoundDone
  };
});
```

- [ ] **Step 4: Jalankan tes → pastikan LULUS**

Run: `node --test games/puzzle-hewan/tests/puzzle.test.js`
Expected: PASS — 7 blok (brief memuat 7 blok test; angka "8 blok" di plan awal salah hitung).

- [ ] **Step 5: Jalankan suite penuh dari root**

Run: `node --test` (bare, dari root git)
Expected: PASS semua — baseline 44 + 7 puzzle = **51**. (Target spec: semua hijau; 51 ≥ 44 baseline.)

- [ ] **Step 6: Commit**

```bash
git add games/puzzle-hewan/puzzle.js games/puzzle-hewan/tests/puzzle.test.js
git commit -m "feat: add pure puzzle logic (8 animal images, boards, pieces)"
```

---

### Task 2: halaman game + registri (integrasi penuh)

**Files:**
- Create: `games/puzzle-hewan/index.html`
- Create: `games/puzzle-hewan/style.css`
- Create: `games/puzzle-hewan/game.js`
- Modify: `shared/games-registry.js` (tambah entri `puzzle-hewan` SETELAH entri `sortir-bentuk-warna`)

**Interfaces:**
- Consumes: `Puzzle` (Task 1), `GameAudio` (`unlock/speak/fx/setMuted/isMuted`), `Profiles` (`addScore` — guard `root.Profiles`)
- Produces: game page yang dimuat dashboard via `games/puzzle-hewan/index.html`; `Profiles.addScore('puzzle-hewan', stars)`

- [ ] **Step 1: Fail-first via tes registri (TDD)**

Tambahkan entri registri dulu (kode di Step 3, blok Modify), lalu run:

Run: `node --test shared/tests/games-registry.test.js`
Expected: FAIL — `games/puzzle-hewan/index.html` belum ada (fail-first yang sah).

- [ ] **Step 2: Buat `games/puzzle-hewan/index.html`** (VERBATIM):

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Puzzle Hewan 🧩</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <section id="menu" class="screen">
    <h1 class="title">Puzzle Hewan 🧩</h1>
    <p class="subtitle">Pasangkan potongan gambarnya!</p>
    <button id="btn-start" class="btn-big">Main Yuk!</button>
    <button id="btn-sound" class="btn-sound" aria-label="Suara"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg></button>
  </section>

  <section id="round-screen" class="screen hidden">
    <header class="topbar">
      <span id="round-label" class="round-label">Ronde 1</span>
      <span id="progress-label" class="progress-label">1/4</span>
    </header>
    <div id="reference" class="reference" aria-hidden="true"></div>
    <main id="grid" class="grid" aria-label="Papan puzzle"></main>
    <div id="tray" class="tray">
      <p id="piece-label" class="piece-label">Potongan 1</p>
      <div id="piece-big" class="piece-big"></div>
    </div>
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
  <script src="puzzle.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 3: Modify `shared/games-registry.js`** — tambahkan entri ke-5 setelah entri `sortir-bentuk-warna` (sebelum `];`):

```js
    {
      id: 'puzzle-hewan',
      name: 'Puzzle Hewan',
      maxStars: 8,
      path: 'games/puzzle-hewan/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="4" width="19" height="19" rx="4" fill="#E53935"/><rect x="25" y="4" width="19" height="19" rx="4" fill="#5AA9E6"/><rect x="4" y="25" width="19" height="19" rx="4" fill="#F9A825"/><rect x="25" y="25" width="19" height="19" rx="4" fill="#6FBF44"/></svg>'
    }
```

- [ ] **Step 4: Buat `games/puzzle-hewan/style.css`** (VERBATIM):

```css
/* style.css */
:root {
  --bg: #E8F5E9;
  --card: #FFFFFF;
  --ink: #3E5240;
  --accent: #6FBF44;
  --accent-dark: #4E942C;
  --ok: #5AA9E6;
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
  gap: 14px;
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
  box-shadow: 0 4px 10px rgba(62, 82, 64, 0.2);
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
  box-shadow: 0 4px 12px rgba(62, 82, 64, 0.15);
  width: 100%;
  max-width: 640px;
}
.round-label { font-size: 1.5rem; font-weight: bold; color: var(--accent-dark); }
.progress-label { font-size: 1.4rem; font-weight: bold; color: var(--ink); }

/* Reference image */
.reference {
  width: 120px;
  height: 120px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 4px 10px rgba(62, 82, 64, 0.15);
  overflow: hidden;
}
.reference svg { width: 100%; height: 100%; display: block; }

/* Grid slots */
.grid {
  display: grid;
  gap: 8px;
  width: min(88vw, 430px);
}
.slot {
  position: relative;
  aspect-ratio: 1 / 1;
  min-width: 0;
  border: none;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 3px 8px rgba(62, 82, 64, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: transform 0.12s ease;
}
.slot svg { width: 100%; height: 100%; display: block; opacity: 0.14; }
.slot:active { transform: scale(0.94); }
.slot .slot-num {
  position: absolute;
  right: 6px;
  bottom: 4px;
  font-size: 1.2rem;
  font-weight: bold;
  color: rgba(62, 82, 64, 0.55);
}
.slot.filled { pointer-events: none; box-shadow: 0 4px 10px rgba(62, 82, 64, 0.2); animation: snap 0.25s ease; }
.slot.filled svg { opacity: 1; }
.slot.filled .slot-num { display: none; }
.slot.shake { animation: shake 0.45s ease; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-5px); }
}
@keyframes snap {
  from { transform: scale(0.7); }
  to { transform: scale(1); }
}

/* Tray */
.tray {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: #fff;
  border-radius: 24px;
  padding: 10px 18px;
  box-shadow: 0 4px 12px rgba(62, 82, 64, 0.15);
}
.piece-label { font-size: 1.3rem; font-weight: bold; color: var(--accent-dark); }
.piece-big {
  width: min(34vw, 150px);
  animation: pop 0.25s ease;
}
.piece-big svg { width: 100%; height: 100%; display: block; }
@keyframes pop {
  from { transform: scale(0.7); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Celebrate overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(232, 245, 233, 0.94);
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

- [ ] **Step 5: Buat `games/puzzle-hewan/game.js`** (VERBATIM):

```js
// game.js
(function (root) {
  'use strict';

  var Puzzle = root.Puzzle;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Puzzle.IMAGES.length;
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    board: null,
    placed: 0,
    current: null,
    lock: false
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.roundLabel = $('round-label');
    els.progressLabel = $('progress-label');
    els.reference = $('reference');
    els.grid = $('grid');
    els.pieceLabel = $('piece-label');
    els.pieceBig = $('piece-big');
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

  function nextRound() {
    state.board = Puzzle.makeBoard(state.roundIndex);
    state.placed = 0;
    state.lock = false;
    var count = state.board.pieces.length;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    render('round');
    els.reference.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true">' + state.board.image.svg + '</svg>';
    GameAudio.speak('Pasangkan ' + state.board.image.name + '!');
    buildGrid();
    showNextPiece();
  }

  function buildGrid() {
    var count = state.board.pieces.length;
    var lay = Puzzle.layout(count);
    var cellW = 120 / lay.cols;
    var cellH = 120 / lay.rows;
    els.grid.style.gridTemplateColumns = 'repeat(' + lay.cols + ', 1fr)';
    els.grid.innerHTML = '';
    for (var n = 1; n <= count; n++) {
      var s = document.createElement('button');
      s.type = 'button';
      s.className = 'slot';
      s.dataset.slot = String(n);
      s.style.aspectRatio = cellW + ' / ' + cellH; // persis rasio potongan (1/1 atau 2/3) — tiling pas
      s.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true">' + state.board.image.svg + '</svg>' +
        '<span class="slot-num">' + n + '</span>';
      s.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onSlotTap(this.dataset.slot, this);
      });
      els.grid.appendChild(s);
    }
  }

  function showNextPiece() {
    state.current = state.board.pieces[state.placed];
    var count = state.board.pieces.length;
    els.pieceLabel.textContent = 'Potongan ' + state.current.n;
    els.pieceBig.style.aspectRatio = state.current.w + ' / ' + state.current.h;
    els.pieceBig.innerHTML = Puzzle.pieceSVG(state.roundIndex, state.current);
    els.progressLabel.textContent = (state.placed + 1) + '/' + count;
    state.lock = false;
  }

  function onSlotTap(slotNum, btn) {
    if (state.screen !== 'round') return;
    if (state.lock) return;
    if (btn.classList.contains('filled')) return;
    var n = parseInt(slotNum, 10);
    if (n !== state.current.n) {
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
    GameAudio.fx('ding');
    btn.classList.add('filled');
    btn.innerHTML = Puzzle.pieceSVG(state.roundIndex, state.current);
    if (state.placed > 0 && state.placed % 3 === 2) GameAudio.speak('Yeay!');
    window.setTimeout(function () {
      state.placed++;
      if (Puzzle.isRoundDone(state.placed, state.board.pieces.length)) {
        finishRound();
      } else {
        showNextPiece();
      }
    }, 320);
  }

  function finishRound() {
    state.stars++;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
      GameAudio.fx('cheer');
      GameAudio.speak('Hebat! ' + state.board.image.name + ' selesai!');
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
    if (root.Profiles) root.Profiles.addScore('puzzle-hewan', state.stars);
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
Expected: PASS semua — **51**; dashboard.test.js kini meng-iterasi **5 game** (path ada, script `../../shared/audio.js` + `../../shared/profile.js` dimuat — index.html di atas sudah sesuai).

- [ ] **Step 7: Commit**

```bash
git add games/puzzle-hewan/index.html games/puzzle-hewan/style.css games/puzzle-hewan/game.js shared/games-registry.js
git commit -m "feat: add Puzzle Hewan game with stars and auto-return"
```

---

### Task 3: Verifikasi final (controller — bukan subagen implementer)

**Files:** tanpa perubahan kode; hanya verifikasi + review.

**Interfaces:**
- Consumes: seluruh hasil Task 1–2
- Produces: keputusan merge + repo bersih

- [ ] **Step 1: Suite penuh**

Run: `node --test` dari root — wajib PASS (**51**). Konfirmasi `git status --short` hanya berisi file Task 1–2 (atau bersih setelah commit).

- [ ] **Step 2: Smoke E2E CDP (controller) — file:// + http:// 768×1024**

Pola `/tmp/smoke-sortir.mjs` (Node ≥22 WebSocket + `google-chrome --headless=new --remote-debugging-port`) — **jangan tap tombol tersembunyi di dalam loop** (pelajaran siklus #3); tap `#btn-celebrate` HANYA setelah overlay terlihat; jangan tap `.slot` saat `#celebrate`/`#end-screen` aktif:
- Fase A `file://index.html`: dashboard tampil **5 kartu**; buat profil; buka kartu "Puzzle Hewan" (`document.title === 'Puzzle Hewan 🧩'`, menu); "Main Yuk!" → ronde 1: `#grid .slot` = 4 & `#round-label` = "Ronde 1"; `#reference` terisi SVG; `#piece-label` = "Potongan N" & `#piece-big` `aria-label` = "Potongan N" konsisten; **mismatch sengaja ronde 1**: tap `.slot[data-slot]` ≠ N → asersi `.shake` muncul, `#piece-big` aria-label TETAP N (potongan tidak hilang), `#progress-label` tidak maju; lalu tap `.slot[data-slot=N]` → `.filled`, progress maju; ulangi sampai semua potongan terpasang (tiap ronde: slot count = `[4,4,6,6,9,9,9,9][r-1]`); ronde 1–7 → overlay `#celebrate` → `#btn-celebrate` → ronde berikut (`#round-label` naik); ronde 8 → `#end-screen`; asersi: `#end-title` = "Sempurna! 🌟", `#stars .star.filled` = 8, `#btn-again` "Lainnya?"; auto-return ≤8 dtk (`document.title === 'Game Anak'`) → kartu game-5 `.game-stars` = "Bintang 8/8", kartu lain tanpa bintang; 0 error konsol; 0 request http.
- Fase B `http://127.0.0.1:<port>/index.html` (python3 http.server): viewport 768×1024: `scrollWidth <= innerWidth`; `#btn-start` ≥96px; ronde 1: `.slot` ≥96px, `#piece-big` ≥96px; mainkan 8 ronde penuh seperti Fase A; asersi `#end-title` Sempurna; "Lainnya?" → dashboard; "Bintang 8/8" persist; 0 error konsol (tanpa 404 favicon).

- [ ] **Step 3: Ledger SDD** — tulis hasil di `.superpowers/sdd/2026-08-15-puzzle-hewan/progress.md` (buat; dir gitignored).

- [ ] **Step 4: Review cabang penuh (agent reviewer)** — lensa: kepatuhan plan VERBATIM (Task 1–2), kontrak `Puzzle.*` dipakai persis di game.js (IMAGES/PIECES_PER_ROUND/layout/makeBoard/pieceSVG — no drift), registri entri ke-5 benar (posisi, icon, path), acceptance spec §9 (8 kriteria) satu-per-satu dengan nomor kriteria dari spec, amanat global (pointerdown, ≥96px, SVG bukan emoji, TTS id-ID, nol perubahan shared selain registri, UMD-lite tanpa `root.` di factory), UX (slot salah → shake + potongan tetap; slot benar → filled + progress; TTS "Pasangkan {hewan}!" saat ronde mulai; pujian TTS hemat) + bukti verifikasi smoke (dari ledger).

- [ ] **Step 5: Merge** — `git checkout master && git merge <branch>` (FF); suite root 51 lulus di master; `git worktree remove .worktrees/puzzle-hewan` + prune; `git branch -d <branch>`; `git status` bersih.

- [ ] **Step 6: Ledger final + retain memory** — tulis hasil merge; simpan fakta durable (commit, 51/51, smoke pass).

---

## Self-Review Catatan

- **Spec §9 #1/#6/#8** → Task 1 (51/51: baseline 44 + 7 baru) + Task 2 (≥96px: `.slot` rasio persis potongan via inline style — 360vp: cell 100×100 (1/1) / 100×150 (2/3), 768vp: 138×138 / 138×207; sisi pendek selalu ≥96; `#piece-big` ≥96px & tray ≥120; `.btn-big`/`.btn-sound` 96; auto-return + clearTimeout) ✓
- **Tiling puzzle**: `.slot` `aspect-ratio` di-set inline = `cellW/cellH` (1/1 di ronde 2×2 & 3×3, 2/3 di 2×3) — tanpa ini, `preserveAspectRatio` default membuat gambar ronde 2×3 tidak menempel (kolom terpisah ~33%) ✓
- **Spec §9 #2/#3/#4/#5/#7** → Task 2 + Task 3 (registri ke-5 auto-render; file://+http:// smoke; 8 ronde + potongan [4,4,6,6,9,9,9,9] + grid cols [2,2,3,3,3,3,3,3]; tap slot benar → ding + filled + progress; salah → wrong + shake + coba lagi + lock 320ms; skor via addScore guard; auto-return "Bintang 8/8") ✓
- **Spec §8 kontrak** → Task 1 Interfaces + tes (7 blok murni bahwa `makeBoard`/`pieceSVG` memenuhi kontrak partisi): `pieceSVG` BUTUH `x,y` translate + angka `<text>` + aria-label "Potongan n"; `makeBoard` memberi piece `{n,col,row,x,y,w,h}` ✓
- Satu-satunya "acak" yang di-assert: `shuffle` panjang 20 (prob 1/20! ≈ 0); `makeBoard` di-test sebagai permutasi unik tanpa meng-assert urutan (menghindari flake) ✓
- Konsistensi kontrak Task 1 ↔ Task 2: `piece-big` ar-label dari `pieceSVG` dipakai smoke; `data-slot` di slot; TTS ronde mulai = "Pasangkan {Nama}!" — nama dari `board.image.name` ✓
- Registri: dashboard.test.js meng-iterasi GAMES → entri ke-5 otomatis dicakup ✓