# Seni & Suara Ramah Anak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti gambar hewan & kendaraan yang abstrak dengan gaya Kartun Imut A-2 via modul bersama `shared/art.js`, dan buat suara TTS lebih hangat via upgrade `shared/audio.js`.

**Architecture:** `shared/art.js` = satu-sumber seni A-2 (token gaya + helper + 12 hewan + 8 kendaraan + fallback), dimuat UMD (Node `require` / browser `root.Art`). `animals.js`/`puzzle.js`/`vehicles.js` jadi adaptor tipis yang mempertahankan id/API publik. `shared/audio.js` ditingkatkan (scoring voice, rate/pitch, fx `party`) — kena semua game. Tiga game cakupan juga mengganti `fx('cheer')` → `fx('party')` di situs kemenangan.

**Tech Stack:** Vanilla JS (UMD-lite), Node `node --test`, SVG inline, CDP browser smoke (google-chrome headless).

## Global Constraints

- Semua warna `fill="#…"`/`stroke="#…"` di aset ∈ `Art.PALETTE`; `rgba(0,0,0,…)` hanya untuk bayangan tanah/air.
- Setiap aset: ≥150 karakter, ≥8 elemen bentuk, TANPA bungkus `<svg>`/`<g>` (kecuali adaptor Animals menambah `<g>`).
- Id hewan cocok `/^[a-z]+(?:-[a-z]+)*$/` (`kura-kura` diperbolehkan; tanpa hubung ganda/awal/akhir).
- Id & nama publik game TIDAK berubah; `Animals` svg tetap dibungkus `<g>…</g>`; Puzzle & Vehicles tanpa bungkus.
- Render tetap via wrapper `<svg viewBox="0 0 120 120">`; puzzle: `buildGrid()` menampilkan SVG utuh di slot kosong, `pieceSVG()` untuk potongan — mekanik TIDAK berubah.
- Baseline **68 tes** tetap hijau; file test yang berubah = `games/temukan-hewan/tests/audio.test.js` (+2 blok additif) DAN `games/puzzle-hewan/tests/puzzle.test.js` (+1 blok additif `SUBJECT_MAP`, Task 5). `shared/tests/art.test.js` baru (Task 1).
- Game jalan offline (`file://`) DAN `http://`; tanpa aset eksternal; tanpa perubahan `profile.js`/`games-registry.js`/`avatars.js`.
- Header UMD adaptor TIDAK berubah (`module.exports = factory()` / `root.X = factory()` — `factory()` TANPA argumen, `root` TIDAK dalam lexical scope factory). Pengambilan `Art` di dalam factory memakai `(typeof module === 'object' && module.exports) ? require('../../shared/art.js') : (typeof self !== 'undefined' ? self : globalThis).Art` — JANGAN pakai `root.Art` (ReferenceError di browser).
- Konvensi commit: `feat:`/`refactor:`/`docs:` sesuai isi, pesan singkat Bahasa Inggris (pola repo).

---

### Task 1: Fondasi `shared/art.js` — token gaya, helper, fallback, lookup

**Files:**
- Create: `shared/art.js`
- Create: `shared/tests/art.test.js`
- Modify: (tidak ada)

**Interfaces:**
- Consumes: tidak ada (modul baru).
- Produces (dipakai Task 2–5):
  - `Art.OUTLINE` : `'#5A4630'`
  - `Art.PALETTE` : `Array<string>` hex whitelist
  - `Art.FALLBACK` : string SVG isi-dalam (bintang A-2)
  - `Art.ANIMALS` : `Array<{id, name, group}>` (12 — diisi Task 3)
  - `Art.VEHICLES` : `Array<{id, name}>` (8 — diisi Task 2)
  - `Art.animalSvg(id) -> string | FALLBACK` (+`console.error`)
  - `Art.vehicleSvg(id) -> string | FALLBACK` (+`console.error`)
  - Helper internal (dipakai Task 2/3 di file yang sama): `eyesE(cx,cy,s)`, `brows(cx,cy,s)`, `blush(cx,cy,s)`, `muzzle(cx,cy,s,opts)`, `body(cx,cy,s,color)`, `collarTag(cx,cy,s)`, `pawsY(cx,cy,s)`, `groundShadow(cx,cy,rx,s)`, `O(w)`.

- [ ] **Step 1: Tulis test gagal** — `shared/tests/art.test.js`

```js
const test = require('node:test');
const assert = require('node:assert');
const Art = require('../art.js');

function findHexes(svg) {
  const out = [];
  const re = /(?:fill|stroke)="#([0-9A-Fa-f]{6})"/g;
  let m;
  while ((m = re.exec(svg)) !== null) out.push('#' + m[1].toUpperCase());
  return out;
}

function styleOk(svg) {
  const shapes = (svg.match(/<(circle|ellipse|rect|path|polygon)/g) || []);
  if (svg.length < 150) return 'terlalu pendek';
  if (shapes.length < 8) return 'elemen bentuk < 8';
  if (svg.includes('<svg') || svg.trim().startsWith('<g')) return 'ada bungkus';
  if (!svg.includes('#5A4630')) return 'tanpa stroke token';
  for (const hex of findHexes(svg)) {
    if (!Art.PALETTE.includes(hex)) return 'warna liar: ' + hex;
  }
  return null;
}

test('Art diekspor dengan konstanta gaya', () => {
  assert.strictEqual(Art.OUTLINE, '#5A4630');
  assert.ok(Array.isArray(Art.PALETTE) && Art.PALETTE.length >= 20);
});

test('FALLBACK adalah bintang A-2 valid dan bebas warna liar', () => {
  const f = Art.FALLBACK;
  assert.ok(typeof f === 'string' && f.length >= 150, 'panjang >= 150');
  assert.ok(!f.includes('<svg') && !f.trim().startsWith('<g'), 'tanpa bungkus');
  assert.ok((f.match(/<(circle|ellipse|rect|path|polygon)/g) || []).length >= 4);
  assert.ok(f.includes('#5A4630'), 'memakai stroke token A-2');
  for (const hex of findHexes(f)) assert.ok(Art.PALETTE.includes(hex), 'warna liar: ' + hex + ' di FALLBACK');
});

test('lookup hewan/kendaraan: dikenal -> string, tak dikenal -> FALLBACK + console.error', () => {
  const orig = console.error;
  const calls = [];
  console.error = (...a) => calls.push(a.join(' '));
  try {
    assert.strictEqual(Art.animalSvg('kucing'), Art.ANIMALS.find(a => a.id === 'kucing').svg);
    assert.strictEqual(Art.animalSvg('nope'), Art.FALLBACK);
    assert.strictEqual(Art.vehicleSvg('car'), Art.VEHICLES.find(v => v.id === 'car').svg);
    assert.strictEqual(Art.vehicleSvg('nope'), Art.FALLBACK);
    assert.ok(calls.length >= 2 && calls.every(c => c.includes('tak dikenal')));
  } finally {
    console.error = orig;
  }
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL**

Run: `cd /home/swanster/projects/games/games-kay && node --test shared/tests/art.test.js`
Expected: FAIL (Cannot find module `../art.js`).

- [ ] **Step 3: Implementasi minimal** — `shared/art.js` (fondasi + kucing + car sebagai seed)

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Art = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var OUTLINE = '#5A4630';

  var PALETTE = [
    '#3A2A1E', '#4A3728', '#5A4630', '#6D4C41', '#8A5A33', '#9DA9B5', '#A3B8C4',
    '#B07A4F', '#B39DDB', '#B97A45', '#C08A5C', '#C98E5A', '#D9A87C', '#E0A86E',
    '#E4E8EC', '#E08A2E', '#E53935', '#F0C060', '#F0C9A0', '#F4A63A', '#F6D9B8',
    '#F9A825', '#F9C6D2', '#FB8C00', '#FBE8C8', '#FF8A80', '#FFB3B3', '#FFD54F',
    '#FFE082', '#FF7043', '#7CB342', '#43A047', '#26C6DA', '#1E88E5', '#7E57C2',
    '#8E24AA', '#FFFFFF', '#FFCA28', '#4DB6AC', '#9E9E9E', '#F0E6D2'
  ];

  function O(w) { return ' stroke="#5A4630" stroke-width="' + (w || 4) + '"'; }

  function eyesE(cx, cy, s) {
    s = s || 1;
    return '<circle cx="' + (cx - 16 * s) + '" cy="' + (cy - 2 * s) + '" r="' + (9 * s) + '" fill="#FFFFFF" stroke="#5A4630" stroke-width="' + (3 * s) + '"/>' +
      '<circle cx="' + (cx + 16 * s) + '" cy="' + (cy - 2 * s) + '" r="' + (9 * s) + '" fill="#FFFFFF" stroke="#5A4630" stroke-width="' + (3 * s) + '"/>' +
      '<circle cx="' + (cx - 16 * s) + '" cy="' + (cy + 1 * s) + '" r="' + (4.5 * s) + '" fill="#3A2A1E"/>' +
      '<circle cx="' + (cx + 16 * s) + '" cy="' + (cy + 1 * s) + '" r="' + (4.5 * s) + '" fill="#3A2A1E"/>' +
      '<circle cx="' + (cx - 14.5 * s) + '" cy="' + (cy - 3.5 * s) + '" r="' + (1.8 * s) + '" fill="#FFFFFF"/>' +
      '<circle cx="' + (cx + 17.5 * s) + '" cy="' + (cy - 3.5 * s) + '" r="' + (1.8 * s) + '" fill="#FFFFFF"/>';
  }

  function brows(cx, cy, s) {
    s = s || 1;
    return '<path d="M' + (cx - 22 * s) + ' ' + (cy - 10 * s) + ' q ' + (5 * s) + ' ' + (-4 * s) + ' ' + (10 * s) + ' ' + (-1 * s) + '" stroke="#5A4630" stroke-width="' + (3 * s) + '" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + (cx + 12 * s) + ' ' + (cy - 11 * s) + ' q ' + (5 * s) + ' ' + (-3 * s) + ' ' + (10 * s) + ' ' + (1 * s) + '" stroke="#5A4630" stroke-width="' + (3 * s) + '" fill="none" stroke-linecap="round"/>';
  }

  function blush(cx, cy, s) {
    s = s || 1;
    return '<ellipse cx="' + (cx - 23 * s) + '" cy="' + (cy + 8 * s) + '" rx="' + (7 * s) + '" ry="' + (4.5 * s) + '" fill="#FFB3B3"/>' +
      '<ellipse cx="' + (cx + 23 * s) + '" cy="' + (cy + 8 * s) + '" rx="' + (7 * s) + '" ry="' + (4.5 * s) + '" fill="#FFB3B3"/>';
  }

  function muzzle(cx, cy, s, opts) {
    s = s || 1;
    opts = opts || {};
    var out = '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (16 * s) + '" ry="' + (12 * s) + '" fill="#F6D9B8"/>' +
      '<ellipse cx="' + cx + '" cy="' + (cy - 5 * s) + '" rx="' + (6 * s) + '" ry="' + (4.5 * s) + '" fill="#3A2A1E"/>' +
      '<ellipse cx="' + (cx - 2 * s) + '" cy="' + (cy - 6.5 * s) + '" rx="' + (2 * s) + '" ry="' + (1.4 * s) + '" fill="#FFFFFF"/>' +
      '<path d="M' + (cx - 6 * s) + ' ' + (cy + 4 * s) + ' q ' + (6 * s) + ' ' + (4 * s) + ' ' + (12 * s) + ' 0" stroke="#5A4630" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    if (opts.tongue !== false) {
      out += '<ellipse cx="' + cx + '" cy="' + (cy + 11 * s) + '" rx="' + (5 * s) + '" ry="' + (5.5 * s) + '" fill="#FF8A80" stroke="#5A4630" stroke-width="' + (3 * s) + '"/>';
    }
    return out;
  }

  function body(cx, cy, s, color) {
    s = s || 1;
    color = color || '#E0A86E';
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (26 * s) + '" ry="' + (13 * s) + '" fill="' + color + '" stroke="#5A4630" stroke-width="' + (5 * s) + '"/>' +
      '<ellipse cx="' + cx + '" cy="' + (cy + 1 * s) + '" rx="' + (15 * s) + '" ry="' + (8 * s) + '" fill="#F0C9A0"/>';
  }

  function collarTag(cx, cy, s) {
    s = s || 1;
    return '<rect x="' + (cx - 20 * s) + '" y="' + (cy - 12 * s) + '" width="' + (40 * s) + '" height="' + (9 * s) + '" rx="' + (4.5 * s) + '" fill="#E53935" stroke="#5A4630" stroke-width="' + (3.5 * s) + '"/>' +
      '<circle cx="' + cx + '" cy="' + (cy - 2 * s) + '" r="' + (6 * s) + '" fill="#FFD54F" stroke="#5A4630" stroke-width="' + (3 * s) + '"/>';
  }

  function pawsY(cx, cy, s) {
    s = s || 1;
    return '<ellipse cx="' + (cx - 13 * s) + '" cy="' + cy + '" rx="' + (8 * s) + '" ry="' + (5.5 * s) + '" fill="#F6D9B8" stroke="#5A4630" stroke-width="' + (3.5 * s) + '"/>' +
      '<ellipse cx="' + (cx + 13 * s) + '" cy="' + cy + '" rx="' + (8 * s) + '" ry="' + (5.5 * s) + '" fill="#F6D9B8" stroke="#5A4630" stroke-width="' + (3.5 * s) + '"/>';
  }

  function groundShadow(cx, cy, rx, s) {
    s = s || 1;
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (rx * s) + '" ry="' + (5 * s) + '" fill="rgba(0,0,0,0.12)"/>';
  }

  var FALLBACK =
    '<path d="M60 18 l7.5 16.5 18 2.5 -13 12.5 3 18 -15.5 -8.5 -15.5 8.5 3 -18 -13 -12.5 18 -2.5 Z" fill="#FFCA28"' + O(5) + ' stroke-linejoin="round"/>' +
    '<circle cx="60" cy="42" r="3.5" fill="#FFFFFF"/>' +
    '<circle cx="44" cy="72" r="2.5" fill="#FFFFFF"/>' +
    '<ellipse cx="60" cy="100" rx="20" ry="4" fill="rgba(0,0,0,0.12)"/>';

  // KUCING (seed Task 1; lengkap di Task 3)
  var kucing =
    groundShadow(60, 112, 36) +
    '<path d="M32 44 L44 12 L58 36 Z" fill="#B97A45"' + O() + ' stroke-linejoin="round"/>' +
    '<path d="M88 44 L76 12 L62 36 Z" fill="#B97A45"' + O() + ' stroke-linejoin="round"/>' +
    '<path d="M42 42 L46 22 L54 36 Z" fill="#F9C6D2"' + O(2) + ' stroke-linejoin="round"/>' +
    '<path d="M78 42 L74 22 L66 36 Z" fill="#F9C6D2"' + O(2) + ' stroke-linejoin="round"/>' +
    '<circle cx="60" cy="60" r="34" fill="#E0A86E"' + O(5) + '/>' +
    '<path d="M45 34 l4 -9 M55 32 l3 -8 M65 32 l3 -8 M75 34 l4 -9" stroke="#B97A45" stroke-width="4" stroke-linecap="round"/>' +
    eyesE(60, 54) +
    brows(60, 52) +
    blush(60, 66) +
    muzzle(60, 70) +
    '<path d="M26 62 L12 58 M26 68 L12 68 M26 74 L12 78 M94 62 L108 58 M94 68 L108 68 M94 74 L108 78" stroke="#5A4630" stroke-width="2" stroke-linecap="round"/>' +
    body(60, 100) +
    collarTag(60, 100) +
    pawsY(60, 113);

  // CAR (seed Task 1; lengkap di Task 2)
  function wheel(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#4A3728"' + O(3) + '/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.45) + '" fill="#9E9E9E"/>' +
      '<circle cx="' + (cx - r * 0.15) + '" cy="' + (cy - r * 0.15) + '" r="' + (r * 0.15) + '" fill="#FFFFFF"/>';
  }
  var car =
    groundShadow(60, 108, 44) +
    '<path d="M22 70 L30 46 a6 6 0 0 1 6 -5 h32 a6 6 0 0 1 6 5 l8 24 h-52 Z" fill="#E53935"' + O(5) + ' stroke-linejoin="round"/>' +
    '<rect x="36" y="42" width="26" height="19" rx="5" fill="#F0C9A0"' + O(3) + '/>' +
    '<path d="M42 46 l4 4 M56 46 l4 4" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="34" cy="64" r="4" fill="#FFE082"' + O(2.5) + '/>' +
    wheel(34, 84, 13) + wheel(78, 84, 13);

  var ANIMALS = [{ id: 'kucing', name: 'Kucing', group: 'feline', svg: kucing }];  // diperluas di Task 3
  var VEHICLES = [{ id: 'car', name: 'Mobil', svg: car }]; // diperluas di Task 2

  function catalogMap(arr) {
    var m = {};
    arr.forEach(function (e) { m[e.id] = e; });
    return m;
  }
  var animalById = null;
  var vehicleById = null;

  function unknown(kind, id) {
    console.error('[art] ' + kind + ' tak dikenal:', id);
    return FALLBACK;
  }

  function animalSvg(id) {
    if (!animalById) animalById = catalogMap(ANIMALS);
    var e = animalById[id];
    return e ? e.svg : unknown('animal', id);
  }

  function vehicleSvg(id) {
    if (!vehicleById) vehicleById = catalogMap(VEHICLES);
    var e = vehicleById[id];
    return e ? e.svg : unknown('vehicle', id);
  }

  return {
    OUTLINE: OUTLINE,
    PALETTE: PALETTE,
    FALLBACK: FALLBACK,
    ANIMALS: ANIMALS,
    VEHICLES: VEHICLES,
    animalSvg: animalSvg,
    vehicleSvg: vehicleSvg
  };
});
```

- [ ] **Step 4: Jalankan test, pastikan PASS (sebagian)**

Run: `cd /home/swanster/projects/games/games-kay && node --test shared/tests/art.test.js`
Expected: PASS — "konstanta gaya", "FALLBACK valid" (1 path + 2 circle + 1 ellipse = 4 elemen, asersi `>= 4`), "lookup hewan/kendaraan" (seed `kucing` & `car` langsung masuk katalog awal di Step 3, jadi lookup test PASS sejak Task 1).

- [ ] **Step 5: Commit**

```bash
git add shared/art.js shared/tests/art.test.js
git commit -m "feat: shared art module foundation — style tokens, helpers, fallback, lookup"
```

---

### Task 2: Katalog kendaraan (8) gaya A-2

**Files:**
- Modify: `shared/art.js` (isi `VEHICLES`; hapus deklarasi `var car` seed & pindahkan `wheel` ke atas katalog)
- Modify: `shared/tests/art.test.js` (tambah blok)

**Interfaces:**
- Consumes: `Art.VEHICLES` (Task 1), helper `wheel`/`groundShadow`/`O`.
- Produces: `Art.VEHICLES` 8 entri `{id, name, svg}` (id: car, train, plane, ship, bike, tractor, bus, helicopter); dipakai Task 5 (vehicles.js) & Task 6 (smoke).

- [ ] **Step 1: Tulis test gagal (tambah blok di `shared/tests/art.test.js`, pakai `findHexes` & `styleOk` dari Task 1)**

```js
test('VEHICLES: 8 kendaraan standar, id unik, nama non-kosong, gaya A-2', () => {
  assert.ok(Array.isArray(Art.VEHICLES) && Art.VEHICLES.length === 8);
  const ids = Art.VEHICLES.map(v => v.id);
  const names = Art.VEHICLES.map(v => v.name);
  assert.strictEqual(new Set(ids).size, 8);
  assert.ok(names.every(n => n && n.trim().length > 0));
  for (const id of ['car', 'train', 'plane', 'ship', 'bike', 'tractor', 'bus', 'helicopter']) {
    assert.ok(ids.includes(id), 'harus ada ' + id);
  }
  for (const v of Art.VEHICLES) {
    assert.strictEqual(styleOk(v.svg), null, v.id + ': ' + styleOk(v.svg));
    assert.ok(!v.svg.includes('<svg'), v.id + ' tanpa <svg>');
  }
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL**

Run: `node --test shared/tests/art.test.js`
Expected: FAIL (VEHICLES.length === 1).

- [ ] **Step 3: Implementasi — isi `VEHICLES` di `shared/art.js`**

Urutan implementasi berurutan (Task 1 → 2 → 3): HAPUS seed `var car = ...` (kucing seed TIDAK ikut dihapus), lalu GANTI HANYA deklarasi `var VEHICLES = [ ... ];` dengan katalog berikut. **PERTAHANKAN deklarasi seed `var ANIMALS = [ ... ];` apa adanya** — baru diganti katalog lengkap di Task 3. `wheel` tetap didefinisikan sekali di atas (semua isi-dalam, warna ∈ PALETTE):

```js
  var VEHICLES = [
    { id: 'car', name: 'Mobil', svg:
      groundShadow(60, 108, 44) +
      '<path d="M22 70 L30 46 a6 6 0 0 1 6 -5 h32 a6 6 0 0 1 6 5 l8 24 h-52 Z" fill="#E53935"' + O(5) + ' stroke-linejoin="round"/>' +
      '<rect x="36" y="42" width="26" height="19" rx="5" fill="#F0C9A0"' + O(3) + '/>' +
      '<path d="M42 46 l4 4 M56 46 l4 4" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="34" cy="64" r="4" fill="#FFE082"' + O(2.5) + '/>' +
      wheel(34, 84, 13) + wheel(78, 84, 13) },
    { id: 'train', name: 'Kereta', svg:
      groundShadow(60, 108, 46) +
      '<path d="M18 66 L26 42 h52 l6 13 a4 4 0 0 1 1 4 v7 h-65 Z" fill="#1E88E5"' + O(5) + ' stroke-linejoin="round"/>' +
      '<rect x="34" y="44" width="24" height="16" rx="4" fill="#F0C9A0"' + O(3) + '/>' +
      '<path d="M16 62 l6 -12 h8 v12 Z" fill="#7E57C2"' + O(3) + ' stroke-linejoin="round"/>' +
      '<rect x="26" y="54" width="6" height="7" rx="2" fill="#FFFFFF" opacity="0.85"/>' +
      '<circle cx="28" cy="36" r="6" fill="#FF7043"' + O(3) + '/>' +
      wheel(24, 84, 12) + wheel(52, 84, 12) + wheel(78, 84, 12) },
    { id: 'plane', name: 'Pesawat', svg:
      groundShadow(60, 108, 44) +
      '<path d="M20 74 a26 14 0 0 1 52 -6 l36 4 -8 10 -38 -2 a30 12 0 0 0 -18 4 l-16 -4 a8 8 0 0 1 -8 -6 Z" fill="#FB8C00"' + O(4) + ' stroke-linejoin="round"/>' +
      '<path d="M40 46 l-14 -18 M46 52 l8 -24 M34 74 l-16 -6" stroke="#FBE8C8" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M90 70 l10 -16 8 16 Z" fill="#E08A2E"' + O(3) + ' stroke-linejoin="round"/>' +
      '<path d="M30 82 h42" stroke="#FBE8C8" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="44" cy="62" r="7" fill="#F0C9A0"' + O(3) + '/>' +
      '<circle cx="42" cy="60" r="2" fill="#FFFFFF"/>' +
      '<circle cx="14" cy="74" r="4" fill="#4A3728"' + O(2.5) + '/>' +
      '<path d="M14 62 v24 M4 74 h20" stroke="#4A3728" stroke-width="4" stroke-linecap="round"/>' },
    { id: 'ship', name: 'Kapal', svg:
      '<path d="M18 72 a38 14 0 0 0 30 12 a14 14 0 0 0 10 -3 a38 12 0 0 0 26 -8 l-8 26 h-50 Z" fill="#26C6DA"' + O(5) + ' stroke-linejoin="round"/>' +
      '<rect x="34" y="42" width="24" height="24" rx="5" fill="#FBE8C8"' + O(4) + '/>' +
      '<path d="M38 46 h16 M38 52 h16 M38 58 h10" stroke="#E53935" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M38 34 v8" stroke="#5A4630" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M38 34 l14 -3 v6 Z" fill="#E53935"' + O(2.5) + ' stroke-linejoin="round"/>' +
      '<circle cx="40" cy="74" r="3.5" fill="#FFFFFF"' + O(2) + '/>' +
      '<circle cx="52" cy="76" r="3.5" fill="#FFFFFF"' + O(2) + '/>' +
      '<ellipse cx="60" cy="78" rx="16" ry="4" fill="rgba(0,0,0,0.12)"/>' +
      '<path d="M22 78 q16 -8 32 0 M58 76 q14 -6 28 0" stroke="#1E88E5" stroke-width="4" fill="none" stroke-linecap="round"/>' },
    { id: 'bike', name: 'Sepeda', svg:
      groundShadow(60, 106, 46) +
      wheel(28, 74, 17) + wheel(82, 74, 17) +
      '<path d="M28 74 L48 46 L76 74 M48 46 L62 74 M60 55 L48 46 M36 70 L56 66" stroke="#E53935" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="46" y="34" width="7" height="18" rx="3.5" fill="#4A3728" transform="rotate(18 49 43)"/>' +
      '<path d="M72 40 a6 6 0 1 0 0.1 0" stroke="#4A3728" stroke-width="4" fill="none"/>' },
    { id: 'tractor', name: 'Traktor', svg:
      groundShadow(60, 110, 46) +
      '<path d="M20 62 L28 42 h34 a4 4 0 0 1 4 4 v16 h-46 Z" fill="#43A047"' + O(5) + ' stroke-linejoin="round"/>' +
      '<rect x="44" y="34" width="18" height="16" rx="4" fill="#FFE082"' + O(3) + '/>' +
      '<rect x="22" y="58" width="40" height="7" rx="3.5" fill="#8A5A33"' + O(3) + '/>' +
      wheel(28, 78, 14) + wheel(82, 84, 19) +
      '<rect x="16" y="66" width="23" height="5" rx="2.5" fill="#B39DDB"' + O(2.5) + '/>' },
    { id: 'bus', name: 'Bus', svg:
      groundShadow(60, 108, 46) +
      '<rect x="14" y="38" width="70" height="42" rx="10" fill="#FFCA28"' + O(5) + '/>' +
      '<rect x="20" y="46" width="16" height="14" rx="3" fill="#F0C9A0"' + O(2.5) + '/>' +
      '<rect x="40" y="46" width="16" height="14" rx="3" fill="#F0C9A0"' + O(2.5) + '/>' +
      '<rect x="60" y="46" width="16" height="14" rx="3" fill="#F0C9A0"' + O(2.5) + '/>' +
      '<path d="M56 70 l-3 -4 M56 70 l3 -4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>' +
      wheel(30, 84, 12) + wheel(78, 84, 12) },
    { id: 'helicopter', name: 'Helikopter', svg:
      groundShadow(60, 106, 44) +
      '<ellipse cx="60" cy="62" rx="34" ry="20" fill="#7E57C2"' + O(5) + '/>' +
      '<path d="M34 58 a16 12 0 0 1 0 -16 l-22 -16" stroke="#7E57C2" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<circle cx="12" cy="26" r="7" fill="#B39DDB"' + O(3) + '/>' +
      '<path d="M24 44 l52 -8 M88 34 l6 -10" stroke="#4A3728" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="26" y="52" width="20" height="14" rx="4" fill="#F0C9A0"' + O(3) + '/>' +
      '<rect x="50" y="58" width="10" height="8" rx="3" fill="#F0C9A0"' + O(2.5) + '/>' +
      '<path d="M30 55 l6 -4" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="90" cy="63" r="3.5" fill="#FFE082"' + O(2) + '/>' +
      '<path d="M50 80 h22 l-6 12 h-10 Z" fill="#8E24AA"' + O(3) + ' stroke-linejoin="round"/>' }
  ];
```
Pastikan `wheel` didefinisikan SEKALI di atas `var VEHICLES` dan seed `var car` DIHAPUS (digantikan entri katalog). File SETELAH Task 2 berisi TEPAT SATU deklarasi `var ANIMALS` (seed kucing — TIDAK dihapus) dan SATU deklarasi `var VEHICLES` (katalog 8), tanpa duplikasi. Task 3 mengganti deklarasi `var ANIMALS` itu dengan katalog lengkap.

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `node --test shared/tests/art.test.js`
Expected: PASS (8 kendaraan; `styleOk` null semua — periksa `#FFFFFF` vs `#FFF`: semua fill memakai 6-hex).

- [ ] **Step 5: Commit**

```bash
git add shared/art.js shared/tests/art.test.js
git commit -m "feat: vehicle catalog — 8 A-2 vehicles in shared art"
```

---

### Task 3: Katalog hewan (12) gaya A-2

**Files:**
- Modify: `shared/art.js` (isi `ANIMALS`; hapus seed `kucing`)
- Modify: `shared/tests/art.test.js` (tambah blok)

**Interfaces:**
- Consumes: helper Task 1 (`eyesE`, `brows`, `blush`, `muzzle`, `body`, `collarTag`, `pawsY`, `groundShadow`, `O`).
- Produces: `Art.ANIMALS` 12 entri `{id, name, group, svg}` — id: `kucing, singa, anjing, kelinci, gajah, bebek, burung, ikan, kura-kura, babi, sapi, katak` (6 shared + 4 khusus temukan + 2 khusus puzzle). Dipakai Task 5 & 6.

- [ ] **Step 1: Tulis test gagal (tambah blok sebelum blok VEHICLES)**

```js
test('ANIMALS: 12 hewan union, id unik cocok pola, nama non-kosong, gaya A-2', () => {
  assert.ok(Array.isArray(Art.ANIMALS) && Art.ANIMALS.length === 12);
  const ids = Art.ANIMALS.map(a => a.id);
  assert.strictEqual(new Set(ids).size, 12);
  for (const id of ids) assert.ok(/^[a-z]+(?:-[a-z]+)*$/.test(id), 'id aneh: ' + id);
  for (const a of Art.ANIMALS) {
    assert.ok(a.name && a.name.trim().length > 0, 'nama kosong');
    assert.ok(a.group && a.group.trim().length > 0, 'group kosong: ' + a.id);
    assert.strictEqual(styleOk(a.svg), null, a.id + ': ' + styleOk(a.svg));
  }
  const shared = ['kucing', 'anjing', 'kelinci', 'bebek', 'burung', 'gajah'];
  const temukanOnly = ['singa', 'babi', 'sapi', 'katak'];
  const puzzleOnly = ['ikan', 'kura-kura'];
  for (const id of shared.concat(temukanOnly, puzzleOnly)) {
    assert.ok(ids.includes(id), 'union harus memuat ' + id);
  }
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL**

Run: `node --test shared/tests/art.test.js`
Expected: FAIL (ANIMALS.length === 1).

- [ ] **Step 3: Implementasi — isi `ANIMALS` di `shared/art.js`**

Ganti deklarasi seed `var ANIMALS = [...];` (dibuat Task 1, dipertahankan Task 2) dengan katalog 12 berikut; variabel lokal `var kucing = ...` seed sudah tidak terpakai — hapus juga blok definisinya. Resep A-2: bayangan tanah → telinga/ciri subjek → kepala r≈32–36 → `eyesE`+`brows`+`blush` (mamalia) → moncong/hidung ciri → badan+`collarTag` (mamalia darat) → `pawsY`. Koordinat kanvas 120×120.

```js
  var ANIMALS = [
    { id: 'kucing', name: 'Kucing', group: 'feline', svg:
      groundShadow(60, 112, 36) +
      '<path d="M32 44 L44 12 L58 36 Z" fill="#B97A45"' + O() + ' stroke-linejoin="round"/>' +
      '<path d="M88 44 L76 12 L62 36 Z" fill="#B97A45"' + O() + ' stroke-linejoin="round"/>' +
      '<path d="M42 42 L46 22 L54 36 Z" fill="#F9C6D2"' + O(2) + ' stroke-linejoin="round"/>' +
      '<path d="M78 42 L74 22 L66 36 Z" fill="#F9C6D2"' + O(2) + ' stroke-linejoin="round"/>' +
      '<circle cx="60" cy="60" r="34" fill="#E0A86E"' + O(5) + '/>' +
      '<path d="M45 34 l4 -9 M55 32 l3 -8 M65 32 l3 -8 M75 34 l4 -9" stroke="#B97A45" stroke-width="4" stroke-linecap="round"/>' +
      eyesE(60, 54) + brows(60, 52) + blush(60, 66) + muzzle(60, 70) +
      '<path d="M26 62 L12 58 M26 68 L12 68 M26 74 L12 78 M94 62 L108 58 M94 68 L108 68 M94 74 L108 78" stroke="#5A4630" stroke-width="2" stroke-linecap="round"/>' +
      body(60, 100) + collarTag(60, 100) + pawsY(60, 113) },

    { id: 'singa', name: 'Singa', group: 'feline', svg:
      groundShadow(60, 112, 40) +
      '<circle cx="60" cy="62" r="40" fill="#E08A2E"' + O(5) + '/>' +
      '<path d="M34 30 l-8 -12 M52 24 l-3 -14 M66 24 l-3 14 M84 30 l8 -12" stroke="#E08A2E" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="60" cy="62" r="30" fill="#F0C060"' + O(5) + '/>' +
      '<ellipse cx="34" cy="34" rx="5" ry="8" fill="#E08A2E"' + O(2.5) + ' transform="rotate(-15 34 34)"/>' +
      '<ellipse cx="86" cy="34" rx="5" ry="8" fill="#E08A2E"' + O(2.5) + ' transform="rotate(15 86 34)"/>' +
      eyesE(60, 56) + brows(60, 54) + blush(60, 68) +
      '<ellipse cx="60" cy="72" rx="17" ry="12" fill="#FBE8C8"/>' +
      '<ellipse cx="60" cy="66" rx="7" ry="5" fill="#3A2A1E"/>' +
      '<ellipse cx="58" cy="64.5" rx="2.5" ry="1.8" fill="#FFFFFF"/>' +
      '<path d="M54 76 q6 4 12 0" stroke="#5A4630" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      body(60, 100, 1, '#E08A2E') + collarTag(60, 100) + pawsY(60, 113) },

    { id: 'anjing', name: 'Anjing', group: 'canine', svg:
      groundShadow(60, 112, 36) +
      '<ellipse cx="32" cy="38" rx="12" ry="22" fill="#B97A45"' + O(5) + ' transform="rotate(-18 32 38)"/>' +
      '<ellipse cx="33" cy="41" rx="5.5" ry="13" fill="#F9C6D2" transform="rotate(-18 33 41)"/>' +
      '<ellipse cx="88" cy="38" rx="12" ry="22" fill="#B97A45"' + O(5) + ' transform="rotate(18 88 38)"/>' +
      '<ellipse cx="87" cy="41" rx="5.5" ry="13" fill="#F9C6D2" transform="rotate(18 87 41)"/>' +
      '<circle cx="60" cy="58" r="34" fill="#E0A86E"' + O(5) + '/>' +
      '<circle cx="40" cy="42" r="6" fill="#C98E5A"/>' +
      '<circle cx="84" cy="66" r="5" fill="#C98E5A"/>' +
      eyesE(60, 54) + brows(60, 52) + blush(60, 66) + muzzle(60, 68) +
      body(60, 100) + collarTag(60, 100) + pawsY(60, 113) },

    { id: 'kelinci', name: 'Kelinci', group: 'lagomorph', svg:
      groundShadow(60, 112, 36) +
      '<ellipse cx="45" cy="22" rx="9" ry="27" fill="#E4E8EC"' + O(4) + '/>' +
      '<ellipse cx="75" cy="22" rx="9" ry="27" fill="#E4E8EC"' + O(4) + '/>' +
      '<ellipse cx="46" cy="24" rx="4" ry="17" fill="#F9C6D2"/>' +
      '<ellipse cx="74" cy="24" rx="4" ry="17" fill="#F9C6D2"/>' +
      '<circle cx="60" cy="60" r="34" fill="#FFFFFF"' + O(5) + '/>' +
      eyesE(60, 54) + brows(60, 54) + blush(60, 68) +
      '<ellipse cx="60" cy="70" rx="14" ry="11" fill="#F0E6D2"/>' +
      '<ellipse cx="60" cy="65" rx="5.5" ry="4" fill="#3A2A1E"/>' +
      '<rect x="56" y="73" width="3.5" height="5" rx="1" fill="#FFFFFF" stroke="#5A4630" stroke-width="1.5"/>' +
      '<rect x="60.5" y="73" width="3.5" height="5" rx="1" fill="#FFFFFF" stroke="#5A4630" stroke-width="1.5"/>' +
      '<path d="M54 79 q6 3 12 0" stroke="#5A4630" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      body(60, 100, 1, '#FFFFFF') + collarTag(60, 100) + pawsY(60, 113) },

    { id: 'gajah', name: 'Gajah', group: 'proboscidean', svg:
      groundShadow(60, 112, 40) +
      '<ellipse cx="28" cy="52" rx="14" ry="22" fill="#A3B8C4"' + O(4) + ' transform="rotate(-15 28 52)"/>' +
      '<ellipse cx="92" cy="52" rx="14" ry="22" fill="#A3B8C4"' + O(4) + ' transform="rotate(15 92 52)"/>' +
      '<circle cx="60" cy="58" r="32" fill="#9DA9B5"' + O(5) + '/>' +
      eyesE(60, 54) + brows(60, 54) + blush(60, 66) +
      '<path d="M54 68 q-6 20 4 32 q2 3 6 3 q4 0 6 -3 q10 -12 4 -32 q-5 6 -10 0 Z" fill="#9DA9B5"' + O(4) + ' stroke-linejoin="round"/>' +
      '<ellipse cx="60" cy="100" rx="5" ry="3" fill="#FFFFFF"' + O(2.5) + '/>' +
      '<path d="M50 66 a5 4 0 0 0 0 7 M70 66 a5 4 0 0 1 0 7" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      body(60, 100, 1, '#9DA9B5') + pawsY(60, 113) },

    { id: 'bebek', name: 'Bebek', group: 'bird', svg:
      '<ellipse cx="60" cy="96" rx="26" ry="10" fill="#F0E6D2"' + O(4) + '/>' +
      '<circle cx="60" cy="62" r="33" fill="#FFCA28"' + O(5) + '/>' +
      eyesE(60, 54) + blush(60, 66) +
      '<path d="M60 66 q26 -4 24 14 q-2 14 -12 10 l-10 -8 Z" fill="#FB8C00"' + O(4) + ' stroke-linejoin="round"/>' +
      '<path d="M70 70 l4 5 M74 74 l6 2" stroke="#FBE8C8" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M42 74 q-8 10 -4 18" stroke="#FB8C00" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M30 96 q14 -8 28 0 q14 8 30 0" stroke="#26C6DA" stroke-width="4" fill="none" stroke-linecap="round"/>' },

    { id: 'burung', name: 'Burung', group: 'bird', svg:
      groundShadow(60, 106, 30) +
      '<circle cx="60" cy="56" r="32" fill="#1E88E5"' + O(5) + '/>' +
      '<path d="M44 62 a26 16 0 0 0 14 2 l-2 16 a16 12 0 0 1 -16 -6 Z" fill="#7E57C2"' + O(4) + ' stroke-linejoin="round"/>' +
      '<ellipse cx="60" cy="48" rx="12" ry="9" fill="#FFFFFF"' + O(4) + '/>' +
      '<ellipse cx="60" cy="46" rx="6" ry="4.5" fill="#3A2A1E"/>' +
      '<path d="M66 52 l14 2 l-14 2 Z" fill="#FFCA28"' + O(3) + ' stroke-linejoin="round"/>' +
      '<path d="M46 44 l4 4 M44 40 l5 3" stroke="#FBE8C8" stroke-width="3" stroke-linecap="round"/>' +
      blush(60, 66) +
      '<path d="M64 78 a4 4 0 0 0 10 0 M46 76 a4 4 0 0 0 10 0" stroke="#5A4630" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M38 96 h10 M72 96 h10 M50 102 h6 M64 102 h6" stroke="#E08A2E" stroke-width="3.5" stroke-linecap="round"/>' },

    { id: 'ikan', name: 'Ikan', group: 'fish', svg:
      '<ellipse cx="60" cy="60" rx="34" ry="22" fill="#FF7043"' + O(5) + '/>' +
      '<path d="M92 60 l16 -10 v20 Z" fill="#E53935"' + O(4) + ' stroke-linejoin="round"/>' +
      '<path d="M60 38 l-4 -12 M48 42 l-8 -10 M72 42 l8 -10" stroke="#E53935" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="46" cy="54" r="8" fill="#FFFFFF" stroke="#5A4630" stroke-width="3"/>' +
      '<circle cx="44" cy="56" r="3.8" fill="#3A2A1E"/>' +
      '<circle cx="42.5" cy="54.5" r="1.5" fill="#FFFFFF"/>' +
      '<path d="M64 68 q8 6 16 0" stroke="#B39DDB" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="78" cy="38" r="2" fill="#FFFFFF" opacity="0.9"/>' +
      '<circle cx="86" cy="72" r="1.5" fill="#FFFFFF" opacity="0.9"/>' +
      '<path d="M24 78 q12 -8 24 0 M48 80 q14 -8 28 0" stroke="#26C6DA" stroke-width="3.5" fill="none" stroke-linecap="round"/>' },

    { id: 'kura-kura', name: 'Kura-kura', group: 'reptile', svg:
      groundShadow(60, 110, 42) +
      '<path d="M30 56 a30 30 0 0 1 60 0 v14 a30 30 0 0 1 -60 0 Z" fill="#43A047"' + O(5) + ' stroke-linejoin="round"/>' +
      '<path d="M41 62 a19 19 0 0 1 38 0" stroke="#7CB342" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M60 49 v26 M48 53 v22 M72 53 v22" stroke="#7CB342" stroke-width="3.5" stroke-linecap="round"/>' +
      '<ellipse cx="60" cy="40" rx="13" ry="11" fill="#7CB342"' + O(4) + '/>' +
      '<circle cx="54" cy="38" r="3.2" fill="#3A2A1E"/>' +
      '<circle cx="66" cy="38" r="3.2" fill="#3A2A1E"/>' +
      '<circle cx="53" cy="36.5" r="1.2" fill="#FFFFFF"/>' +
      '<circle cx="65" cy="36.5" r="1.2" fill="#FFFFFF"/>' +
      '<path d="M57 43 q3 2 6 0" stroke="#5A4630" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M26 58 q-8 6 0 12 M94 58 q8 6 0 12" stroke="#43A047" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path d="M46 95 h4 M60 97 h4 M74 95 h4" stroke="#7CB342" stroke-width="3.5" stroke-linecap="round"/>' },

    { id: 'babi', name: 'Babi', group: 'suid', svg:
      groundShadow(60, 112, 36) +
      '<ellipse cx="33" cy="44" rx="11" ry="19" fill="#F9C6D2"' + O(4) + ' transform="rotate(-20 33 44)"/>' +
      '<ellipse cx="87" cy="44" rx="11" ry="19" fill="#F9C6D2"' + O(4) + ' transform="rotate(20 87 44)"/>' +
      '<circle cx="60" cy="62" r="34" fill="#FFB3B3"' + O(5) + '/>' +
      eyesE(60, 54) + brows(60, 54) + blush(60, 66) +
      '<ellipse cx="60" cy="72" rx="17" ry="12" fill="#F6D9B8"' + O(4) + '/>' +
      '<ellipse cx="55" cy="71" rx="2.8" ry="3.6" fill="#3A2A1E"/>' +
      '<ellipse cx="65" cy="71" rx="2.8" ry="3.6" fill="#3A2A1E"/>' +
      '<path d="M56 80 q4 3 8 0" stroke="#5A4630" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      body(60, 100, 1, '#FFB3B3') + collarTag(60, 100) + pawsY(60, 113) +
      '<path d="M78 56 q14 8 8 22" stroke="#FFB3B3" stroke-width="6" fill="none" stroke-linecap="round"/>' },

    { id: 'sapi', name: 'Sapi', group: 'bovine', svg:
      groundShadow(60, 112, 38) +
      '<path d="M44 26 L38 8 L56 22 Z" fill="#F0E6D2"' + O(4) + ' stroke-linejoin="round"/>' +
      '<path d="M76 26 L82 8 L64 22 Z" fill="#F0E6D2"' + O(4) + ' stroke-linejoin="round"/>' +
      '<ellipse cx="34" cy="42" rx="9" ry="16" fill="#E4E8EC"' + O(4) + ' transform="rotate(-15 34 42)"/>' +
      '<ellipse cx="86" cy="42" rx="9" ry="16" fill="#E4E8EC"' + O(4) + ' transform="rotate(15 86 42)"/>' +
      '<circle cx="60" cy="60" r="34" fill="#FFFFFF"' + O(5) + '/>' +
      '<path d="M40 40 a12 10 0 0 1 8 -8 l2 16 a11 9 0 0 1 -14 -2 Z" fill="#4A3728"/>' +
      '<path d="M76 66 a10 8 0 0 1 -6 -9 l14 -2 a10 8 0 0 1 -4 11 Z" fill="#4A3728"/>' +
      eyesE(60, 54) + brows(60, 54) + blush(60, 66) +
      '<ellipse cx="60" cy="70" rx="18" ry="12" fill="#F0E6D2" stroke="#5A4630" stroke-width="3"/>' +
      '<ellipse cx="60" cy="66" rx="7" ry="5" fill="#3A2A1E"/>' +
      '<ellipse cx="58" cy="64.5" rx="2.5" ry="1.8" fill="#FFFFFF"/>' +
      '<path d="M54 76 q6 4 12 0" stroke="#5A4630" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      body(60, 100, 1, '#FFFFFF') + collarTag(60, 100) + pawsY(60, 113) },

    { id: 'katak', name: 'Katak', group: 'anuran', svg:
      groundShadow(60, 110, 40) +
      '<circle cx="44" cy="36" r="15" fill="#43A047"' + O(4) + '/>' +
      '<circle cx="76" cy="36" r="15" fill="#43A047"' + O(4) + '/>' +
      '<circle cx="42" cy="34" r="6" fill="#FFFFFF" stroke="#3A2A1E" stroke-width="2.5"/>' +
      '<circle cx="74" cy="34" r="6" fill="#FFFFFF" stroke="#3A2A1E" stroke-width="2.5"/>' +
      '<circle cx="41" cy="35" r="3" fill="#3A2A1E"/>' +
      '<circle cx="73" cy="35" r="3" fill="#3A2A1E"/>' +
      '<circle cx="40" cy="33.5" r="1.2" fill="#FFFFFF"/>' +
      '<circle cx="72" cy="33.5" r="1.2" fill="#FFFFFF"/>' +
      '<ellipse cx="60" cy="66" rx="38" ry="30" fill="#7CB342"' + O(5) + '/>' +
      '<ellipse cx="60" cy="74" rx="14" ry="10" fill="#FBE8C8"/>' +
      '<path d="M52 78 q8 8 16 0" stroke="#5A4630" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="44" cy="80" r="4.5" fill="#FFB3B3"/>' +
      '<circle cx="76" cy="80" r="4.5" fill="#FFB3B3"/>' +
      '<path d="M24 82 q-8 10 -2 16 M96 82 q8 10 2 16" stroke="#7CB342" stroke-width="6" fill="none" stroke-linecap="round"/>' }
  ];
```

Catatan palet: semua hex di atas sudah ∈ PALETTE Task 1 (`#E4E8EC`, `#F0E6D2`, `#9DA9B5`, `#A3B8C4`, `#7CB342`, `#43A047`, `#1E88E5`, `#7E57C2`, `#FF7043`, `#E53935`, `#FFCA28`, `#FB8C00`, `#FBE8C8`, `#B39DDB`, `#FF8A80` (lidah helper), `#4A3728`, `#3A2A1E`, `#FFB3B3`, `#F9C6D2`, `#F6D9B8`, `#F0C060`, `#E08A2E`, `#C98E5A`, `#E0A86E`, `#B97A45`, `#5A4630`, `#FFFFFF`). Pupil mata memakai `#3A2A1E` untuk SEMUA hewan — jangan gunakan `#2E1F16` (TIDAK ada di PALETTE). Jika ada hex luar palet saat test → tambahkan ke PALETTE (jangan ubah warna aset).

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `node --test shared/tests/art.test.js`
Expected: PASS (12 hewan; semua `styleOk` null; union lengkap).

- [ ] **Step 5: Commit**

```bash
git add shared/art.js shared/tests/art.test.js
git commit -m "feat: animal catalog — 12 A-2 animals in shared art"
```

---

### Task 4: Upgrade `shared/audio.js` — scoring voice, rate/pitch, fx `party`

**Files:**
- Modify: `shared/audio.js` (`pickIdVoice`, utterance di `speak`, switch `fx`)
- Modify: `games/temukan-hewan/tests/audio.test.js` (+2 blok)

**Interfaces:**
- Consumes: API lama `GameAudio.pickIdVoice`, `speak`, `fx` (kontrak test lama).
- Produces: `pickIdVoice` — Google > Microsoft > generic (fallback bahasa lama tetap); utterance `rate 0.85`/`pitch 1.1`; `fx('party')` — dipakai Task 5.

- [ ] **Step 1: Tulis test gagal (tambah 2 blok di `games/temukan-hewan/tests/audio.test.js`)**

```js
test('pickIdVoice prefers named Google id-ID over unnamed id-ID', () => {
  const voices = [{ lang: 'id-ID' }, { lang: 'id-ID', name: 'Google Bahasa Indonesia' }];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[1]);
});

test('pickIdVoice prefers Google over Microsoft over generic, all id-ID', () => {
  const voices = [
    { lang: 'id-ID' },
    { lang: 'id-ID', name: 'Microsoft Ardi' },
    { lang: 'id-ID', name: 'Google Bahasa Indonesia' }
  ];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[2]);
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL**

Run: `cd /home/swanster/projects/games/games-kay && node --test games/temukan-hewan/tests/audio.test.js`
Expected: 3 blok lama PASS; 2 blok baru FAIL (voice pertama terpilih).

- [ ] **Step 3: Implementasi — `shared/audio.js`**

Ganti `pickIdVoice`:

```js
  function pickIdVoice(voices) {
    if (!voices || !voices.length) return null;
    var full = voices.filter(function (v) { return /^id-/.test(v.lang || ''); });
    var bare = voices.filter(function (v) { return (v.lang || '') === 'id'; });
    var pool = full.length ? full : bare;
    if (!pool.length) return null;
    var google = pool.filter(function (v) { return /Google/i.test(v.name || ''); });
    if (google.length) return google[0];
    var ms = pool.filter(function (v) { return /Microsoft/i.test(v.name || ''); });
    if (ms.length) return ms[0];
    return pool[0];
  }
```

Di `speak`, ganti baris utterance menjadi:

```js
      u.rate = 0.85;
      u.pitch = 1.1;
```

Di switch `fx`, tambah case sebelum tutup switch:

```js
        case 'party':
          tone(523, 0.18, 'sine', 0.2, 0);
          tone(659, 0.18, 'sine', 0.2, 0.14);
          tone(784, 0.18, 'sine', 0.2, 0.28);
          tone(1047, 0.35, 'sine', 0.22, 0.42);
          break;
```

- [ ] **Step 4: Jalankan test, pastikan PASS**

Run: `node --test games/temukan-hewan/tests/audio.test.js`
Expected: PASS 5 blok.

- [ ] **Step 5: Commit**

```bash
git add shared/audio.js games/temukan-hewan/tests/audio.test.js
git commit -m "feat: audio — voice scoring, warmer rate/pitch, party fx"
```

---

### Task 5: Wiring — adaptor (animals, puzzle, vehicles), script tag, party switch

**Files:**
- Rewrite: `games/temukan-hewan/animals.js` (adaptor; id/group/API lama; svg `<g>`-wrapped dari `Art`)
- Modify: `games/temukan-hewan/index.html` (+`art.js` sebelum `animals.js`)
- Modify: `games/temukan-hewan/game.js` (`fx('cheer')` → `fx('party')`)
- Rewrite: `games/puzzle-hewan/puzzle.js` (adaptor + `SUBJECT_MAP`; `PIECES_PER_ROUND`/`layout`/`pieceSVG` TIDAK berubah)
- Modify: `games/puzzle-hewan/index.html` (+`art.js` sebelum `puzzle.js`)
- Modify: `games/puzzle-hewan/game.js` (`fx('cheer')` → `fx('party')`)
- Rewrite: `games/memory-match/vehicles.js` (adaptor; id/nama/API lama)
- Modify: `games/memory-match/index.html` (+`art.js` sebelum `vehicles.js`)
- Modify: `games/memory-match/game.js` (`fx('cheer')` → `fx('party')`)
- Modify: `games/puzzle-hewan/tests/puzzle.test.js` (+1 blok `SUBJECT_MAP`)

**Interfaces:**
- Consumes: `Art.animalSvg`/`Art.vehicleSvg`/`Art.ANIMALS`/`Art.VEHICLES` (Task 1–3).
- Produces: `Animals.ANIMALS` (10, `<g>`-wrap) + `ANIMAL_BY_ID`; `Puzzle.IMAGES` (8) + `Puzzle.SUBJECT_MAP`; `VEHICLES` (8); tiga situs kemenangan memakai `fx('party')`.

- [ ] **Step 1: Tulis test gagal (tambah blok di `games/puzzle-hewan/tests/puzzle.test.js`)**

```js
test('SUBJECT_MAP: 8 id puzzle terpetakan ke subjek yang ada di shared art', () => {
  const Art = require('../../../shared/art.js');
  const ids = new Set(Art.ANIMALS.map(a => a.id));
  for (const [p, s] of Object.entries(Puzzle.SUBJECT_MAP)) {
    assert.ok(ids.has(s), 'subjek tak dikenal: ' + s);
    assert.strictEqual(Art.animalSvg(s), Art.ANIMALS.find(a => a.id === s).svg, 'svg ter-resolve: ' + s);
  }
  assert.deepStrictEqual(Puzzle.SUBJECT_MAP, {
    cat: 'kucing', dog: 'anjing', elephant: 'gajah', rabbit: 'kelinci',
    duck: 'bebek', fish: 'ikan', bird: 'burung', turtle: 'kura-kura'
  });
});
```

- [ ] **Step 2: Jalankan, pastikan GAGAL**

Run: `node --test games/puzzle-hewan/tests/puzzle.test.js`
Expected: FAIL (`Puzzle.SUBJECT_MAP` undefined).

- [ ] **Step 3: Rewrite adaptor `games/temukan-hewan/animals.js`**

Pertahankan header UMD & ekspor `Animals.ANIMALS`/`ANIMAL_BY_ID`. Di dalam factory, ganti isi dengan:

```js
  var Art = (typeof module === 'object' && module.exports)
    ? require('../../shared/art.js')
    : (typeof self !== 'undefined' ? self : globalThis).Art;
  if (!Art) throw new Error('shared/art.js harus dimuat sebelum file ini');

  // ORDER & GROUP: SALIN PERSIS dari animals.js lama (diverifikasi saat penulisan plan):
  var ORDER = ['kucing', 'singa', 'anjing', 'kelinci', 'bebek', 'burung',
               'babi', 'sapi', 'gajah', 'katak'];
  var GROUP = {
    kucing: 'feline', singa: 'feline', anjing: 'canine', kelinci: 'lagomorph',
    bebek: 'bird', burung: 'bird', babi: 'suid', sapi: 'bovine',
    gajah: 'proboscidean', katak: 'anuran'
  };

  var ANIMALS = ORDER.map(function (id) {
    var meta = Art.ANIMALS.find(function (a) { return a.id === id; });
    return { id: id, name: meta.name, group: GROUP[id], svg: '<g>' + meta.svg + '</g>' };
  });

  var ANIMAL_BY_ID = {};
  ANIMALS.forEach(function (a) { ANIMAL_BY_ID[a.id] = a; });

  return { ANIMALS: ANIMALS, ANIMAL_BY_ID: ANIMAL_BY_ID };
```

`index.html`: sisipkan `<script src="../../shared/art.js"></script>` TEPAT di atas `<script src="animals.js"></script>` — blok script saat ini `animals → rounds → audio → profile → game` menjadi `art → animals → rounds → audio → profile → game` (art.js HARUS sebelum animals.js; saat ini animals.js adalah script pertama).
`game.js`: `GameAudio.fx('cheer');` → `GameAudio.fx('party');` (baris 127 — TANPA guard: temukan-hewan merayakan setiap ronde termasuk final, sesuai spec).

- [ ] **Step 4: Rewrite adaptor `games/puzzle-hewan/puzzle.js`**

Pertahankan `PIECES_PER_ROUND`, `layout`, `pieceSVG`, objek `Puzzle` yang diekspor. Tambah/ubah:

```js
  var Art = (typeof module === 'object' && module.exports)
    ? require('../../shared/art.js')
    : (typeof self !== 'undefined' ? self : globalThis).Art;
  if (!Art) throw new Error('shared/art.js harus dimuat sebelum file ini');

  var SUBJECT_MAP = {
    cat: 'kucing', dog: 'anjing', elephant: 'gajah', rabbit: 'kelinci',
    duck: 'bebek', fish: 'ikan', bird: 'burung', turtle: 'kura-kura'
  };

  var IMAGES = [
    { id: 'cat', name: 'Kucing', svg: Art.animalSvg(SUBJECT_MAP.cat) },
    { id: 'dog', name: 'Anjing', svg: Art.animalSvg(SUBJECT_MAP.dog) },
    { id: 'elephant', name: 'Gajah', svg: Art.animalSvg(SUBJECT_MAP.elephant) },
    { id: 'rabbit', name: 'Kelinci', svg: Art.animalSvg(SUBJECT_MAP.rabbit) },
    { id: 'duck', name: 'Bebek', svg: Art.animalSvg(SUBJECT_MAP.duck) },
    { id: 'fish', name: 'Ikan', svg: Art.animalSvg(SUBJECT_MAP.fish) },
    { id: 'bird', name: 'Burung', svg: Art.animalSvg(SUBJECT_MAP.bird) },
    { id: 'turtle', name: 'Kura-kura', svg: Art.animalSvg(SUBJECT_MAP.turtle) }
  ];
  // NAMA: SALIN persis dari puzzle.js lama (id & nama tidak berubah).

  // Tambahkan `SUBJECT_MAP` ke objek yang di-return — pertahankan SEMUA kunci
  // yang sudah ada (IMAGES, PIECES_PER_ROUND, layout, makeBoard, pieceSVG, shuffle, isRoundDone):
  return {
    IMAGES: IMAGES,
    PIECES_PER_ROUND: PIECES_PER_ROUND,
    layout: layout,
    makeBoard: makeBoard,
    pieceSVG: pieceSVG,
    shuffle: shuffle,
    isRoundDone: isRoundDone,
    SUBJECT_MAP: SUBJECT_MAP
  };
```

`index.html`: sisipkan `<script src="../../shared/art.js"></script>` tepat di atas `<script src="puzzle.js"></script>` — blok script saat ini `audio → profile → puzzle → game` menjadi `audio → profile → art → puzzle → game` (art.js HARUS sebelum puzzle.js). `game.js`: `GameAudio.fx('cheer');` → `GameAudio.fx('party');` (baris 152, di dalam guard `roundIndex + 1 < TOTAL_ROUNDS` → non-final saja).

- [ ] **Step 5: Rewrite adaptor `games/memory-match/vehicles.js`**

```js
  var Art = (typeof module === 'object' && module.exports)
    ? require('../../shared/art.js')
    : (typeof self !== 'undefined' ? self : globalThis).Art;
  if (!Art) throw new Error('shared/art.js harus dimuat sebelum file ini');

  var VEHICLES = Art.VEHICLES.map(function (v) { return { id: v.id, name: v.name, svg: v.svg }; });
  return VEHICLES;
```
(Pertahankan pembungkus UMD & return array polos seperti lama — `vehicles.test.js` menuntut id standar & svg tanpa `<svg`.)
`index.html`: sisipkan `<script src="../../shared/art.js"></script>` tepat di atas `<script src="vehicles.js"></script>` — blok script saat ini `vehicles → memory → audio → profile → game` menjadi `art → vehicles → memory → audio → profile → game`. `game.js`: `GameAudio.fx('cheer');` → `GameAudio.fx('party');` (baris 168, non-final saja).

- [ ] **Step 6: Jalankan seluruh suite, pastikan PASS**

Run: `cd /home/swanster/projects/games/games-kay && node --test`
Expected: PASS — baseline 68 + test baru (art.test, audio +2, puzzle SUBJECT_MAP). Pastikan `animals.test.js` (10 hewan, `<g>` wrap) & `vehicles.test.js` (8, tanpa `<svg`) tetap hijau — verifikasi adaptor dual-mode (`require('../animals.js')` memuat art.js sendiri).

- [ ] **Step 7: Commit**

```bash
git add games/temukan-hewan games/puzzle-hewan games/memory-match
git commit -m "refactor: wire shared art into temukan-hewan, puzzle-hewan, memory-match"
```

---

### Task 6: Verifikasi penuh — suite + smoke CDP 3 game

**Files:**
- Create: `/tmp/smoke-seni-suara.mjs` (skrip CDP MANDIRI — lihat kode lengkap di Step 1; tidak bergantung pada file smoke lama)

**Interfaces:**
- Consumes: build Task 1–5; baseline 68 tes.

- [ ] **Step 1: Tulis skrip smoke CDP** — `/tmp/smoke-seni-suara.mjs`

Tulis file `/tmp/smoke-seni-suara.mjs` MANDIRI (tidak bergantung pada file smoke lama) — kode lengkap ada di bawah bagian "Kode skrip" (CDP Node ≥22 + google-chrome headless; fase A file:// + B http 768 + C http 360). Selektor per game:
- `temukan-hewan`: klik `#btn-start` → `#grid` berisi ≥1 `svg` yang memuat `#5A4630`; kartu target `#target-svg` ada.
- `puzzle-hewan`: klik `#btn-start` → `#grid` punya slot (anak grid), `#piece-big` berisi svg dengan `#5A4630`.
- `memory-match`: klik `#btn-start` → papan kartu ada; buka satu kartu → svg kendaraan tampil.
Asersi tiap fase per game: load OK, tidak ada error konsol, tidak ada request gagal, render A-2 (`#5A4630`). Total asersi ≥ 40; `process.exit(0)` hanya bila semua PASS.

### Kode skrip `/tmp/smoke-seni-suara.mjs`

```js
// Smoke CDP mandiri: 3 game x 3 fase.
// Fase A: file:// viewport 1280x800 | B: http://127.0.0.1:8087 viewport 768x800 | C: http viewport 360x640.
// Asersi per fase: area permainan ter-render, seni A-2 (#5A4630), 0 exception/console.error, 0 request gagal.
// Jalankan: node /tmp/smoke-seni-suara.mjs  (Node >= 22, google-chrome terpasang). Exit 0 hanya bila semua PASS.
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CHROME = 'google-chrome';
const CDP_PORT = 9223;
const HTTP_PORT = 8087;
const ROOT = '/home/swanster/projects/games/games-kay/';
const HTTP = `http://127.0.0.1:${HTTP_PORT}/`;

let asserts = 0;
function assert(cond, msg) {
  asserts++;
  if (!cond) { console.error('ASSERT FAIL:', msg); process.exitCode = 1; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Tab {
  constructor(ws, id) {
    this.ws = ws; this.id = id; this.n = 1;
    this.errors = []; this.failed = []; this.listeners = {};
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id) return; // respons command
      if (m.method === 'Runtime.exceptionThrown') this.errors.push('exception');
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') this.errors.push('console.error');
      if (m.method === 'Network.loadingFailed') this.failed.push(m.params.errorText || 'netfail');
      (this.listeners[m.method] || []).forEach((fn) => fn());
    });
  }
  send(method, params) {
    const id = this.n++;
    return new Promise((resolve, reject) => {
      const onMsg = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id !== id) return;
        this.ws.removeEventListener('message', onMsg);
        m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result);
      };
      this.ws.addEventListener('message', onMsg);
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  once(method) {
    return new Promise((resolve) => {
      this.listeners[method] = this.listeners[method] || [];
      this.listeners[method].push(resolve);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.text || 'exception'));
    return r.result.value;
  }
  async navigate(url, w, h) {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
    await this.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    const loaded = this.once('Page.loadEventFired');
    await this.send('Page.navigate', { url });
    await loaded;
    await sleep(250);
  }
  async close() { await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${this.id}`); }
}

async function newTab() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
  const info = await res.json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  return new Tab(ws, info.id);
}

const GAMES = [
  {
    name: 'temukan-hewan', url: 'games/temukan-hewan/index.html',
    run: async (tab) => {
      await tab.eval(`document.getElementById('btn-start').click()`);
      const r = await tab.eval(`(() => {
        const svgs = document.querySelectorAll('#grid svg');
        return { n: svgs.length, a2: svgs[0] ? svgs[0].outerHTML.includes('#5A4630') : false,
                 target: !!document.getElementById('target-svg') };
      })()`);
      assert(r.n >= 1, 'temukan-hewan: grid tanpa svg');
      assert(r.a2, 'temukan-hewan: svg tanpa seni A-2');
      assert(r.target, 'temukan-hewan: target-svg hilang');
    }
  },
  {
    name: 'puzzle-hewan', url: 'games/puzzle-hewan/index.html',
    run: async (tab) => {
      await tab.eval(`document.getElementById('btn-start').click()`);
      const r = await tab.eval(`(() => {
        const piece = document.querySelector('#piece-big svg');
        return { slots: document.querySelectorAll('#grid > *').length,
                 a2: piece ? piece.outerHTML.includes('#5A4630') : false,
                 ref: !!document.getElementById('reference') };
      })()`);
      assert(r.slots >= 1, 'puzzle-hewan: grid kosong');
      assert(r.a2, 'puzzle-hewan: potongan tanpa seni A-2');
      assert(r.ref, 'puzzle-hewan: reference hilang');
    }
  },
  {
    name: 'memory-match', url: 'games/memory-match/index.html',
    run: async (tab) => {
      await tab.eval(`document.getElementById('btn-start').click()`);
      const n = await tab.eval(`document.querySelectorAll('#board > *').length`);
      assert(n >= 4, 'memory-match: papan kartu kosong (' + n + ')');
      await tab.eval(`document.querySelector('#board > *').click()`);
      await sleep(300);
      const svgs = await tab.eval(`document.querySelectorAll('#board svg').length`);
      assert(svgs >= 1, 'memory-match: kartu terbuka tanpa svg');
    }
  }
];

const PHASES = [
  { kind: 'file', w: 1280, h: 800, url: (g) => pathToFileURL(ROOT + g.url).href },
  { kind: 'http768', w: 768, h: 800, url: (g) => HTTP + g.url },
  { kind: 'http360', w: 360, h: 640, url: (g) => HTTP + g.url }
];

let chrome;
let httpServer;
async function main() {
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`,
    '--no-sandbox', '--disable-gpu', '--user-data-dir=/tmp/smoke-seni-' + Date.now(), 'about:blank'],
    { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); break; } catch { await sleep(100); }
  }
  httpServer = spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--directory', ROOT], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(HTTP); break; } catch { await sleep(100); }
  }
  for (const game of GAMES) {
    for (const phase of PHASES) {
      const tab = await newTab();
      await tab.navigate(phase.url(game), phase.w, phase.h);
      await game.run(tab);
      assert(tab.errors.length === 0, `${game.name}/${phase.kind}: ${tab.errors.length} error konsol`);
      assert(tab.failed.length === 0, `${game.name}/${phase.kind}: ${tab.failed.length} request gagal`);
      console.log(`PASS ${game.name} fase ${phase.kind} (${phase.w})`);
      await tab.close();
    }
  }
}

main()
  .catch((e) => { console.error('SMOKE ERROR:', e.message); process.exitCode = 1; })
  .finally(() => {
    if (httpServer) httpServer.kill('SIGKILL');
    if (chrome) chrome.kill('SIGKILL');
    console.log('TOTAL ASERSI:', asserts);
    process.exit(process.exitCode || 0);
  });
```

- [ ] **Step 2: Jalankan smoke**

Run: `node /tmp/smoke-seni-suara.mjs`
Expected: PASS semua fase. Jika ada aset yang tampak aneh/terpotong di screenshot → perbaiki aset di `shared/art.js` lalu ulangi (Step 3→4).

- [ ] **Step 3: Verifikasi suite penuh + status git**

Run: `cd /home/swanster/projects/games/games-kay && node --test && git status --short`
Expected: semua PASS; `git status` hanya berisi perubahan yang sudah di-commit atau tidak ada.

- [ ] **Step 4: Cek visual ringan manual (opsional)**

Buka dashboard `index.html`, mainkan 3 game 1 ronde di viewport 360×640: tidak ada overflow horizontal; hewan/kendaraan tampil A-2 konsisten.

- [ ] **Step 5: Commit bila ada perbaikan dari Step 2–4**

```bash
git add -A
git commit -m "fix: art adjustments from smoke verification"
```

---

## Self-Review

**Spec coverage:**
- §3 Kontrak Persisten (id publik, kemasan `<g>`, `shared/` hanya art+audio) → Task 5 + Task 4 ✓
- §5 Katalog union 12+8, gaya A-2, helper → Task 1–3 ✓
- §6 Loader dual-mode `../../shared/art.js`, script order → Task 1 (UMD) + Task 5 (adaptor & index.html) ✓
- §7 Fallback `Art.FALLBACK` + console.error, test kontrak mapping → Task 1 (lookup test) + Task 5 (SUBJECT_MAP test) ✓
- §8 Suara: scoring Google/Microsoft, rate/pitch, fx party + semantik per game (temukan termasuk final; puzzle/memory non-final) → Task 4 + Task 5 ✓
- §9 Kontrak API → Task 1–3 (Art), Task 5 (adaptor) ✓
- §10 Testing: baseline 68, art.test, audio +2, smoke → Task 1–6 ✓
- §11 Acceptance → Task 6 (suite + smoke + visual) ✓
- §12 Non-goals → seluruh task mematuhi (4 game lain & file shared lain tidak disentuh) ✓

**Placeholder scan:** Semua step punya kode konkret (test + implementasi). Satu pengecualian: Task 6 Step 1 menyalin kerangka smoke G7 yang sudah terbukti (pola repo, bukan spesifikasi kabur). Komentar "[SALIN] nama/order dari file lama" adalah instruksi verifikasi eksplisit, bukan placeholder — nilai sebenarnya diambil dari file sumber saat eksekusi.

**Type consistency:** `Art.animalSvg`/`vehicleSvg` (Task 1) dipakai Task 3/5/6; `Art.ANIMALS`/`VEHICLES` shape `{id,name,group}/{id,name}` konsisten; `Puzzle.SUBJECT_MAP` (Task 5) ditest di task yang sama; `GameAudio.pickIdVoice` signature tetap (3 test lama aman).

**Risiko tunggal (sudah ditutup):** `animals.test.js` menuntut 10 hewan `<g>`-wrapped, id `/^[a-z]+$/`, nama unik, dan `rounds.js` memakai `ANIMAL_BY_ID` — ORDER/GROUP sudah disalin VERBATIM dari file lama di Task 5 Step 3 (bebek:bird, katak:anuran, urutan babi→sapi→gajah); loader UMD browser sudah diverifikasi (self/globalThis, bukan root). Dicek ulang di Task 5 Step 6 + Task 6 smoke (0 error konsol termasuk ReferenceError).