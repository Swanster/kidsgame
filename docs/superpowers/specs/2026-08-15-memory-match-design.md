# Desain: Memory Match (Kendaraan) — Game #2

> Fondasi: dashboard multi-game (commit `db02a00`, master). Game ini dibangun di atas `shared/` yang sudah ada dan mengikuti pola `games/temukan-hewan/`.

## 1. Tujuan

Game memori klasik untuk anak 3–5 tahun: buka pasangan kartu kendaraan sampai semua papan selesai. Melatih fokus, konsentrasi, dan ingatan visual. Tema kendaraan (pilihan user) — beda dari game #1 yang hewan.

## 2. Pengguna & Alur

- Anak (3–5) memilih game sendiri dari dashboard (kartu "Memory Match" muncul otomatis dari registri).
- Alur dalam game: **menu** ("Main Yuk!" + tombol suara) → **8 ronde memori** → **layar akhir** → auto-return ke dashboard (±6 detik) atau tombol **"Lainnya?"**.
- Skor per profil: `Profiles.addScore('memory-match', stars)` — tersimpan per anak; dashboard menampilkan "Bintang N/8".

## 3. Aturan Ronde

- **8 ronde**; tiap ronde = 1 papan yang harus dituntaskan. Papan selesai = **1 bintang** → `maxStars: 8`.
- Progresi pasangan per ronde: **2, 3, 4, 4, 5, 5, 6, 6** → kartu: 4, 6, 8, 8, 10, 10, 12, 12.
- Grid: ronde 1–2 2×2/2×3, ronde 3–4 2×4, ronde 5–6 2×5, ronde 7–8 3×4 (3 baris 4 kolom; aman di tablet portrait).
- Posisi kartu diacak setiap ronde (`shuffle` — Fisher–Yates).

## 4. Mekanik Kartu

- Kartu tertutup (punggung SVG kendaraan netral). Ketuk → terbuka + efek suara flip.
- Ketuk kedua:
  - **Cocok** → dua kartu terbuka & terkunci; suara sukses; **TTS menyebut nama kendaraan** (id-ID, mis. "Mobil!"). Cocok terakhir di papan → papan selesai.
  - **Tidak cocok** → delay ~700 ms → kedua kartu tertutup kembali; suara lembut (tidak menghukum).
- Guard input (anti-frustrasi anak):
  - Kartu yang sudah cocok / sedang terbuka / kartu yang sama ditekan dua kali → diabaikan.
  - Selama 2 kartu sedang terbuka (fase cek), semua input kartu dikunci.
- Papan selesai → overlay celebrasi ("Yeay! 🎉" + confetti + tombol "Lanjut!"), pola sama Temukan Hewan.

## 5. Layar Akhir

- Bintang SVG terisi sesuai skor (0–8), teks: "Sempurna! 🌟" (8/8), "Hebat sekali!" (≥5), "Mantap!" (≥3), "Ayo coba lagi!" (<3) — persis pola Temukan Hewan.
- `Profiles.addScore('memory-match', state.stars)` + `setTimeout(backToDashboard, 6000)`; `clearTimeout` sebelum timer baru (pola hardening `db02a00`).
- Tombol "Lainnya?" → `../../index.html`.

## 6. Ikon & Aset

- **8 kendaraan** (SVG inline, warna cerah, unik, id huruf kecil): `car` (mobil), `train` (kereta), `plane` (pesawat), `ship` (kapal), `bike` (sepeda), `tractor` (traktor), `bus` (bus), `helicopter` (helikopter).
- Punggung kartu: satu SVG netral di semua kartu.
- **Ikon fungsional = SVG, BUKAN emoji** (emoji hanya dekorasi teks, pola 🐾 yang sudah ada).
- Tabel nama id-ID untuk TTS: "Mobil!", "Kereta!", "Pesawat!", "Kapal!", "Sepeda!", "Traktor!", "Bus!", "Helikopter!".

## 7. Arsitektur & Integrasi

```
games/memory-match/
├── index.html      # menu / papan / layar akhir; script: vehicles.js, memory.js,
│                   # ../../shared/audio.js, ../../shared/profile.js, game.js
├── style.css       # grid kartu, overlay celebrasi, layar akhir (pola game #1)
├── vehicles.js     # UMD-lite: VEHICLES = 8 × {id, name, svg}; pure, tesable
├── memory.js       # UMD-lite: logic murni (buildBoard, shuffle, match check); tesable
├── game.js         # DOM + audio + TTS + skor + navigasi (pattern game #1)
└── tests/
    ├── vehicles.test.js
    └── memory.test.js
```

- Registri: tambah entri `{id:'memory-match', name:'Memory Match', maxStars:8, path:'games/memory-match/index.html', icon:<svg mobil>}` → dashboard otomatis menampilkan kartu; tes integritas registri + dashboard.test.js otomatis mencakup game baru (path `fs.existsSync`, halaman memuat `../../shared/audio.js` + `../../shared/profile.js`).
- Pola UMD-lite (`window.X` + `module.exports`); nol dependensi; berjalan dari `file://` dan `http://`; `pointerdown`; target ≥96px; TTS id-ID fallback senyap.

## 8. Batas Antar-Modul (kontrak)

- `Memory.buildBoard(pairs)` → array kartu `[{pair, id}]` panjang `2*pairs` (id unik, pair 0..pairs-1, tiap pair tepat 2 kartu).
- `Memory.shuffle(arr)` → salinan teracak (Fisher–Yates; tidak mengubah input).
- `Memory.isMatch(cardA, cardB)` → bool (pair sama).
- `Memory.boardDone(state)` → bool (semua pasangan ditemukan) — state `{found: Set|array}`.
- `VEHICLES[i]` → `{id, name, svg}`; id unik; `name` = label Indonesia (dipakai TTS + teks).

## 9. Kriteria Penerimaan

1. `node --test` dari root: **≥28 tes lulus** (24 lama + vehicles ~2 + memory ~4).
2. Dashboard menampilkan kartu "Memory Match" (dari registri) dengan ikon kendaraan; path file nyata (tes integritas).
3. Game jalan dari `file://` dan `http://`; 0 error konsol; 0 request jaringan non-lokal.
4. Alur penuh: pilih profil → buka Memory Match → "Main Yuk!" → 8 ronde (ronde 1 = 4 kartu, ronde 8 = 12 kartu; semua papan selesai) → layar akhir "Sempurna! 🌟" + 8 bintang + "Lainnya?" → auto-return ≤8 dtk → dashboard "Bintang 8/8".
5. Interaksi: cocok membuka & mengunci pasangan + TTS nama; tidak cocok menutup kembali ~700 ms; kartu terkunci/tidak valid diabaikan; input dikunci saat cek.
6. Target sentuh ≥96px (kartu dan tombol); grid maksimal 3 kolom di 768×1024; tidak ada overflow horizontal tablet portrait.
7. Skor tersimpan per profil (fallback memori tetap jalan saat localStorage diblokir).
8. Auto-return + "Lainnya?" persis pola dashboard; `clearTimeout` timer lama sebelum membuat timer baru.

## 10. Non-Tujuan (YAGNI)

- Tidak ada timer/tekanan waktu.
- Tidak ada level/skema kesulitan di luar progresi 8 ronde.
- Tidak ada animasi flip 3D mewah/efek berlebihan (fokus: keterbacaan).
- Tidak ada skor berbasis efisiensi (selalu 1 bintang per papan; anak dihargai karena menyelesaikan, bukan karena cepat).
- Tidak ada multiplayer/statistik lanjutan.