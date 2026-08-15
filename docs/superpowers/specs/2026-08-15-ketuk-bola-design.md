# Design Spec — Ketuk Bola Warna ⚽ (Game #6)

> Siklus game ke-6 dalam dashboard multi-game anak (3–5 tahun). Pola konsisten dengan 5 game sebelumnya: 8 ronde, 1 bintang per ronde, satu-sentuhan, nol dependensi.

## 1. Tujuan

Melatih **fokus selektif dan mengikuti instruksi**: anak mengetuk bola dengan warna yang disebutkan, sambil mengabaikan bola pengecoh berwarna lain. Tanpa timer — tempo kalem, ketukan sadar.

## 2. Pengguna & Alur

- Usia 3–5 tahun, satu jari, tanpa instruksi tertulis.
- Dashboard → kartu "Ketuk Bola Warna ⚽" → menu "Main Yuk!" → 8 ronde → layar akhir ("Sempurna! 🌟" + 8 bintang) → auto-return ±6 dtk → "Lainnya?".
- Profil per anak; `Profiles.addScore('ketuk-bola', stars)`.

## 3. Mekanik Ronde

- **8 ronde**, bola per ronde `[4,4,6,6,8,8,10,10]` — total 56 ketukan/sesi.
- **Papan**: bola SVG bundar berwarna (4 warna: Merah `#E53935`, Biru `#1E88E5`, Kuning `#F9A825`, Hijau `#43A047`), **ukuran tetap 96px + gap 12px, flex-wrap tengah** — diameter ≥96px terjamin di semua viewport (360×640: 3 kolom = 324px pas; 768×1024 lega), tanpa overflow horizontal.
- **Instruksi**: banner besar "Ketuk bola **Merah!**" — kata warna ditampilkan BERWARNA (bantuan visual) + TTS id-ID "Ketuk bola Merah!". Instruksi berganti setelah tiap ketukan benar.
- **Target**: semua bola warna yang disebut sah (bukan bola spesifik).
- **Distribusi warna deterministik**: warna bola = siklus `[red,blue,yellow,green]` (panjang count) lalu posisi bola diacak → selalu ≥2 warna untuk count ≥4. **Instruksi** = daftar warna per bola (diacak) → setiap instruksi selalu punya ≥1 bola tersisa (simulasi pop tidak pernah macet).
- **Benar**: `pop` fx + bola mengecil-hilang (transisi ~250ms) + instruksi berikutnya (TTS).
- **Salah (bola warna beda)**: `wrong` fx + bola itu goyang 450ms + "Coba lagi!" — tanpa hukuman, instruksi TETAP, bola target tetap tersedia; bola yang sudah terpop otomatis non-interaktif.
- **Kelar ronde** (semua bola terpop): `cheer` + TTS "Hebat!" + overlay bintang (ronde 1–7) → "Lanjut!"; ronde 8 langsung layar akhir.
- Tanpa timer, tanpa skor efisiensi: ronde selesai = 1 bintang, selalu. Lock transisi ±300ms setelah pop (cegah tap ganda).
- Ketukan di luar bola / area kosong: diabaikan.

## 4. Interaksi Satu Objek (pedantic)

- Semua aksi: `pointerdown` (bukan `click`).
- Target ≥96px: bola 96px tetap, `.btn-big` min-height 96px, `.btn-sound` 96px.
- State machine: `menu / round / celebrate / end` — satu layar aktif; guard: tap saat lock/screen salah/bola terpop → diabaikan.
- Auto-return: `setTimeout(backToDashboard, 6000)` di `renderEnd`; **`clearTimeout(returnTimer)` SEBELUM membuat timer baru** dan di `backToDashboard` (pola `db02a00`).

## 5. Layar Akhir

- `#end-title` berjenjang: `maxStars(8)` → "Sempurna! 🌟"; ≥5 → "Hebat sekali!"; ≥3 → "Mantap!"; <3 → "Ayo coba lagi!".
- `#stars`: 8 ikon bintang SVG, `.filled`; `#btn-again` = "Lainnya?" → dashboard.

## 6. Ikon & Aset

- Bola: lingkaran SVG dengan **highlight kecil** (elips putih semi-transparan kiri-atas) — markup DALAM (`Ball.ballSVG`? cukup string `ballSVG(colorId)` di module → `<svg …>` lengkap? IKUTI pola binIcon: full `<svg viewBox="0 0 48 48" role="img" aria-label="Bola Merah">…</svg>`), `data-color` di tombol.
- Banner instruksi: kata warna `<span style="color:{hex}">Merah</span>`.
- Ikon fungsional (bintang, suara) = SVG inline; emoji HANYA dekorasi teks (title "Ketuk Bola Warna ⚽", "Sempurna! 🌟").
- Registri: entri ke-6 `{id:'ketuk-bola', name:'Ketuk Bola Warna', maxStars:8, path:'games/ketuk-bola/index.html', icon: 3 lingkaran warna}` (SVG lengkap `aria-hidden`).

## 7. Arsitektur & Integrasi

```
games/ketuk-bola/
  index.html      — layar menu/round/celebrate/end; script: ../../shared/audio.js → ../../shared/profile.js → balls.js → game.js
  style.css       — tema & komponen (pola style.css game lain)
  balls.js        — PURE UMD-lite (module.exports + window.Balls):
                      COLORS 4×{id,name,hex}    BALLS_PER_ROUND [4,4,6,6,8,8,10,10]
                      makeRound(i)→{balls:[{id,color}], instructions:[{color}]}
                      ballSVG(colorId)→'<svg …>…</svg>' (aria-label "Bola {Nama}")
                      matches(instColor,ballColor)   shuffle(arr)   isRoundDone(popped,total)
  game.js         — DOM/audio/TTS/skor/navigasi (pola puzzle/sortir game.js)
  tests/balls.test.js — tes murni balls.js
```
- Registri +1 entri; dashboard otomatis kartu ke-6 (dashboard.test.js iterasi GAMES). 0 perubahan `shared/audio.js`, `shared/profile.js`, dashboard, game lain.

## 8. Batas Antar-Modul (kontrak)

| Modul | API | Wajib |
|---|---|---|
| balls.js | `Balls.COLORS` | 4; id unik {red,blue,yellow,green}; `name` id; `hex` #RRGGBB |
| balls.js | `Balls.BALLS_PER_ROUND` | `[4,4,6,6,8,8,10,10]` |
| balls.js | `Balls.makeRound(i)` | `{balls, instructions}`; balls.length = BALLS_PER_ROUND[i]; id unik; ≥2 warna; instructions.length = balls.length; **solvabilitas**: simulasi pop berurutan selalu sukses; i invalid → null |
| balls.js | `Balls.ballSVG(colorId)` | `<svg viewBox="0 0 48 48" role="img" aria-label="Bola {Nama}">…</svg>`; unknown → null |
| balls.js | `Balls.matches(a, b)` | bool |
| balls.js | `Balls.shuffle(arr)` | salinan, tidak mengubah input |
| balls.js | `Balls.isRoundDone(placed, count)` | `count>0 && placed>=count` |
| game.js | DOM ids | `#menu #round-screen #round-label #instruction #inst-word #board #progress-label #celebrate #celebrate-msg #btn-celebrate #end-screen #end-title #stars #btn-start #btn-again #btn-sound`; bola `.ball` `data-color`; `#inst-word` = kata warna berwarna |
| game.js | Audio | `GameAudio.unlock/speak/fx/setMuted/isMuted`; fx HANYA `pop|wrong|cheer` (ding TIDAK wajib) |
| game.js | Skor | `if (root.Profiles) root.Profiles.addScore('ketuk-bola', state.stars)` |
| registri | entri ke-6 | setelah `puzzle-hewan`; icon string `<svg>` lengkap |

## 9. Kriteria Penerimaan (8)

1. **Tes otomatis hijau semua** — baseline 51 + tes balls baru; `node --test` bare dari root: nol gagal.
2. **Registri 6 game** — dashboard menampilkan 6 kartu; entri `ketuk-bola` valid (path ada, memuat `../../shared/audio.js` dan `../../shared/profile.js`).
3. **8 ronde & progresi** — bola `[4,4,6,6,8,8,10,10]`; instruksi per ronde selalu solvable (invariant teruji); warna kata di banner sesuai instruksi + TTS.
4. **Alur penuh** — tap bola warna benar → pop + instruksi berikutnya; tap salah → goyang + bola target tetap; bola terpop non-interaktif; 56 ketukan/sesi tanpa macet; ronde 1–7 overlay → "Lanjut!", ronde 8 layar akhir.
5. **Skor & navigasi** — 8/8 bintang "Sempurna! 🌟"; auto-return ≤8 dtk; dashboard kartu Ketuk "Bintang 8/8" HANYA di kartu ini (profil baru); "Lainnya?" kembali; skor tidak naik tanpa main (profil baru bintang kosong di game lain).
6. **Touch & layout** — semua target ≥96px (bola 96 fix); tidak ada overflow horizontal di 768×1024 dan 360×640; `file://` AND `http://` berfungsi.
7. **Audio** — TTS id-ID tiap instruksi + pujian ronde + unlock gestur pertama + mute toggle; nol error konsol; nol request HTTP (favicon `data:,`). `pop` dipakai untuk ketukan benar (preseden Berhitung).
8. **Anti-regresi** — 5 game lama & dashboard utuh; satu-satunya file shared berubah: `games-registry.js` (+1 entri).

## 10. Non-Tujuan

- Bukan game refleks ber-timer (main tujuan = fokus selektif, bukan kecepatan).
- Bukan teka-teki tersembunyi / bola bergerak cepat — papan statis, instruksi satu per satu.
- Tidak ada hukuman untuk bola pengecoh — justru distraktor yang harus DIABAIKAN.
- Tidak ada efek skor efisiensi / combo.