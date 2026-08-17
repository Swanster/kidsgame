# Seni & Suara Ramah Anak — Design Spec (Refactor Lintas Game)

> Tujuan: gambar hewan & kendaraan yang sekarang **terlalu abstrak** dijadikan bergaya **Kartun Imut (A-2)** yang lebih detail & menarik, dan suara TTS yang **robotik** dibuat lebih hangat — supaya anak 3–5 tahun lebih nyaman. Hasil brainstorming: gaya **A-2 Detail Pas** terpilih (acuan visual: contoh anjing A-2 di sesi desain), pendekatan **modul seni bersama**, suara via **TTS dioptimalkan**, cakupan **bertahap: hewan & kendaraan dulu** (3 game), suara otomatis kena semua game (via `shared/audio.js`).

## 1. Tujuan & Sasaran
- Hewan (12 subjek) & kendaraan (8) dirender ulang dalam satu gaya A-2 yang konsisten: garis tebal membulat (`#5A4630`, 4–5px), mata besar berkilau, pipi merona, moncong/senyum, badan + cakar + kalung/medali, bintik detail, bayangan tanah — tetap **SVG inline, offline, bebas lisensi**.
- Suara: voice id-ID terbaik di perangkat (Google/Microsoft), `rate 0.85`, `pitch 1.1`, frase tetap pendek & ramah; efek `party` untuk kemenangan.
- Tidak ada perubahan mekanik game, id publik, skor, atau perilaku.

## 2. Keputusan yang Sudah Disepakati
| Topik | Putusan |
|---|---|
| Gaya gambar | **A-2 Kartun Imut + Detail Pas** (bukan A-1 ringan, bukan A-3 kaya; buka lagi hanya bila implementasi menemukan masalah ukuran/keterbacaan) |
| Pendekatan | **① Modul seni bersama `shared/art.js` + adaptor tipis** |
| Suara | **TTS dioptimalkan** (tanpa rekaman) |
| Cakupan | **Bertahap**: gambar hewan & kendaraan dulu (temukan-hewan, puzzle-hewan, memory-match); 4 game lain menyusul di iterasi berikut |
| Konstrain | Offline (`file://` + `http://`), tanpa aset eksternal, tanpa lisensi baru, UMD-lite, `node --test` dari root |

## 3. Kontrak Persisten
- **Id & API publik game TIDAK berubah**: `temukan-hewan` 10 id (kucing, singa, anjing, …), `puzzle-hewan` 8 id (cat, dog, elephant, …), `memory-match` 8 id (car, train, …) — nama, jumlah, urutan, `group` (temukan-hewan), `PIECES_PER_ROUND`, `layout` tetap.
- **Kemasan SVG per game dipertahankan**: `Animals.ANIMALS[].svg` diawali `<g>` dan diakhiri `</g>` (test lama menuntut); `Puzzle.IMAGES[].svg` & `VEHICLES[].svg` TANPA bungkus `<svg>`/`<g>` (test lama menuntut).
- **`shared/art.js` = modul baru**; `shared/audio.js` = satu-satunya file `shared/` lain yang berubah. `profile.js`, `games-registry.js`, `avatars.js` TIDAK disentuh.
- Halaman 3 game: tambah satu `<script src="../../shared/art.js">` **sebelum** file data; urutan script lain tidak berubah.
- Rendering tetap: game.js memasukkan `svg` ke wrapper `<svg viewBox="0 0 120 120">` yang ada. Khusus puzzle: `buildGrid()` meletakkan **SVG utuh** di tiap slot kosong; potongan (tray & slot terisi) memakai `Puzzle.pieceSVG()` yang menggeser area aset sesuai potongan — konten baru mengalir lewat string `svg` yang sama; mekanik & `pieceSVG` TIDAK berubah.

## 4. Arsitektur & Komponen
```
shared/
  art.js            ← BARU: sumber tunggal seni A-2 (gaya + 12 hewan + 8 kendaraan)
  audio.js          ← DIUBAH: skor voice id-ID, rate/pitch, fx 'party'
games/
  temukan-hewan/  animals.js   → adaptor tipis ke Art (id == subject; bungkus <g>)
  puzzle-hewan/   puzzle.js    → adaptor tipis ke Art (map id EN → subject ID)
  memory-match/   vehicles.js  → adaptor tipis ke Art.VEHICLES
  4 game lain                 → gambar TIDAK disentuh (suara tetap kena via audio.js)
```
- `shared/art.js`: **zero DOM**, murni data/string → bisa dites di Node tanpa browser.
- Adaptor: tahu metadata game (id, name, group), **tidak tahu cara menggambar**.
- `shared/audio.js`: satu-satunya pemilik logic suara; game hanya memanggil `GameAudio.speak(...)` / `fx(...)`.

## 5. Katalog & Gaya A-2
### Katalog (union 12 hewan + 8 kendaraan)
- **6 subjek dibagi dua game** (digambar SEKALI): kucing(cat), anjing(dog), kelinci(rabbit), bebek(duck), burung(bird), gajah(elephant).
- **4 khusus Temukan-Hewan**: singa, babi, sapi, katak.
- **2 khusus Puzzle-Hewan**: ikan(fish), kura-kura(turtle).
- **8 kendaraan** (memory-match): car, train, plane, ship, bike, tractor, bus, helicopter.
- `Art.ANIMALS` = 12 entri `{id: <subject>, name, group}` (id memakai skema temukan-hewan); `Art.VEHICLES` = 8 entri `{id, name}`.

### Sistem gaya (helper dipakai setiap aset)
- Token: `OUTLINE = '#5A4630'`, stroke 4–5px, `stroke-linecap/join round`; palet hangat per subjek (kulit cokelat-emas, aksen merah muda, dll.) — semua warna aset ∈ **palet whitelist** yang diekspor `Art.PALETTE` (dijaga test).
- Helper A-2 (fungsi internal, output string SVG): `eyes(cx,cy,s)` (bola putih + pupil + 1–2 kilau), `blush(cx,cy)`, `muzzle(cx,cy)`, `paws(...)`, `groundShadow(...)`, `collarWithTag(...)`.
- **Hewan** minimal berisi: kepala + telinga (+jambul untuk yang cocok), mata besar + kilau, alis, pipi merona, moncong + hidung + kilau hidung, senyum, lidah (mamalia), badan + perut, cakar (2), kalung + medali, bintik/aksen subjek, bayangan tanah.
- **Kendaraan** minimal berisi: badan membulat penuh, roda ≥2 + velg (puteran) + titik kilau, kaca/jendela dengan kilau, bayangan tanah, aksen subjek (lampu, knalpot, baling-baling, dll.).
- Gaya A-2 TIDAK boleh: warna keluar palet, stroke <3, mata tanpa kilau, badan tanpa cakar/roda.

## 6. Loader & Alur Data
- `shared/art.js` UMD: `module.exports = Art` (Node) / `root.Art` (browser).
- Adaptor wajib memuat `Art` di dua jalur:
```js
var Art = (typeof module === 'object' && module.exports)
  ? require('../../shared/art.js')      // Node: dari games/<game>/ ke shared/ (BUKAN ../../../)
  : root.Art;                            // browser: script tag '../../shared/art.js' lebih dulu
if (!Art) throw new Error('shared/art.js harus dimuat sebelum file ini');
```
- Script order di `index.html` (3 game): audio → profile → **art** → data (animals/puzzle/vehicles) → game.
- Alur: `art.js → adaptor (map id/subject) → game.js` render ke wrapper yang ada. Node: `require(adaptor) → require('../../shared/art.js')` — satu sumber data untuk test & browser.
- `puzzle-hewan` map konstan (export dari puzzle.js agar bisa dites): `{cat:'kucing', dog:'anjing', elephant:'gajah', rabbit:'kelinci', duck:'bebek', fish:'ikan', bird:'burung', turtle:'kura-kura'}`.

## 7. Penanganan Error & Fallback
- **Art hilang di browser** (urutan script salah): adaptor `throw` dengan pesan eksplisit — gagal cepat, bukan blank senyap.
- **Subject tak dikenal** (`Art.animalSvg('x')`): `console.error('[art] subject tak dikenal: x')` + kembalikan **`Art.FALLBACK`** (bintang A-2: bentuk bintang 5 sudut membulat, outline tebal, kilau, dalam palet) — game tidak pernah blank.
- **`Art.FALLBACK` diekspor & dites** (ada, valid A-2, dalam palet) → fallback bukan jalan diam: mapping yang hilang selalu kelihatan di konsol.
- **Jaminan utama = test kontrak mapping** (semua id kedua game & 8 kendaraan resolve; map puzzle lengkap) — fallback runtime hanya jaring pengaman, bukan pengganti.
- **Suara**: tanpa voice id → fallback berantai lama (id-ID → id → null/default), silent; mute & `AudioContext` gagal → silent; `cancel()` sebelum `speak` (anti-queue Chrome) dipertahankan.

## 8. Suara (`shared/audio.js`)
- `pickIdVoice(voices)` → skor bertingkat: **[Google] id-ID bernama** (name mengandung 'Google') → **Microsoft id-ID** → id-ID apa pun → `id` bare → `null`. Urutan fallback lama (id-ID penuh lalu `id`) TETAP untuk voice tanpa nama.
- Utterance: `lang='id-ID'`, `rate 0.85`, `pitch 1.1`, `volume 1`; `synth.cancel()` sebelum speak.
- FX: kind baru `'party'` = arpeggio naik 4 nada (mis. 523→659→784→1047, sine, bergantian). **Tiga game cakupan** mengganti `fx('cheer')` di situs kemenangan `finishRound()` menjadi `fx('party')` (1 baris per game) — semantik pemanggilan TIDAK berubah: di puzzle-hewan & memory-match situs itu hanya menyala pada ronde non-final (ronde terakhir langsung `render('end')`, perilaku lama); di temukan-hewan situs itu menyala di SETIAP ronde TERMASUK ronde final (`showCelebrate` ronde 8, perilaku lama). 4 game lain tetap `'cheer'`; kind lama (ding/wrong/pop/cheer) tidak berubah.
- Teks TTS: TIDAK diubah di game (frase sudah pendek & ramah: "Hebat!", "Coba lagi!", "Perhatikan!", dst.) — komunikasi hangat datang dari voice/pitch/rate.

## 9. Kontrak API Module
### `Art` (shared/art.js)
```
Art.ANIMALS        → 12 entri {id, name, group}, id unik (skema temukan-hewan)
Art.VEHICLES       → 8 entri {id, name}, id unik
Art.animalSvg(id)  → string SVG isi-dalam (tanpa <svg>/<g>) | Art.FALLBACK + console.error
Art.vehicleSvg(id) → string SVG isi-dalam | Art.FALLBACK + console.error
Art.FALLBACK       → string SVG isi-dalam bintang A-2 (valid, dalam palet)
Art.PALETTE        → array hex whitelist (≥ 8 warna; dipakai test)
Art.OUTLINE        → '#5A4630'
```
- UMD-lite, tanpa `root.` di dalam factory (pola simon.js/puzzle.js); semua svg isi-dalam: TIDAK membungkus `<svg>`/`<g>`.
- Setiap aset: ≥150 karakter; ≥8 elemen bentuk; mengandung `stroke="#5A4630"`; SEMUA `fill="#…"`/`stroke="#…"` ∈ `Art.PALETTE` (kecuali `rgba(0,0,0,…)` untuk bayangan).

### Adaptor (tetap)
- `Animals.ANIMALS` (10), `Animals.ANIMAL_BY_ID` — svg dibungkus `<g>…</g>`.
- `Puzzle.IMAGES` (8) + `Puzzle.PIECES_PER_ROUND` + `Puzzle.layout` + map ekspor (mis. `Puzzle.SUBJECT_MAP`).
- `VEHICLES` (8).

## 10. Testing
- **Baseline 68 tes tetap hijau**; satu-satunya file test yang berubah adalah `games/temukan-hewan/tests/audio.test.js` yang bertambah **2 blok (additif)** — asersi lama tidak disentuh (id/jumlah/kemasan aset dipertahankan; fixture audio lama tanpa `name` tak terpengaruh scoring).
- **BARU `shared/tests/art.test.js`**:
  1. `Art.ANIMALS`: 12 entri, id unik, name non-kosong, cocok `/^[a-z]+(?:-[a-z]+)*$/` (boleh satu hubung antar kata: `kura-kura`; hubung di awal/akhir/ganda ditolak); berisi semua 6 shared + 4 temukan-only + 2 puzzle-only.
  2. `Art.VEHICLES`: 8 entri (car, train, plane, ship, bike, tractor, bus, helicopter), id unik.
  3. Gaya: tiap aset ≥150 char, ≥8 elemen bentuk, tanpa bungkus `<svg>`/`<g>`, mengandung `stroke="#5A4630"`, semua warna ∈ `Art.PALETTE` (bayangan `rgba(0,0,0,…)` dikecualikan).
  4. **Mapping-contract**: semua 10 id temukan + 8 id puzzle (via `SUBJECT_MAP`) + 8 id kendaraan resolve ke aset yang valid — jaminan utama, bukan fallback.
  5. `Art.animalSvg('nope')` → `Art.FALLBACK` (identik) + console.error terpanggil (spy); `Art.FALLBACK` valid A-2 (≥150 char, stroke token, warna ∈ palet).
  6. Adaptor dual-mode: `require('../../art.js')` dari adaptor menghasilkan data konsisten (dijamin oleh test adaptor lama yang require adaptor polos).
- **audio.test.js +2**: voice bernama Google id-ID menang atas id-ID tanpa nama; Microsoft menang atas id-ID generik; urutan fallback lama tetap (test lama sudah mencakup).
- **Smoke manual (CDP/browser)**: 3 game — `file://` & `http://` (768 & 360): render aset A-2 terlihat (gambar bukan kosong), ketuk berfungsi, tidak ada error konsol; visual A-2 diperiksa mata (bukan hanya bukan-kosong).

## 11. Kriteria Acceptance
1. Suite penuh hijau: **68 baseline + test baru art & audio tetap lulus** — `node --test` dari root, 0 fail.
2. `shared/art.js` memuat di Node (`require`) DAN browser (script tag) dengan katalog 12 hewan + 8 kendaraan; `Art.FALLBACK` & `Art.PALETTE` ada & tervalidasi test.
3. 3 game jalan `file://` DAN `http://`: hewan/kendaraan tampil bergaya A-2 (bukan abstrak lama), semua id/ronde/ketuk berfungsi, puzzle berfungsi (slot kosong menampilkan SVG utuh; potongan via `pieceSVG` benar), 0 error konsol.
4. Mapping: 10 id temukan + 8 id puzzle + 8 kendaraan semuanya resolve — **jaminan utama lewat test kontrak mapping** (assert resolve + `console.error` via spy untuk id tak dikenal); smoke browser hanya memastikan jalur normal bersih (0 error konsol) & tidak pernah blank — fallback bukan jalur normal.
5. Suara: `pickIdVoice` hasilkan voice bernama Google/Microsoft id-ID bila ada (versus voice generik), `rate 0.85`/`pitch 1.1`; **3 game cakupan** memakai `fx('party')` di situs kemenangan yang ada (temukan-hewan: tiap ronde termasuk final; puzzle-hewan & memory-match: ronde non-final saja — perilaku lama dipertahankan); 4 game lain tetap `'cheer'`; mute toggle & fallback senyap tetap.
6. Anti-regresi: 4 game lain (berhitung, sortir-bentuk-warna, ikuti-urutan, ketuk-bola) TIDAK berubah filenya; id/nama/jumlah aset publik tidak berubah di 3 game yang diadaptor; `shared/` hanya berubah di `art.js` (baru) & `audio.js`.

## 12. Non-Goals
- TANPA redraw gambar 4 game lain (iterasi berikut), TANPA animasi aset (bounce/wiggle), TANPA rekaman suara/voice actor, TANPA aset eksternal/berlisensi.
- TANPA ganti id/nama publik, TANPA ubah `profile.js`/`games-registry.js`/`avatars.js`/`index.html` dashboard.
- TANPA ubah teks TTS per game; TANPA nada per-hewan/per-kendaraan.
- TANPA geser: puzzle-hewan tetap `PIECES_PER_ROUND [4,4,6,6,9,9,9,9]`; kontrak ronde & skor tidak disentuh.

## 13. Struktur File
```
shared/
  art.js                  ← BARU (gaya + katalog + fallback + palet)
  tests/art.test.js       ← BARU
games/temukan-hewan/
  animals.js              ← adaptor ke Art (WRAP <g>), id/group tetap
  index.html              ← + script art.js sebelum animals.js
games/puzzle-hewan/
  puzzle.js               ← adaptor ke Art (SUBJECT_MAP), kontrak lain tetap
  index.html              ← + script art.js sebelum puzzle.js
games/memory-match/
  vehicles.js             ← adaptor ke Art.VEHICLES
  index.html              ← + script art.js sebelum vehicles.js
games/temukan-hewan/game.js    ← situs kemenangan: fx('cheer') → fx('party')
games/puzzle-hewan/game.js     ← situs kemenangan: fx('cheer') → fx('party')
games/memory-match/game.js     ← situs kemenangan: fx('cheer') → fx('party')
shared/audio.js           ← scoring voice + rate/pitch + fx 'party'
games/temukan-hewan/tests/audio.test.js  ← +2 blok (voice bernama)
docs/superpowers/specs/2026-08-17-seni-suara-ramah-anak-design.md  ← file ini
```