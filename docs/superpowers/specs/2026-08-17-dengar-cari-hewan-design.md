# Dengar & Cari Hewan — Design Spec

**Tanggal:** 2026-08-17
**Status:** Disetujui lewat brainstorming (pilihan user di setiap titik keputusan)
**Cabang rencana:** `dengar-cari-hewan` (worktree `.worktrees/dengar-cari-hewan`)

## 1. Tujuan

Game ke-8 suite games-kay: kuis audio-first untuk usia 3–5. TTS membacakan
nama hewan ("Mana kucing?"), anak mengetuk gambar yang benar dari 2 pilihan
besar. Mengisi celah portofolio (belum ada game yang mengandalkan
pendengaran) dan memanfaatkan investasi cabang seni-suara: 12 aset
`Art.ANIMALS` (shared/art.js) dan TTS `GameAudio` dengan `pickIdVoice`
(shared/audio.js).

## 2. Keputusan yang terkunci (dari dialog brainstorming)

| Titik keputusan | Pilihan |
|---|---|
| Konsep | Dengar & Cari Hewan (audio-first) |
| Gaya prompt | Nama saja: "Mana \<nama\>?" |
| Jumlah pilihan | 2 per ronde, 8 ronde per sesi |
| Jawaban salah | Coba lagi tanpa penalti (goyang + TTS ulang) |
| Bintang | 1 bintang per ronde yang benar pada percobaan pertama (maks 8) |
| Pendekatan | Game baru mandiri `games/dengar-cari-hewan/` (opsi A) |

## 3. Arsitektur

Pola suite yang sudah terbukti (lihat temukan-hewan): logika murni terpisah
dari DOM, UMD dual-mode, offline penuh.

```
games/dengar-cari-hewan/
├── index.html            # layar: menu → ronde → celebrate → akhir
├── style.css             # bahasa visual suite
├── dengar.js             # logika murni (UMD): sesi, ronde, skor
├── game.js               # DOM, tap, TTS, animasi
└── tests/
    └── dengar.test.js    # node --test, logika murni
```

**Ketergantungan:** `dengar.js` tidak bergantung pada art.js/audio.js
(parameter id hewan diinjeksi) → testable di Node tanpa DOM. `game.js`
memakai `Art`, `Dengar`, `GameAudio`, `Profile`.

**Urutan script di index.html:**
`../../shared/art.js` → `dengar.js` → `../../shared/audio.js` →
`../../shared/profile.js` → `game.js`.

## 4. Komponen

### 4.1 dengar.js (logika murni)

UMD header pola suite (`module.exports = factory()` / `root.Dengar =
factory()`, factory tanpa argumen).

```
Dengar.makeSession(animalIds, nRounds) -> Array<Round>
```
- `nRounds` ronde (default dipakai 8); tiap ronde
  `{ targetId, choices }`.
- `choices`: 2 id unik — target + 1 distraktor; target ∈ choices;
  distraktor ≠ target.
- Target tidak sama dengan target ronde sebelumnya (selama
  `animalIds.length > 1`).
- Urutan acak (Math.random) — test memverifikasi properti, bukan urutan.

```
Dengar.generateRound(animalIds, prevTargetId) -> Round
```
Satu ronde tunggal dengan aturan yang sama (dipakai `makeSession` dan
tersedia untuk test/consumer lain).
```
Dengar.score(firstTry) -> 1 | 0
```
Benar percobaan pertama = 1; benar setelah coba lagi = 0.

### 4.2 game.js (DOM & interaksi)

- **Menu:** judul "Dengar & Cari Hewan 🎧", subtitle "Dengarkan, lalu ketuk
  hewannya!", tombol "Main Yuk!" (`GameAudio.enable()` + `primeVoices()`),
  toggle mute 🔇 pola suite.
- **Ronde:** grid 2 kolom, kartu besar (≥40% lebar layar) berisi
  `<svg viewBox="0 0 120 120">` + `Art.ANIMALS[id].svg`. Prompt otomatis
  tiap ronde: `GameAudio.speak('Mana ' + name + '?')` dengan `name` dari
  `Art.ANIMALS[targetId].name`. Tombol 🔊 besar di atas grid untuk mengulang
  prompt kapan saja.
- **Salah:** kartu yang diketuk goyang pelan (CSS `shake`),
  `GameAudio.fx('wrong')`, TTS mengulang prompt. Tanpa penalti; boleh coba
  lagi sampai benar.
- **Benar:** kartu target membesar + sorotan. Percobaan pertama → bintang ⭐
  + `fx('party')`; setelah coba lagi → pujian ringan + `fx('ding')`, tanpa
  bintang. Overlay "Yeay! 🎉" + tombol "Lanjut!" (overlay sama dengan
  percobaan pertama; hanya bintang dan fx yang berbeda).
- **Akhir (setelah ronde 8):** judul "Selesai!", deretan bintang (maks 8),
  `Profile.addScore`, tombol "Lainnya?" → sesi baru (urutan baru).

### 4.3 Registri

+1 entri di `shared/games-registry.js` (satu-satunya file shared yang
berubah — pola standar game baru):

```js
{
  id: 'dengar-cari-hewan',
  name: 'Dengar & Cari Hewan',
  maxStars: 8,
  path: 'games/dengar-cari-hewan/index.html',
  icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 18 h8 l10 -8 v28 l-10 -8 h-8 Z" fill="none" stroke="#1E88E5" stroke-width="4" stroke-linejoin="round"/><path d="M30 18 a8 8 0 0 1 0 12" fill="none" stroke="#F9A825" stroke-width="4" stroke-linecap="round"/><path d="M35 13 a15 15 0 0 1 0 22" fill="none" stroke="#F9A825" stroke-width="4" stroke-linecap="round"/></svg>'  // speaker + gelombang suara
}
```

## 5. Data flow

`Dengar.makeSession(ids dari Art.ANIMALS, 8)` → `game.js` render kartu via
`Art` → prompt/efek via `GameAudio.speak/fx` → skor via `Profile.addScore`.

12 id hewan: kucing, singa, anjing, kelinci, gajah, bebek, burung, ikan,
kura-kura, babi, sapi, katak.

## 6. Error handling

- TTS tanpa suara id-ID → `speak()` fallback aman (no-op tanpa crash);
  permainan tetap berjalan penuh secara visual, tombol 🔊 tetap tersedia.
- Id tak dikenal → `Art.FALLBACK` (console.error), tidak crash.
- Tanpa aset eksternal → offline `file://` penuh.

## 7. Testing

`tests/dengar.test.js` (node --test, logika murni):
1. `generateRound`: 2 pilihan unik; target ∈ choices; distraktor ≠ target.
2. `generateRound` dengan `prevTargetId`: target ≠ prev (selama >1 id).
3. `makeSession`: 8 ronde; semua id valid; tidak ada target kembar
   berurutan; tiap ronde punya tepat 2 pilihan unik.
4. `score(true) === 1`, `score(false) === 0`.

Verifikasi akhir: suite penuh (baseline 77 + test baru) + smoke CDP 3 fase
(file:// 1280×800, http 768×800, http 360×640) mencakup: menu → mulai →
prompt TTS terpanggil (speechSynthesis stub/mock di CDP), tap salah →
goyang + prompt ulang, tap benar → bintang/celebrate, 8 ronde → layar akhir
+ skor tersimpan.

## 8. Non-goals

- Suara hewan/onomatope, prompt campuran (ciri fisik).
- Difficulty adaptif, jumlah pilihan >2.
- Perubahan shared/art.js, shared/audio.js, shared/profile.js.
- Game lain: 7 game existing tidak disentuh.
