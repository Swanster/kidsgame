# Desain: Temukan Hewan — Game Melatih Fokus untuk Anak 4 Tahun

Tanggal: 2026-08-15
Status: Draf (menunggu review pengguna)

## Ringkasan

Game web berbasis visual search ("temukan semua hewan target di antara pengganggu") yang dirancang untuk melatih fokus anak usia 4 tahun. Tanpa framework, tanpa build step, tanpa aset eksternal — cukup buka `index.html` di browser dan langsung main.

## Tujuan & Kriteria Sukses

- Anak mampu menyelesaikan 1 sesi (8 ronde, ±3-5 menit) dengan sedikit atau tanpa bantuan orang dewasa.
- Kesulitan naik perlahan: setiap ronde tetap bisa diselesaikan anak (rasio sukses tinggi), makin lama makin menuntut atensi.
- Game berfungsi penuh di tablet/HP (sentuh) dan komputer (mouse/klik).
- Load instan, tanpa jaringan, tanpa instalasi.

## Aturan Main (Core Loop)

1. **Layar mulai**: tombol besar "Main Yuk!" dan toggle suara. Ketukan pertama ini sekaligus membuka blokir audio (kebijakan autoplay browser).
2. **Perintah ronde**: TTS id-ID membacakan *"Ketuk semua kucing!"*. Target selalu tampil visual: teks nama + ikon hewan besar di panel atas sebagai pengingat (anak belum bisa baca).
3. **Grid kartu**: campuran kartu hewan target dan pengganggu.
4. **Ketukan benar**: bunyi "ding" + kartu bereaksi (goyang + bintang) + sesekali pujian TTS ("Hebat!", "Keren!").
5. **Ketukan salah**: bunyi lembut + kartu bergetar sesaat. Tanpa hukuman, tanpa timer — tekanan waktu kontraproduktif untuk anak dengan atensi rendah.
6. **Semua target ditemukan** → "Yeay! 🎉" + confetti (animasi CSS) → ronde berikutnya.

## Ramping Kesulitan

| Ronde | Jumlah kartu | Jumlah target | Karakter pengganggu |
|-------|-------------|---------------|---------------------|
| 1-2   | 6           | 2-3           | Sangat berbeda (kucing di antara gajah, singa, burung) |
| 3-5   | 8           | 2             | Cukup berbeda (kucing di antara kelinci, bebek, babi) |
| 6-8   | 12          | 3             | Menguji atensi (kucing di antara singa/kucing lain yang mirip) |

1 sesi = 8 ronde tetap (konsisten agar anak bisa membandingkan hasil antar sesi). Layar akhir: bintang + tombol "Main Lagi?". Aturan bintang: 1 bintang per ronde yang diselesaikan tanpa ketukan salah (maksimal 8 bintang).

## Hewan

8-10 hewan digambar sebagai SVG kartun inline (`<symbol>`): kucing, anjing, kelinci, bebek, babi, sapi, singa, gajah, burung, katak. Gaya flat dengan warna cerah; berukuran besar; margin tombol minimal ~96px agar mudah ditepuk jari anak.

## Arsitektur

```
games-kay/
├── index.html      # layout + definisi SVG hewan
├── style.css       # styling, animasi (wiggle, confetti), grid responsif
├── animals.js      # data hewan: SVG, nama Indonesia, kategori visual
├── game.js         # state machine: menu → ronde → feedback → transisi → selesai
└── audio.js        # pembungkus TTS (id-ID) + efek Web Audio (oscillator)
```

- **State machine**: objek `GameState` sederhana + satu fungsi `render()` per state.
- **Konfigurasi ronde**: data `ROUNDS[]` (hewan, ukuran grid, jumlah target, tingkat kemiripan) — bukan logika. Mudah disesuaikan tanpa mengubah kode.
- **Input**: `pointerdown` — menyatukan sentuh dan mouse tanpa logika terpisah.

## Suara & Fallback

- TTS: `speechSynthesis` dengan lang `id-ID`. Jika voice id-ID tidak tersedia, game tetap berfungsi penuh karena instruksi selalu tampil visual (teks + ikon).
- Efek suara: Web Audio API (oscillator) untuk ding, pop, ketukan salah, pujian.
- Gagal audio apa pun → mode senyap diam-diam; toggle volume tetap tersedia.

## Error Handling

- Autoplay policy: semua audio dimulai hanya setelah gestur pengguna (tombol mulai).
- TTS unavailable → mode diam, visual tetap lengkap.
- Render ronde dijamin valid: jumlah target selalu < jumlah kartu pengganggu (periksa di generasi ronde).

## Testing

- Smoke test manual di browser: mainkan 3+ ronde; verifikasi TTS, ketukan benar/salah, transisi ronde, layar akhir, dan tampilan responsif (ukuran tablet portrait & desktop).
- Logika murni (generasi ronde, validitas konfigurasi) diekstrak ke fungsi murni dan diuji dengan `node --test` tanpa browser.
- Verifikasi loading instan: buka file langsung (`file://`) tanpa server.

## Non-Goals (YAGNI)

- Tanpa skor, tanpa leaderboard, tanpa timer, tanpa akun/login.
- Tanpa mode tambahan (Simon says, tebak suara, dll.) — satu mekanik inti dulu.
- Tanpa aset gambar/suara eksternal; tanpa backend; tanpa build tooling.