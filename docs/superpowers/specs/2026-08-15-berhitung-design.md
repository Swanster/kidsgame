# Desain: Berhitung (Balon) — Game #3

> Fondasi: dashboard multi-game (master `d606bbc`). Game ini dibangun di atas `shared/` yang sudah ada dan mengikuti pola `games/temukan-hewan/` + `games/memory-match/`.

## 1. Tujuan

Game berhitung untuk anak 3–5 tahun: **hitung dengan mengetuk** — objek (balon) tersebar di layar, anak mengetuk satu per satu sambil mendengar angka disebut dengan suara. Melatih korespondensi satu-ke-satu (satu ketukan = satu objek = satu angka) dan rasa jumlah. Tema **balon** (8 warna kontras; bentuk identik → fokus pada jumlah, bukan bentuk).

## 2. Pengguna & Alur

- Anak (3–5) memilih game sendiri dari dashboard (kartu "Berhitung" muncul otomatis dari registri).
- Alur dalam game: **menu** ("Main Yuk!" + tombol suara) → **8 ronde hitung** → **layar akhir** → auto-return ke dashboard (±6 detik) atau tombol **"Lainnya?"**.
- Skor per profil: `Profiles.addScore('berhitung', stars)` — tersimpan per anak; dashboard menampilkan "Bintang N/8".

## 3. Aturan Ronde

- **8 ronde**; tiap ronde = kerumunan balon yang harus **semua** diketuk. Ronde selesai = **1 bintang** → `maxStars: 8`.
- Progresi jumlah balon per ronde: **1, 2, 3, 4, 5, 6, 7, 8** (`OBJECTS_PER_ROUND`).
- Posisi balon: template deterministik per jumlah (tidak pernah saling menimpa; margin aman; memenuhi area bermain). Urutan balon di kerumunan diacak tiap ronde (`shuffle` Fisher–Yates) → variasi antar sesi, penempatan tetap aman.

## 4. Mekanik Ketuk

- Ketuk balon **belum diketuk** → balon meredup (opacity + sedikit mengecil; tetap terlihat → sisa yang belum dihitung jelas) + efek suara `pop` + **TTS menyebut angka** (id-ID: "satu", "dua", …) + penghitung naik.
- Ketuk balon **sudah** → diabaikan (guard). Ketuk **area kosong** → diabaikan — nol hukuman, nol frustrasi.
- Semua balon diketuk → ronde selesai: efek suara `cheer` + TTS **"Hebat! Ada N balon!"** + overlay celebrasi ringkas (pattern game sebelumnya; ronde 1–7) → tombol **"Lanjut"**; ronde 8 → langsung layar akhir.
- Overlay celebrasi menampilkan **digit besar N** + kata angka ("tiga") — jembatan tak menuntut dari jumlah ke simbol.
- Tanpa timer/tekanan waktu.

## 5. Layar Akhir

- Bintang SVG terisi sesuai skor (0–8), teks: "Sempurna! 🌟" (8/8), "Hebat sekali!" (≥5), "Mantap!" (≥3), "Ayo coba lagi!" (<3) — persis pola Temukan Hewan/Memory Match.
- `Profiles.addScore('berhitung', state.stars)` + `setTimeout(backToDashboard, 6000)`; `clearTimeout` sebelum timer baru (pola hardening `db02a00`).
- Tombol "Lainnya?" → `../../index.html`.

## 6. Ikon & Aset

- **8 balon** (SVG inline, warna kontras cerah, id huruf kecil): `red` (merah), `orange` (oranye), `yellow` (kuning), `green` (hijau), `blue` (biru), `purple` (ungu), `pink` (pink), `teal` (toska). Bentuk identik (lingkaran balon + simpul + tali) — pembeda = warna.
- **Ikon fungsional = SVG, BUKAN emoji** (emoji hanya dekorasi teks).
- Tabel kata angka id-ID untuk TTS: `satu, dua, tiga, empat, lima, enam, tujuh, delapan` (di `game.js`).

## 7. Arsitektur & Integrasi

```
games/berhitung/
├── index.html      # menu / papan ronde / overlay / layar akhir; script:
│                   # ../../shared/audio.js, ../../shared/profile.js, counting.js, game.js
├── style.css       # area bermain (posisi abs. %), balon, penghitung, overlay, layar akhir
├── counting.js     # UMD-lite: BALLOONS + OBJECTS_PER_ROUND + layout + shuffle + isDone
├── game.js         # DOM + audio + TTS + skor + navigasi (pattern game #1/#2)
└── tests/
    └── counting.test.js
```

- Registri: tambah entri `{id:'berhitung', name:'Berhitung', maxStars:8, path:'games/berhitung/index.html', icon:<svg balon>}` → dashboard otomatis menampilkan kartu; tes integritas registri + dashboard.test.js otomatis mencakup game baru.
- Pola UMD-lite (`window.X` + `module.exports`, TANPA ref `root.` di dalam factory); nol dependensi; berjalan dari `file://` dan `http://`; `pointerdown`; target ≥96px; TTS id-ID fallback senyap; `fx` HANYA kind yang ada (`pop`/`ding`/`wrong`/`cheer`) — **nol perubahan `shared/audio.js`**.

## 8. Batas Antar-Modul (kontrak)

- `Counting.OBJECTS_PER_ROUND` → `[1,2,3,4,5,6,7,8]`.
- `Counting.BALLOONS[i]` → `{id, name, svg}` (8 entry; id unik; `svg` = markup DALAM tanpa tag `<svg>`; `name` = label warna Indonesia).
- `Counting.layout(count)` → array `count` posisi `{x,y,s}` (x,y = kiri-atas 0..100 persen area; s = ukuran relatif; tanpa tumpang-tindih antar posisi; dalam batas aman 0..100) — deterministik.
- `Counting.shuffle(arr)` → salinan teracak (Fisher–Yates; tidak mengubah input).
- `Counting.isDone(tapped, total)` → bool (total > 0; selesai ⩔ tapped ≥ total).

## 9. Kriteria Penerimaan

1. `node --test` dari root: **≥34 tes lulus** (30 lama + ≥4 counting).
2. Dashboard menampilkan kartu "Berhitung" (dari registri) dengan ikon balon; path file nyata (tes integritas).
3. Game jalan dari `file://` dan `http://`; 0 error konsol; 0 request jaringan non-lokal.
4. Alur penuh: pilih profil → buka Berhitung → "Main Yuk!" → 8 ronde (1..8 balon; semua balon diketuk tiap ronde; penghitung naik 1..N) → layar akhir "Sempurna! 🌟" + 8 bintang + "Lainnya?" → auto-return ≤8 dtk → dashboard "Bintang 8/8".
5. Interaksi: tap balon → `pop` + TTS angka + balon meredup; tap ganda/area kosong diabaikan; ronde selesai → `cheer` + overlay digit besar + TTS "Hebat! Ada N balon!".
6. Target sentuh ≥96px (balon dan tombol); tidak ada overflow horizontal di 768×1024; balon tidak saling menimpa di semua ronde 1–8.
7. Skor tersimpan per profil (fallback memori tetap jalan saat localStorage diblokir).
8. Auto-return + "Lainnya?" persis pola dashboard; `clearTimeout` timer lama sebelum membuat timer baru.

## 10. Non-Tujuan (YAGNI)

- Tidak ada timer/tekanan waktu.
- Tidak ada mekanik pilih-angka/deret angka (bisa jadi game terpisah).
- Tidak ada drag/geser (kontrol sekali sentuh).
- Tidak ada level di luar progresi 8 ronde; tidak ada skor efisiensi (selalu 1 bintang per ronde).
- Tidak ada multiplayer/statistik lanjutan.