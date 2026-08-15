# Desain: Sortir Bentuk & Warna — Game #4

> Fondasi: dashboard multi-game (master `74dc98a`). Game ini dibangun di atas `shared/` yang sudah ada dan mengikuti pola `games/temukan-hewan/`, `games/memory-match/`, `games/berhitung/`.

## 1. Tujuan

Game klasifikasi untuk anak 3–5 tahun: **sortir satu objek ke bin yang benar** — satu objek besar muncul, anak mengetuk bin (bentuk/warna) yang cocok. Melatih klasifikasi atribut visual (warna, lalu bentuk) dan kontrol impuls (lihat atribut sebelum mengetuk). Tema: bentuk geometris & warna primer (4 × 4 kombinasi).

## 2. Pengguna & Alur

- Anak (3–5) memilih game sendiri dari dashboard (kartu "Sortir Bentuk & Warna" muncul otomatis dari registri).
- Alur dalam game: **menu** ("Main Yuk!" + tombol suara) → **8 ronde sortir** → **layar akhir** → auto-return ke dashboard (±6 detik) atau tombol **"Lainnya?"**.
- Skor per profil: `Profiles.addScore('sortir-bentuk-warna', stars)` — tersimpan per anak; dashboard menampilkan "Bintang N/8".

## 3. Mekanik Ronde

- **8 ronde**; tiap ronde = deretan objek yang harus disortir semua. Ronde selesai = **1 bintang** → `maxStars: 8`.
- **Promosi per ronde** (atribut utama, jumlah bin, jumlah objek):

| Ronde | Atribut | Bin | Objek | Distraktor |
|---|---|---|---|---|
| 1 | warna | 2 (merah, biru) | 4 | bentuk konstan |
| 2 | warna | 2 (kuning, hijau) | 4 | bentuk konstan |
| 3 | warna | 3 (merah, kuning, biru) | 5 | bentuk konstan |
| 4 | warna | 4 (merah, biru, kuning, hijau) | 5 | bentuk konstan |
| 5 | bentuk | 2 (lingkaran, kotak) | 5 | warna bervariasi |
| 6 | bentuk | 3 (+segitiga) | 5 | warna bervariasi |
| 7 | bentuk | 4 (+bintang) | 5 | warna bervariasi |
| 8 | warna | 4 | 5 | bentuk bervariasi penuh |

- **Semua objek selalu punya bin yang cocok**: dalam ronde warna, objek hanya berisi warna target bin (bentuk lain sebagai variasi visual hanya di ronde 8); dalam ronde bentuk, warna objek bervariasi tetapi bin bentuk netral (abu-abu) → anak harus fokus struktur. Prinsip: anak selalu benar jika memahami atribut target — tidak ada konsep "objek tanpa bin".
- Urutan objek diacak tiap ronde (`shuffle` Fisher–Yates).

## 4. Interaksi Satu Objek

- Objek besar muncul di tengah-atas + **TTS menyebut atributnya** ("Merah!", "Lingkaran!").
- Ketuk **bin benar** → efek `ding` + objek mengecil (animasi "masuk bin", `#object.done`) + bin berdenyut + pujian TTS singkat ("Yeay!", "Betul!") → objek berikutnya.
- Ketuk **bin salah** → efek `wrong` + objek goyang (class `shake`) + TTS "Coba lagi!" → objek & bin tetap aktif (nol hukuman, anak boleh coba sampai benar).
- Guard: input objek dikunci selama transisi antar objek (~250 ms) agar double-tap tidak melompati objek; bin yang bukan bagian ronde tidak dirender.
- Semua objek selesai → `cheer` + overlay celebrasi (ronde 1–7) ringkas; ronde 8 → langsung layar akhir.
- Tanpa timer/tekanan waktu.

## 5. Layar Akhir

- Bintang SVG terisi sesuai skor (0–8), teks: "Sempurna! 🌟" (8/8), "Hebat sekali!" (≥5), "Mantap!" (≥3), "Ayo coba lagi!" (<3) — persis pola tiga game sebelumnya.
- `Profiles.addScore('sortir-bentuk-warna', state.stars)` + `setTimeout(backToDashboard, 6000)`; `clearTimeout` sebelum timer baru (pola hardening `db02a00`).
- Tombol "Lainnya?" → `../../index.html`.

## 6. Ikon & Aset

- **4 bentuk** (SVG, id huruf kecil): `circle` (Lingkaran), `square` (Kotak), `triangle` (Segitiga), `star` (Bintang).
- **4 warna** (id huruf kecil): `red` (Merah, `#E53935`), `blue` (Biru, `#1E88E5`), `yellow` (Kuning, `#F9A825`), `green` (Hijau, `#43A047`).
- **Objek** (`makeItem`): bentuk FILLED warna (fill = hex warna, stroke gelap `#4A3728` tebal 4) — inner markup tanpa tag `<svg>`; 16 kombinasi.
- **Bin warna**: lingkaran FILLED warna (blob) dengan stroke gelap; **bin bentuk**: bentuk stroke abu-abu netral (`#90A4AE` tebal 4, fill none) — konsisten lintas ronde sehingga anak belajar makna ikon bin.
- **Ikon fungsional = SVG, BUKAN emoji** (emoji hanya dekorasi teks).
- Tabel nama id-ID untuk TTS: "Merah!", "Biru!", "Kuning!", "Hijau!", "Lingkaran!", "Kotak!", "Segitiga!", "Bintang!"

## 7. Arsitektur & Integrasi

```
games/sortir-bentuk-warna/
├── index.html      # menu / ronde / overlay / layar akhir; script:
│                   # ../../shared/audio.js, ../../shared/profile.js, sorting.js, game.js
├── style.css       # objek besar, baris bin (wrap), goyang, overlay, layar akhir
├── sorting.js      # UMD-lite: SHAPES, COLORS, ROUNDS, makeItem, binIcon, matches, shuffle
├── game.js         # DOM + audio + TTS + skor + navigasi (pattern game #1–#3)
└── tests/
    └── sorting.test.js
```

- Registri: tambah entri `{id:'sortir-bentuk-warna', name:'Sortir Bentuk & Warna', maxStars:8, path:'games/sortir-bentuk-warna/index.html', icon:<3 bentuk kecil berwarna>}` → dashboard otomatis menampilkan kartu; tes integritas registri + dashboard.test.js otomatis mencakup game baru.
- Pola UMD-lite (`window.Sorting` + `module.exports`, TANPA ref `root.` di dalam factory); nol dependensi; berjalan dari `file://` dan `http://`; `pointerdown`; target ≥96px; TTS id-ID fallback senyap; `fx` HANYA kind yang ada (`pop`/`ding`/`wrong`/`cheer`) — **nol perubahan `shared/audio.js`**.

## 8. Batas Antar-Modul (kontrak)

- `Sorting.SHAPES[i]` → `{id, name, path}` (4; `path` = markup DALAM bentuk; `name` Indonesia; id: circle/square/triangle/star).
- `Sorting.COLORS[i]` → `{id, name, hex}` (4; id: red/blue/yellow/green).
- `Sorting.ROUNDS` → array 8 `{attr:'color'|'shape', bins:[id...], count:int}` persis tabel §3 (count 4 atau 5).
- `Sorting.makeItem(shapeId, colorId)` → `{shape, color, svg}`; `svg` = markup DALAM tanpa `<svg>`; fill = hex warna; memakai `SHAPES`/`COLORS` valid; input tak dikenal → null.
- `Sorting.binIcon(attr, id)` → string SVG lengkap **termasuk tag luarnya** (`<svg viewBox="0 0 48 48" role="img" aria-label="...">…</svg>`), siap dipakai sebagai innerHTML bin:
  - `attr='color'` → blob lingkaran filled warna; `attr='shape'` → bentuk stroke abu netral; id tak dikenal → null.
- `Sorting.matches(attr, item, binId)` → bool (`attr='color'` → `item.color === binId`; `attr='shape'` → `item.shape === binId`; item null → false).
- `Sorting.shuffle(arr)` → salinan teracak (Fisher–Yates; tidak mengubah input).
- `Sorting.isRoundDone(placed, count)` → bool (`count > 0 && placed >= count`).

## 9. Kriteria Penerimaan

1. `node --test` dari root: **≥42 tes lulus** (36 lama + ≥6 sorting).
2. Dashboard menampilkan kartu "Sortir Bentuk & Warna" (dari registri) dengan ikon; path file nyata (tes integritas).
3. Game jalan dari `file://` dan `http://`; 0 error konsol; 0 request jaringan non-lokal.
4. Alur penuh: pilih profil → buka game → "Main Yuk!" → 8 ronde (jumlah bin sesuai tabel §3: 2→2→3→4→2→3→4→4; semua objek tersortir; TTS atribut tiap objek) → layar akhir "Sempurna! 🌟" + 8 bintang + "Lainnya?" → auto-return ≤8 dtk → dashboard "Bintang 8/8".
5. Interaksi: bin benar → `ding` + objek hilang + pujian; bin salah → `wrong` + goyang + "Coba lagi" + objek tetap bisa dicoba; transisi antar objek terkunci ~250 ms; ronde selesai → `cheer`.
6. Target sentuh ≥96px (objek, bin, tombol); 4 bin muat di 768×1024 tanpa overflow; tidak ada tumpang-tindih visual.
7. Skor tersimpan per profil (fallback memori tetap jalan saat localStorage diblokir).
8. Auto-return + "Lainnya?" persis pola dashboard; `clearTimeout` timer lama sebelum membuat timer baru.

## 10. Non-Tujuan (YAGNI)

- Tidak ada timer/tekanan waktu.
- Tidak ada drag & drop (kontrol sekali sentuh).
- Tidak ada konsep "objek tanpa bin"/negasi (semua objek selalu punya jawaban).
- Tidak ada level di luar progresi 8 ronde; tidak ada skor efisiensi (selalu 1 bintang per ronde).
- Tidak ada multiplayer/statistik lanjutan.