# Design Spec — Puzzle Hewan 🧩 (Game #5)

> Siklus game ke-5 dalam dashboard multi-game anak (3–5 tahun). Pola konsisten dengan 4 game sebelumnya: 8 ronde, 1 bintang per ronde, satu-sentuhan, nol dependensi.

## 1. Tujuan

Melatih **penalaran ruang dan bentuk** lewat puzzle potongan sederhana (tile puzzle): anak memasang potongan gambar hewan ke slot yang tepat dengan satu sentuhan. Tidak ada drag — kontras aksi tunggal yang sudah terbukti di 4 game lain.

## 2. Pengguna & Alur

- Usia 3–5 tahun, satu jari, tanpa instruksi tertulis.
- Dashboard (`index.html` di root) → kartu "Puzzle Hewan 🧩" → menu "Main Yuk!" → 8 ronde → layar akhir ("Sempurna! 🌟" + 8 bintang) → auto-return ±6 dtk ke dashboard → "Lainnya?" manual.
- Profil per anak; bintang terbaik disimpan per profil (`Profiles.addScore('puzzle-hewan', stars)`).

## 3. Mekanik Ronde

- **8 ronde**, tiap ronde gambar hewan baru (8 hewan: kucing, anjing, gajah, kelinci, bebek, ikan, burung, kura-kura).
- **Potongan per ronde**: `[4,4,6,6,9,9,9,9]` → grid `2×2` (4), `2×3` (6), `3×3` (9). Total pasangan 56/sesi.
- Urutan kemunculan potongan **diacak** (Fisher–Yates, `shuffle`), tetapi angka potongan tetap 1..N (petunjuk mencocokkan).
- **Acuan**: gambar utuh kecil ditampilkan di atas grid (≈120–140px) — anak melihat hasil akhirnya.
- **Slot**: grid kotak kosong berisi siluet samar gambar + **nomor samar** = penanda posisi; potongan besar (tray) menampilkan potongan bergambar + **nomor tebal** di sudut.
- **Satu objek aktif**: potongan `n` aktif tampil di tray; anak mengetuk slot → jika `slot.n === potongan.n` potongan terpasang permanen (grid sel terisi gambar); lanjut potongan berikutnya. Slot lain/gabungan area: ketukan diabaikan (nol hukuman).
- **Salah slot**: `wrong` fx + slot goyang (shake 450ms) + "Coba lagi!" — potongan tetap di tray, anak boleh coba lagi tanpa batas.
- **Benar**: `ding` + potongan "snap" (animasi pop) + pujian singkat TTS sesekali (bukan tiap potongan — 56×TTS terlalu bising).
- **Kelar ronde**: `cheer` + TTS "Hebat! {Nama hewan} selesai!" + overlay bintang (ronde 1–7) → "Lanjut!"; ronde 8 langsung layar akhir.
- Tanpa timer, tanpa skor efisiensi: ronde selesai = 1 bintang, selalu.
- Lock transisi ±250ms setelah tap benar (cegah tap ganda).

## 4. Interaksi Satu Objek (pedantic)

- Semua aksi: `pointerdown` (bukan `click`).
- Target sentuh ≥96px: potongan tray ≥120px, sel grid ≥96px, tombol `.btn-big` min-height 96px, `.btn-sound` 96px.
- State machine: `menu / round / celebrate / end` — hanya satu layar aktif (`hidden` sisanya); guard: tap saat lock/screen salah → diabaikan.
- Auto-return: `setTimeout(backToDashboard, 6000)` di `renderEnd`; **`clearTimeout(returnTimer)` SEBELUM membuat timer baru** dan di `backToDashboard` (pola `db02a00`).

## 5. Layar Akhir

- `#end-title` berjenjang: `maxStars(8)` → "Sempurna! 🌟"; ≥5 → "Hebat sekali!"; ≥3 → "Mantap!"; <3 → "Ayo coba lagi!".
- `#stars`: 8 ikon bintang SVG, `.filled` untuk yang diraih; `#btn-again` = "Lainnya?" → dashboard.

## 6. Ikon & Aset

- **8 gambar hewan SVG** (viewBox `0 0 120 120`), gaya simple/shape besar (lingkaran/elips/persegi dengan mata, telinga, paruh — preseden `vehicles.js`): kucing, anjing, gajah, kelinci, bebek, ikan, burung, kura-kura. Tiap gambar: `{id, name, svg}` — `svg` = **markup DALAM tanpa tag `<svg>`** (dibungkus `pieceSVG`).
- **Potongan**: sub-SVG `viewBox="x y w h"` berisi gambar utuh (clipping otomatis viewBox) + `<text>` angka potongan → `<svg viewBox="0 0 w h" role="img" aria-label="Potongan n">…</svg>` lengkap.
- **Slot**: tombol grid berisi siluet (gambar utuh dengan opacity rendah + `mask`? CUKUP: kotak abu + angka samar; setelah terisi: potongan penuh).
- Ikon fungsional (bintang, tombol suara) = SVG inline; emoji HANYA dekorasi teks (title "Puzzle Hewan 🧩", "Sempurna! 🌟").
- Registri: entri ke-5 `{id:'puzzle-hewan', name:'Puzzle Hewan', maxStars:8, path:'games/puzzle-hewan/index.html', icon: 2×2 mini-grid berwarna}` (ikon SVG lengkap + `aria-hidden`).

## 7. Arsitektur & Integrasi

```
games/puzzle-hewan/
  index.html      — layar menu/round/celebrate/end; script: ../../shared/audio.js → ../../shared/profile.js → puzzle.js → game.js
  style.css       — tema & komponen (pola style.css game lain)
  puzzle.js       — PURE UMD-lite (module.exports + window.Puzzle):
                      IMAGES 8×{id,name,svg}    PIECES_PER_ROUND [4,4,6,6,9,9,9,9]
                      layout(count)→{cols,rows} makeBoard(imgIndex)→{image, pieces:[{n,col,row,x,y}]} (acak)
                      pieceSVG(imgIndex,piece)→'<svg …>…</svg>' (viewBox potongan, angka <text>)
                      shuffle(arr)→salinan     isRoundDone(placed,count)
  game.js         — DOM/audio/TTS/skor/navigasi (pola berhitung/sortir game.js)
  tests/puzzle.test.js — tes murni puzzle.js
```
- Registri `shared/games-registry.js` +1 entri; dashboard otomatis merender kartu ke-5 (dashboard.test.js iterasi GAMES).
- 0 perubahan pada `shared/audio.js`, `shared/profile.js`, dashboard, game lain.

## 8. Batas Antar-Modul (kontrak)

| Modul | API | Wajib |
|---|---|---|
| puzzle.js | `Puzzle.IMAGES` | 8 entri; id unik; `name` non-kosong; `svg` tanpa tag `<svg>` |
| puzzle.js | `Puzzle.PIECES_PER_ROUND` | `[4,4,6,6,9,9,9,9]` |
| puzzle.js | `Puzzle.layout(count)` | 4→`{cols:2,rows:2}`, 6→`{cols:3,rows:2}`, 9→`{cols:3,rows:3}`; lainnya → null |
| puzzle.js | `Puzzle.makeBoard(imgIndex)` | `{image, pieces}`; pieces unik 1..n, koordinat `x,y,w,h` pixel 120-space membagi gambar merata (`w=120/cols, h=120/rows`), urutan diacak; index tak dikenal → null |
| puzzle.js | `Puzzle.pieceSVG(imgIndex, piece)` | `<svg viewBox="x y w h" role="img" aria-label="Potongan n">…gambar…<text>n</text></svg>`; index tak dikenal → null |
| puzzle.js | `Puzzle.shuffle(arr)` | salinan, tidak mengubah input |
| puzzle.js | `Puzzle.isRoundDone(placed, count)` | `count>0 && placed>=count` |
| game.js | DOM ids | `#menu #round-screen #round-label #reference #grid #tray #piece-label #celebrate #celebrate-msg #btn-celebrate #end-screen #end-title #stars #btn-start #btn-again #btn-sound`; slot `.slot` `data-slot`; tray potongan `aria-label="Potongan n"` |
| game.js | Audio | `GameAudio.unlock/speak/fx/setMuted/isMuted`; fx HANYA `ding|wrong|cheer` (tidak `pop` wajib) |
| game.js | Skor | `if (root.Profiles) root.Profiles.addScore('puzzle-hewan', state.stars)` |
| registri | entri ke-5 | setelah `sortir-bentuk-warna`; icon string `<svg>` lengkap |

## 9. Kriteria Penerimaan (8)

1. **Tes otomatis hijau semua** — baseline 44 + tes puzzle baru; `node --test` bare dari root: nol gagal.
2. **Registri 5 game** — dashboard menampilkan 5 kartu; entri `puzzle-hewan` valid (path ada, memuat `../../shared/audio.js` dan `../../shared/profile.js`).
3. **8 ronde & progresi** — potongan `[4,4,6,6,9,9,9,9]`; grid `2×2/2×3/3×3`; nama hewan benar per ronde (TTS + label).
4. **Alur penuh** — potongan acak bernomor; tap slot benar → terpasang + progress maju; salah → goyang + potongan tetap; 56 pasangan/sesi tanpa macet; ronde 1–7 overlay → "Lanjut!", ronde 8 layar akhir.
5. **Skor & navigasi** — 8/8 bintang "Sempurna! 🌟"; auto-return ≤8 dtk; dashboard kartu Puzzle "Bintang 8/8" HANYA di kartu ini (profil baru); "Lainnya?" kembali.
6. **Touch & layout** — semua target ≥96px; tidak ada overflow horizontal di viewport 768×1024 dan 360×640; `file://` AND `http://` berfungsi.
7. **Audio** — TTS id-ID (nama hewan + pujian), unlock gestur pertama, mute toggle; nol error konsol; nol request HTTP (favicon `data:,`).
8. **Anti-regresi** — 4 game lama & dashboard utuh; satu-satunya file shared berubah: `games-registry.js` (+1 entri).

## 10. Non-Tujuan

- Bukan puzzle drag-and-drop / rotasi potongan (terlalu sulit usia 3, butuh presisi jari).
- Bukan potongan bentuk beku (jigsaw interlocking) — tile persegi dengan nomor sebagai penolong memori.
- Bukan skor waktu/efisiensi; bukan ronde gagal.
- Tidak ada TTS per potongan (56× = bising) — pujian TTS terbatas.