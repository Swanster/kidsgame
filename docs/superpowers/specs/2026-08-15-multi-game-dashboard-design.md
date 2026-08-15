# Desain: Dashboard Multi-Game Anak (3–5 tahun)

Tanggal: 2026-08-15
Status: Disetujui secara lisan — menunggu review tertulis
Repo: `/home/swanster/projects/games/games-kay`

## 1. Tujuan

Membangun dashboard pemilih game untuk anak usia 3–5 tahun yang berisi beberapa game edukasi sederhana, dengan profil per anak dan penyimpanan bintang terbaik per game. Game pertama yang sudah ada — **Temukan Hewan** — menjadi game #1 dalam struktur baru. Dashboard harus tetap:

- Vanilla HTML/CSS/JS — nol dependensi, nol build, nol jaringan.
- Berjalan dari `file://` **dan** `http://` (server statis apa pun, mis. `python3 -m http.server`).
- Ramah anak: ikon besar, tanpa teks wajib, navigasi oleh anak sendiri.

## 2. Pengguna & Alur

| Peran | Aksi |
|---|---|
| Orang tua | Sekali: buat profil (ketik nama + pilih avatar). Sewaktu-waktu: keluar darurat via tombol belakang browser. |
| Anak (3–5) | Sentuh avatar → pilih game → main → otomatis kembali ke dashboard. |

## 3. Arsitektur

Pendekatan terpilih: **multi-halaman, satu folder per game** (Opsi A).

```
games-kay/
├── index.html              ← Dashboard
├── shared/
│   ├── audio.js            ← dipindah dari root (sama persis, sudah berfungsi)
│   ├── profile.js          ← baru: profil & bintang (localStorage, API UMD-lite)
│   └── avatars.js          ← baru: 6 konstanta ikon SVG
└── games/
    ├── temukan-hewan/      ← game #1 (dipindah dari root; index.html/game.js/style.css/rounds.js/animals.js/tests/)
    └── <game-id>/          ← game berikutnya, pola identik
```

### Aturan navigasi

- Dashboard → game: tautan relatif `games/<id>/index.html` (jalan di `file://` maupun `http://`).
- Game → dashboard: tautan relatif `../../index.html`.
- Layar akhir game: tampilkan bintang → **otomatis kembali ke dashboard ±6 detik** + tombol "Lainnya?".
- Tidak ada tombol "beranda" di layar permainan anak (mencegah keluar tak sengaja); keluar darurat = tombol belakang browser (urusan orang tua).

## 4. Profil & Progres

- `shared/profile.js` memakai `localStorage` (kunci `thk:profiles` + `thk:activeProfile`); tetap tanpa server.
- Data profil: `{ id, nama, avatarId, skor: { "<gameId>": bintangTerbaik } }`.
- API (`window.Profiles`, UMD-lite, `module.exports` untuk `node --test`):
  - `init(storage)` — injeksi storage untuk tes Node (default `window.localStorage`; fallback memori jika localStorage tidak tersedia/diblokir → dashboard tetap jalan tanpa simpan lintas sesi).
  - `list()`, `create(nama, avatarId)`, `activate(id)`, `active()`, `addScore(gameId, bintang)` (simpan hanya jika lebih baik dari yang tersimpan), `getScore(profilId, gameId)`.
- Avatar: 6 ikon SVG dari `shared/avatars.js` (kucing, bebek, ikan, kelinci, mobil, bintang) — tanpa emoji.
- Alur pertama kali: jika `list()` kosong → dashboard menampilkan layar "Buat Profil" (input nama + pilih avatar; urusan orang tua). Setelah ada profil: baris avatar besar di atas dashboard — sentuh avatar = ganti profil aktif.
- Kartu game menampilkan bintang terbaik profil aktif: "⭐ 7/8".

## 5. Dashboard (UI)

- **Layar profil**: baris avatar `≥96px`; tombol "Buat Profil" jika kosong.
- **Layar game**: grid kartu besar `≥96px` (ikon SVG game + nama + bintang terbaik); sentuh kartu → TTS membacakan nama game ("Temukan Hewan!") → navigasi masuk.
- Konsisten dengan Temukan Hewan: `pointerdown` (sentuh + mouse), ikon SVG (tanpa ketergantungan emoji pada elemen fungsional), target sentuh ≥96px, TTS id-ID dengan fallback visual, efek Web Audio opsional (game tetap jalan tanpa suara).
- Semua aset inline (tanpa request jaringan).

## 6. Shared Modules & Error Handling

- `shared/audio.js`: hasil pindahan persis dari root — sudah memuat perbaikan: bind `root` via `globalThis` di dalam factory UMD, jadwalkan nada setelah `ctx.resume()` selesai, prime voice TTS + buang antrian macet. **Tidak ada perubahan fungsi** pada saat migrasi.
- `shared/avatars.js`: konstanta SVG murni.
- Pola UMD memakai `globalThis` — bug "root is not defined" tidak akan terulang.
- Audio/TTS gagal (API tidak ada, blokir autoplay, voice kosong) → permainan tetap penuh secara visual.

## 7. Game #1: Migrasi Temukan Hewan

- Pindahkan dari root → `games/temukan-hewan/` (mekanis):
  - `rounds.js`, `animals.js`, `audio.js` → `audio.js` dipindah ke `shared/` (bukan salinan local; satu sumber).
  - `game.js`, `style.css`, `index.html`, `tests/*` ikut pindah.
  - Sesuaikan path `<script>`/`<link>` di `games/temukan-hewan/index.html`: `../../shared/audio.js`.
  - Sesuaikan `require('../audio.js')` di tes → `require('../../shared/audio.js')`.
- Perilaku game **tidak berubah**; 12 tes lama tetap lulus.
- Komit migrasi terpisah sehingga mudah di-revert.

## 8. Roadmap Game

Setiap game = siklus spec → plan → implementasi sendiri (proses SDD seperti Temukan Hewan):

1. **Fondasi**: dashboard + migrasi Temukan Hewan (spec ini).
2. **Memory Match**: cocokkan kartu bergambar tersembunyi; 4–8 pasang sesuai usia.
3. **Sortir Bentuk & Warna**: kelompokkan benda berdasarkan bentuk/warna ("masukkan yang merah!").
4. **Berhitung**: ketuk 1..N dengan TTS ("satu… dua… tiga…").
5. **Ketuk Bola**: bola muncul acak, ketuk secepat mungkin.
6. **Puzzle gambar sederhana**: susun potongan jadi gambar utuh.
7. **Temukan (tema lain)**: mesin Temukan Hewan dengan kategori baru (buah, kendaraan, bentuk).

Urutan bisa disesuaikan; tiap game berjalan mandiri dan tidak bergantung pada game lain.

## 9. Kriteria Penerimaan (Fondasi)

1. `node --test` dari root: semua tes shared + game #1 lulus.
2. Buka `index.html` via `file://`: dashboard tampil tanpa error, tanpa request jaringan.
3. Alur: buat profil → pilih game Temukan Hewan → main 1 ronde → selesai → otomatis kembali ke dashboard → kartu menampilkan bintang terbaik.
4. Ganti profil → bintang tampil milik profil tersebut (terpisah antar profil).
5. localStorage diblokir (mode privat) → dashboard tetap jalan, tanpa simpan lintas sesi.
6. Semua elemen interaktif ≥96px; ikon SVG (tanpa emoji); pointerdown berfungsi.
7. Smoke tablet portrait 768×1024: tidak ada overflow horizontal.

## 10. Non-Tujuan (YAGNI)

- Tanpa server/backend/database; tanpa build tool; tanpa framework.
- Tanpa profil bergambar/foto; tanpa pengaturan per game di dashboard.
- Tanpa mode orang tua terenkripsi — pengaturan sesederhana layar "Buat Profil".
- Tanpa permainan multiplayer atau sinkronisasi antar perangkat.