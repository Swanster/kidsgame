# Ikuti Urutan — Design Spec (Game #7)

> Tujuan: melatih **perhatian + memori kerja** anak 3–5 tahun: 4 pad warna menyala berurutan, anak mengulang dengan mengetuk. Satu-sentuhan, tanpa tekanan waktu, tanpa penalti (tidak mungkin macet).

## 1. Tujuan & Sasaran
- Anak memusatkan perhatian pada demo urutan, menyimpan 2–5 item memori kerja, lalu mengetuk ulang dalam urutan yang sama.
- Kontrol: hanya `pointerdown` sekali sentuh; tidak ada ketukan cepat atau waktu terbatas.
- Durasi sesi: 8 ronde, ±3–5 menit.

## 2. Kontrak Persisten
- File game: `games/ikuti-urutan/` (konsisten 1 folder per game).
- Registri `shared/games-registry.js`: entri ke-7 (SETELAH `ketuk-bola`): `{ id: 'ikuti-urutan', name: 'Ikuti Urutan', maxStars: 8, path: 'games/ikuti-urutan/index.html', icon: '<svg viewBox="0 0 48 48">4 kuadran warna pad</svg>' }` — id/name/path/icon persis huruf besar.
- Halaman: `document.title = 'Ikuti Urutan 🎵'` (emoji dekoratif di teks, bukan ikon fungsional — amanat global).
- Skor: `Profiles.addScore('ikuti-urutan', stars)` (guard `root.Profiles`), `maxStars = 8`.
- `shared/{audio,profile,games-registry}.js`: HANYA registri yang boleh berubah (audio.js & profile.js TIDAK BOLEH disentuh).

## 3. Arena & Elemen UI (IDs)
- `#menu`: title ("Ikuti Urutan 🎵"), subtitle ("Ingat urutan lampunya ya!"), `#btn-start` ("Main Yuk!"), `#btn-sound` (toggle mute, SVG inline, ≥96px).
- `#round-screen`:
  - `#round-label` ("Ronde N"), `#progress-label` (`(posisi+1)/panjang`).
  - `#status` — baris status: "Perhatikan lampu ya...", "Sekarang giliranmu!", "Coba lagi!" (teks besar; TTS mengikuti).
  - `#pads` — grid 2×2 (flex-wrap, gap 16px, max-width 640px): 4 tombol `<button class="pad" data-color="{id}">` dengan `padSVG` di dalam.
- `#celebrate` overlay (pola game 4–6): `#confetti`, `#celebrate-msg`, `#btn-celebrate`.
- `#end-screen`: `#end-title`, `#stars`, `#btn-again` ("Lainnya?").
- Script order: `../../shared/audio.js` → `../../shared/profile.js` → `simon.js` → `game.js`; `<link rel="icon" href="data:,">`.

## 4. Alur Permainan
1. `#btn-start` (pointerdown; `GameAudio.unlock()`): ronde 1, `nextRound()`.
2. `nextRound()`: `round = Simon.makeSequence(SEQUENCE_LENGTHS[roundIndex])` → label ronde → render('round') → status "Perhatikan lampu ya..." → TTS "Perhatikan!" → **demo**: untuk tiap warna urutan: pad `.lit` 650ms + `fx('ding')`, off 250ms. Selama demo: semua pad non-interaktif (lock).
3. Setelah demo → status "Sekarang giliranmu!" + TTS "Ayo ulangi!" → ketukan anak (pad lock 350ms per ketukan, lampu singkat 200ms + `fx('ding')`).
   - **Benar** (warna == urutan[posisi]): posisi++; status/ligtht; jika `isRoundDone(posisi, len)` → `finishRound()`.
   - **Salah**: `fx('wrong')` + shake 450ms + status/"Coba lagi!" — **posisi TETAP, urutan tidak diulang** (tidak ada penalti; tidak mungkin macet; konsisten pola Puzzle G5 "salah = shake + barang tetap").
4. `finishRound()`: stars++, cheer + "Hebat!" → ronde 1–7: `showCelebrate()` ("Yeay! 🎉" + confetti) → `#btn-celebrate` ("Lanjut!") → roundIndex++ → nextRound. Ronde 8: render('end').
5. `renderEnd()`: clearTimeout(returnTimer) SEBELUM apapun → render 8 bintang → `addScore` → `setTimeout(backToDashboard, 6000)` → title tiered: 8 "Sempurna! 🌟" / ≥5 "Hebat sekali!" / ≥3 "Mantap!" / <3 "Ayo coba lagi!".
6. `backToDashboard()`: clearTimeout; `location.href = '../../index.html'`.

## 5. Aset & Logika Murni — `simon.js` (UMD-lite, tanpa `root.` di factory)
```
PADS: 4 entri {id, name, hex, shape} — id unik; urutan tetap:
  red    Merah   #E53935  shape 'circle'
  blue   Biru    #1E88E5  shape 'square'
  yellow Kuning  #F9A825  shape 'triangle'
  green  Hijau   #43A047  shape 'star'
SEQUENCE_LENGTHS: [2,2,3,3,4,4,5,5]
makeSequence(len)      -> [colorId, ...] | null (len <= 0 / bukan angka -> null)
padSVG(colorId)        -> string SVG lengkap | null
matches(tap, expected) -> bool
isRoundDone(placed, len) -> bool (len > 0 && placed >= len)
```
- `makeSequence(len)`: array `len` warna diacak dari 4 — **pengulangan diperbolehkan** (Simon klasik); tiap elemen adalah id pad yang valid.
- `padSVG(colorId)`: pad berbentuk persegi membulat penuh (`<svg viewBox="0 0 48 48" role="img" aria-label="Pad {Nama}">`) — body `<rect x=1 y=1 width=46 height=46 rx=10 fill={hex} stroke="#4A3728" stroke-width="2">` + **bentuk identitas putih di tengah** sesuai `shape` (circle: `<circle cx=24 cy=24 r=10 fill="#fff">`; square: `<rect x=15 y=15 width=18 height=18 rx=2 fill="#fff">`; triangle: `<polygon points="24,13 35,34 13,34" fill="#fff">`; star: path bintang 5 sudut putih) — arsir `id`/padun; warna tak dikenal → null.

## 6. Detail Visual & Interaksi
- Pad: 140×140px fixed (≥96 amanat), `border-radius 18px`, bayangan bawah 6px (efek 3D), `transition transform .12s`; `.pad:active` sedikit tenggelam; `.pad.lit { filter: brightness(1.3); transform: scale(1.04); box-shadow: 0 0 24px rgba(255,255,255,.8), 0 6px 0 rgba(0,0,0,.25); }`; `.pad.shake { animation: shake .45s ease }` (keyframes identik keluarga game); `.pad:disabled` saat demo (status "menunggu" via class `.locked`).
- Grid `#pads`: flex, wrap center, gap 16px, max-width 640px; di 360×640: 2 pad/baris (140+140+16 = 296 ≤ 360) ✓.
- Status `#status`: font 1.6rem, tebal, warnanya hangat; progress label seperti game lain.
- Skema warna: keluarga game (bg #FFF3E0, aksen #FF9F43/#E07B1F, tinta #6D4C41) — konsistensi dashboard.

## 7. Audio & TTS (id-ID)
- `GameAudio.fx` HANYA kind yang ada: `'ding'` (demo + ketuk benar), `'wrong'` (salah), `'cheer'` (selesai ronde). **TANPA nada unik per pad** (non-goal; audio.js immutable).
- `GameAudio.speak`: ronde mulai "Perhatikan!"; setelah demo "Ayo ulangi!"; salah "Coba lagi!"; ronde selesai "Hebat!"; suara tombol starter via unlock gestur pertama; fallback senyap otomatis.
- `#btn-sound` toggle mute (SVG speaker/speaker-off inline, pola game lain).

## 8. Kontrak API Module
- `Simon.PADS` (4, order tetap), `Simon.SEQUENCE_LENGTHS` (8), `Simon.makeSequence(len)` (null invalid), `Simon.padSVG(colorId)` (null unknown; aria-label "Pad {Nama}"; body + bentuk identitas + stroke gelap), `Simon.matches(a,b)`, `Simon.isRoundDone(placed,len)`.
- UMD-lite: `window.Simon` + `module.exports`; **DILARANG ref `root.` di dalam factory** (pola balls.js/puzzle.js).
- Tes `tests/simon.test.js` (node --test, `require('../simon.js')`) — **8 blok `test(`**:
  1. PADS: 4, id unik, nama non-kosong, hex `#[0-9A-F]{6}`, shape salah satu dari circle/square/triangle/star.
  2. SEQUENCE_LENGTHS: deepStrictEqual `[2,2,3,3,4,4,5,5]`.
  3. makeSequence: untuk tiap len valid (1..8): panjang array == len; semua elemen id pad dikenal.
  4. makeSequence acak + pengulangan diperbolehkan: 20× `makeSequence(3)` — setidaknya 2 varian berbeda terlihat (prob. identik ~0); tidak ada kewajiban warna unik.
  5. makeSequence(-1)/makeSequence(0)/makeSequence('x') → null.
  6. padSVG: svg dimulai `<svg`, berisi role="img" + aria-label `Pad Merah` (untuk red), berisi hex fill, berisi elemen bentuk (`<circle` untuk red; `<rect` untuk blue; `<polygon` untuk yellow; `<path` untuk green — path bintang), tidak bocor hex warna lain; padSVG('pink')/padSVG('') → null.
  7. matches: (a,a)=true, (a,b)=false lintas warna.
  8. isRoundDone: (0,5)=false, (4,5)=false, (5,5)=true, (8,8)=true, (6,5)=true, (0,0)=false.

## 9. Kriteria Acceptance
1. **Tes hijau**: suite penuh = **68** (baseline 60 + 8 blok simon.js) — `node --test` bare dari root.
2. Registri 7 game valid; `shared/tests/games-registry.test.js` + `dashboard.test.js` (iterasi GAMES) mencakup `ikuti-urutan`.
3. 8 ronde, panjang urutan `[2,2,3,3,4,4,5,5]`; demo memutar urutan pad menyala berurutan; setiap ronde tuntas = 1 bintang.
4. Alur penuh: salah tap → shake + status "Coba lagi!" + **posisi tetap** (urutan tidak bergeser); benar → posisi naik; demo selesai → giliran anak; lock saat demo & 350ms per ketukan; 8 ronde tanpa macet; ronde 1–7 overlay Lanjut!, ronde 8 end screen.
5. Skor: bintang 8 → title "Sempurna! 🌟"; auto-return ≤8 detik kembali `Game Anak` (clearTimeout SEBELUM timer); `#btn-again` "Lainnya?"; skor persist di kartu (`.game-stars` = "Bintang 8/8").
6. Touch target ≥96px (pad 140px); tidak ada overflow horizontal 360×640 dan 768×1024 (2 kolom pad di 360); jalan `file://` DAN `http://`.
7. Audio: TTS id-ID (Perhatikan!/Ayo ulangi!/Coba lagi!/Hebat!), fx hanya ding/wrong/cheer, unlock gestur pertama, mute toggle, 0 error konsol & 0 request gagal (favicon data:,).
8. Anti-regresi: 6 game lama + dashboard utuh (suite 60 baseline tetap hijau); satusatunya perubahan di `shared/` = registri; semua interaksi `pointerdown`; ikon fungsional SVG inline (bukan emoji); UMD-lite tanpa `root.` di factory simon.js.

## 10. Non-Goals
- Tanpa nada/pitch unik per pad (butuh modifikasi audio.js — dilarang).
- Tanpa timer/tekanan waktu/reaksi cepat; tanpa skor efisiensi.
- Tanpa mode Simon vs komputer; tanpa tampilan skor tinggi.
- Tanpa drag (hanya tap).

## 11. Struktur File
```
games/ikuti-urutan/
  index.html        (halaman, script order audio→profile→simon→game)
  style.css         (layout, pad, lit, shake, confetti, layar)
  game.js           (siklus ronde, demo, ketukan, skor, navigasi; root.IkutiUrutan = {init})
  simon.js          (logika murni + aset pad SVG; UMD-lite)
  tests/simon.test.js (8 blok)
shared/games-registry.js  (+ entri ke-7)
```