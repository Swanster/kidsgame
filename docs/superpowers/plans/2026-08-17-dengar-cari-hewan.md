# Dengar & Cari Hewan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Game ke-8 suite games-kay: kuis audio-first — TTS membacakan nama hewan, anak mengetuk gambar yang benar dari 2 pilihan; offline penuh, `maxStars: 8`.

**Architecture:** Logika murni `dengar.js` (UMD-lite, tanpa DOM) terpisah dari `game.js` (DOM, pointerdown, TTS, animasi). Aset langsung dari `Art.ANIMALS`; suara via `GameAudio`; skor via `Profiles.addScore`; registri mendapat satu entri baru.

**Tech Stack:** Vanilla JS ES5, node:test, node:assert, CDP Node >=22 + google-chrome headless.

**Spec:** `docs/superpowers/specs/2026-08-17-dengar-cari-hewan-design.md`

## Global Constraints

- Fully offline (`file://` + `http://`), tanpa aset eksternal dan tanpa rekaman suara.
- UMD header factory tanpa argumen: CommonJS `module.exports = factory()` dan browser `root.X = factory()`.
- Semua kontrol game mengikat `pointerdown`, bukan `click`.
- Kartu hewan membungkus inner SVG dalam `<svg viewBox="0 0 120 120">`.
- UI dan prompt berbahasa Indonesia; prompt tepat `Mana <nama>?`.
- Pilihan selalu 2; 8 ronde; bintang hanya untuk jawaban benar pada percobaan pertama.
- Salah: tanpa penalti ronde, kartu goyang, `fx('wrong')`, prompt diulang; benar setelah retry memakai `fx('ding')`; benar pertama memakai `fx('party')`.
- Hanya file game baru dan `shared/games-registry.js` boleh berubah; `shared/art.js`, `shared/audio.js`, `shared/profile.js`, tujuh game existing, `avatars.js` tidak diubah.
- Baseline suite 77/77 wajib tetap hijau.
- Worktree implementasi: `.worktrees/dengar-cari-hewan`, branch `dengar-cari-hewan`.

---

## File Map

- Create: `games/dengar-cari-hewan/dengar.js` — logika ronde/sesi/skor.
- Create: `games/dengar-cari-hewan/tests/dengar.test.js` — kontrak logika murni.
- Create: `games/dengar-cari-hewan/index.html` — empat state layar.
- Create: `games/dengar-cari-hewan/style.css` — bahasa visual suite, grid dua kartu.
- Create: `games/dengar-cari-hewan/game.js` — DOM, audio, feedback, profile.
- Modify: `shared/games-registry.js` — satu objek game baru.
- Create outside repo: `/tmp/smoke-dengar-cari-hewan.mjs` — smoke CDP mandiri.

---

## Task 1: Logika murni ronde, sesi, dan skor

**Files:**
- Create: `games/dengar-cari-hewan/dengar.js`
- Create: `games/dengar-cari-hewan/tests/dengar.test.js`

**Produces:** `Dengar.TOTAL_ROUNDS === 8`, `Dengar.generateRound(animalIds, prevTargetId)`, `Dengar.makeSession(animalIds, nRounds)`, dan `Dengar.score(firstTry)`.

### Step 1: Write failing tests

```js
const test = require('node:test');
const assert = require('node:assert');
const Dengar = require('../dengar.js');

const IDS = ['kucing', 'singa', 'anjing', 'kelinci', 'gajah', 'bebek',
  'burung', 'ikan', 'kura-kura', 'babi', 'sapi', 'katak'];

test('generateRound menghasilkan dua pilihan unik dan target termasuk', () => {
  for (let i = 0; i < 50; i++) {
    const r = Dengar.generateRound(IDS, null);
    assert.strictEqual(r.choices.length, 2);
    assert.strictEqual(new Set(r.choices).size, 2);
    assert.ok(r.choices.includes(r.targetId));
    assert.ok(IDS.includes(r.targetId));
  }
});

test('generateRound menghindari target sebelumnya bila memungkinkan', () => {
  for (let i = 0; i < 50; i++) {
    assert.notStrictEqual(Dengar.generateRound(IDS, 'kucing').targetId, 'kucing');
  }
});

test('generateRound menolak pool kurang dari dua id', () => {
  assert.throws(() => Dengar.generateRound([], null), RangeError);
  assert.throws(() => Dengar.generateRound(['kucing'], null), RangeError);
});

test('makeSession menghasilkan delapan ronde valid tanpa target berurutan sama', () => {
  const session = Dengar.makeSession(IDS, 8);
  assert.strictEqual(session.length, 8);
  session.forEach((r, i) => {
    assert.ok(IDS.includes(r.targetId));
    assert.strictEqual(r.choices.length, 2);
    assert.strictEqual(new Set(r.choices).size, 2);
    assert.ok(r.choices.includes(r.targetId));
    if (i > 0) assert.notStrictEqual(r.targetId, session[i - 1].targetId);
  });
});

test('makeSession menerima jumlah ronde custom dan default delapan', () => {
  assert.strictEqual(Dengar.makeSession(IDS, 3).length, 3);
  assert.strictEqual(Dengar.makeSession(IDS).length, 8);
});

test('score memberi bintang hanya pada percobaan pertama', () => {
  assert.strictEqual(Dengar.score(true), 1);
  assert.strictEqual(Dengar.score(false), 0);
});
```

### Step 2: Run tests and confirm failure

Run: `node --test games/dengar-cari-hewan/tests/dengar.test.js`
Expected: FAIL because `../dengar.js` does not exist yet.

### Step 3: Implement minimal logic

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Dengar = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOTAL_ROUNDS = 8;

  function pick(ids) {
    return ids[Math.floor(Math.random() * ids.length)];
  }

  function generateRound(animalIds, prevTargetId) {
    if (!animalIds || animalIds.length < 2) {
      throw new RangeError('generateRound membutuhkan minimal dua animalIds');
    }
    var targetPool = animalIds;
    if (prevTargetId != null) {
      targetPool = animalIds.filter(function (id) { return id !== prevTargetId; });
    }
    var targetId = pick(targetPool);
    var distractors = animalIds.filter(function (id) { return id !== targetId; });
    var distractorId = pick(distractors);
    var choices = Math.random() < 0.5
      ? [targetId, distractorId]
      : [distractorId, targetId];
    return { targetId: targetId, choices: choices };
  }

  function makeSession(animalIds, nRounds) {
    var count = nRounds == null ? TOTAL_ROUNDS : nRounds;
    var rounds = [];
    var previous = null;
    for (var i = 0; i < count; i++) {
      var round = generateRound(animalIds, previous);
      rounds.push(round);
      previous = round.targetId;
    }
    return rounds;
  }

  function score(firstTry) { return firstTry ? 1 : 0; }

  return {
    TOTAL_ROUNDS: TOTAL_ROUNDS,
    generateRound: generateRound,
    makeSession: makeSession,
    score: score
  };
});
```

### Step 4: Run tests and commit

Run: `node --test games/dengar-cari-hewan/tests/dengar.test.js` — Expected: 6/6 pass.
Run: `node --test` — Expected: baseline 77 plus 6 new tests, 83 pass, 0 fail.
Commit: `git add games/dengar-cari-hewan/dengar.js games/dengar-cari-hewan/tests/dengar.test.js && git commit -m "feat: add dengar-cari-hewan pure game logic"`

---

## Task 2: UI, DOM wiring, TTS, dan registri

**Files:**
- Create: `games/dengar-cari-hewan/index.html`
- Create: `games/dengar-cari-hewan/style.css`
- Create: `games/dengar-cari-hewan/game.js`
- Modify: `shared/games-registry.js` — append satu objek ke `GAMES` sebelum penutup array.

**Consumes:** `Dengar.TOTAL_ROUNDS`, `Dengar.makeSession`, `Dengar.score` dari Task 1; `Art.ANIMALS`/`Art.animalSvg`; `GameAudio.speak`, `fx`, `unlock`, `setMuted`, `isMuted`; `Profiles.addScore`.

**Produces:** halaman playable di `games/dengar-cari-hewan/index.html`; seluruh kontrol memakai `pointerdown`; kartu selalu membungkus seni dengan `viewBox="0 0 120 120"`; prompt exact `Mana <nama>?`.

### Step 1: Create the HTML shell

Create `games/dengar-cari-hewan/index.html`:

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dengar &amp; Cari Hewan 🎧</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <section id="menu" class="screen">
    <h1 class="title">Dengar &amp; Cari Hewan 🎧</h1>
    <p class="subtitle">Dengarkan, lalu ketuk hewannya!</p>
    <button id="btn-start" class="btn-big">Main Yuk!</button>
    <button id="btn-sound" class="btn-sound" aria-label="Suara">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
    </button>
  </section>

  <section id="round-screen" class="screen hidden">
    <button id="btn-prompt" class="btn-prompt" aria-label="Ulangi suara">🔊</button>
    <main id="grid" class="grid"></main>
  </section>

  <div id="celebrate" class="overlay hidden">
    <div id="confetti" class="confetti"></div>
    <p id="celebrate-msg" class="celebrate-msg">Yeay! 🎉</p>
    <button id="btn-celebrate" class="btn-big">Lanjut!</button>
  </div>

  <section id="end-screen" class="screen hidden">
    <h2 id="end-title" class="end-title">Selesai!</h2>
    <div id="stars" class="stars"></div>
    <button id="btn-again" class="btn-big">Lainnya?</button>
  </section>

  <script src="../../shared/art.js"></script>
  <script src="dengar.js"></script>
  <script src="../../shared/audio.js"></script>
  <script src="../../shared/profile.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

### Step 2: Create the visual language

Create `style.css` using the existing `games/temukan-hewan/style.css` tokens and animations. Keep the same `:root`, body, `.screen`, `.hidden`, `.title`, `.subtitle`, `.btn-big`, `.btn-sound`, overlay, confetti, and star rules. Use these game-specific rules:

```css
.btn-prompt {
  font-size: 3.4rem;
  line-height: 1;
  width: 120px;
  height: 120px;
  border: none;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 6px 16px rgba(74, 55, 40, 0.25);
  cursor: pointer;
  transition: transform 0.1s ease;
}
.btn-prompt:active { transform: scale(0.92); }

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
  max-width: 560px;
  padding: 8px;
}

.card {
  background: var(--card);
  border-radius: 24px;
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(74, 55, 40, 0.15);
  transition: transform 0.12s ease;
}
.card svg { width: 100%; height: 100%; }
.card:active { transform: scale(0.94); }
.card.correct {
  box-shadow: 0 0 0 6px var(--ok) inset;
  background: #F3FBE8;
  transform: scale(1.05);
}
.card.shake { animation: shake 0.35s ease; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-4px); }
}
```

At narrow widths, retain two columns; the `minmax(0, 1fr)` cards remain large and the page stays within the viewport.

### Step 3: Wire DOM and audio

Create `games/dengar-cari-hewan/game.js`:

```js
(function (root) {
  'use strict';

  var Art = root.Art;
  var Dengar = root.Dengar;
  var GameAudio = root.GameAudio;
  var PRIDE = ['Hebat!', 'Keren!', 'Luar biasa!', 'Pintar!'];
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ANIMAL_IDS = Art.ANIMALS.map(function (a) { return a.id; });

  var els = {};
  var returnTimer = null;
  var state = { screen: 'menu', session: [], roundIndex: 0, stars: 0, firstTry: true, locked: false };

  function $(id) { return document.getElementById(id); }
  function animalOf(id) {
    return Art.ANIMALS.filter(function (a) { return a.id === id; })[0] || null;
  }
  function promptText() {
    return 'Mana ' + animalOf(state.session[state.roundIndex].targetId).name + '?';
  }
  function svgOf(id) {
    var animal = animalOf(id);
    return '<svg viewBox="0 0 120 120" role="img" aria-label="' + animal.name + '">' +
      (animal ? animal.svg : Art.animalSvg(id)) + '</svg>';
  }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.endScreen = $('end-screen');
    els.celebrate = $('celebrate');
    els.grid = $('grid');
    els.stars = $('stars');
    els.endTitle = $('end-title');
    $('btn-start').addEventListener('pointerdown', startSession);
    $('btn-again').addEventListener('pointerdown', startSession);
    $('btn-celebrate').addEventListener('pointerdown', continueAfterCelebrate);
    $('btn-sound').addEventListener('pointerdown', toggleSound);
    $('btn-prompt').addEventListener('pointerdown', repeatPrompt);
    render('menu');
  }

  function toggleSound() {
    GameAudio.setMuted(!GameAudio.isMuted());
    $('btn-sound').innerHTML = GameAudio.isMuted() ? ICON_MUTED : ICON_SOUND;
    if (!GameAudio.isMuted()) GameAudio.unlock();
  }

  function startSession() {
    clearTimeout(returnTimer);
    GameAudio.unlock();
    state.session = Dengar.makeSession(ANIMAL_IDS, Dengar.TOTAL_ROUNDS);
    state.roundIndex = 0;
    state.stars = 0;
    startRound();
  }

  function startRound() {
    state.firstTry = true;
    state.locked = false;
    render('round');
    GameAudio.speak(promptText());
  }
  function repeatPrompt() {
    if (state.screen === 'round') GameAudio.speak(promptText());
  }
  function render(screen) {
    state.screen = screen;
    els.menu.classList.toggle('hidden', screen !== 'menu');
    els.roundScreen.classList.toggle('hidden', screen !== 'round');
    els.endScreen.classList.toggle('hidden', screen !== 'end');
    els.celebrate.classList.add('hidden');
    if (screen === 'round') renderGrid();
    if (screen === 'end') renderEnd();
  }
  function renderGrid() {
    els.grid.innerHTML = '';
    state.session[state.roundIndex].choices.forEach(function (id) {
      var el = document.createElement('div');
      el.className = 'card';
      el.dataset.animalId = id;
      el.innerHTML = svgOf(id);
      el.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onCardTap(el, id);
      });
      els.grid.appendChild(el);
    });
  }
  function onCardTap(el, id) {
    if (state.screen !== 'round' || state.locked) return;
    if (id === state.session[state.roundIndex].targetId) {
      state.locked = true;
      el.classList.add('correct');
      state.stars += Dengar.score(state.firstTry);
      GameAudio.fx(state.firstTry ? 'party' : 'ding');
      GameAudio.speak(state.firstTry ? 'Yeay!' : PRIDE[Math.floor(Math.random() * PRIDE.length)]);
      setTimeout(showCelebrate, 450);
    } else {
      state.firstTry = false;
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      GameAudio.fx('wrong');
      GameAudio.speak(promptText());
    }
  }
  function showCelebrate() {
    els.celebrate.classList.remove('hidden');
    var conf = els.celebrate.querySelector('#confetti');
    conf.innerHTML = '';
    var colors = ['#FF9F43', '#6FBF44', '#5AA9E6', '#F2A5B8', '#F6D32D'];
    for (var i = 0; i < 14; i++) {
      var piece = document.createElement('i');
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      conf.appendChild(piece);
    }
  }
  function continueAfterCelebrate() {
    state.roundIndex++;
    if (state.roundIndex >= state.session.length) render('end');
    else startRound();
  }
  function backToDashboard() {
    clearTimeout(returnTimer);
    window.location.href = '../../index.html';
  }
  function renderEnd() {
    clearTimeout(returnTimer);
    els.stars.innerHTML = '';
    for (var i = 0; i < Dengar.TOTAL_ROUNDS; i++) {
      var star = document.createElement('span');
      star.className = 'star' + (i < state.stars ? ' filled' : '');
      star.innerHTML = STAR_SVG;
      els.stars.appendChild(star);
    }
    if (root.Profiles) root.Profiles.addScore('dengar-cari-hewan', state.stars);
    returnTimer = setTimeout(backToDashboard, 6000);
    els.endTitle.textContent = state.stars === Dengar.TOTAL_ROUNDS ? 'Sempurna! 🌟' :
      state.stars >= 5 ? 'Hebat sekali!' : state.stars >= 3 ? 'Mantap!' : 'Ayo coba lagi!';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  root.Game = { init: init };
})(typeof window !== 'undefined' ? window : this);
```

The `animalOf` fallback must be null-safe before reading `.name`; since all ids come from `Art.ANIMALS`, the normal path is always found. If implementing a defensive fallback, use `Art.FALLBACK` only for SVG and keep prompt text as the id; do not add a second art catalog.

### Step 4: Add the registry entry

Append this object to `shared/games-registry.js` immediately after the existing `ikuti-urutan` object and before `];`:

```js
    {
      id: 'dengar-cari-hewan',
      name: 'Dengar & Cari Hewan',
      maxStars: 8,
      path: 'games/dengar-cari-hewan/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 18 h8 l10 -8 v28 l-10 -8 h-8 Z" fill="none" stroke="#1E88E5" stroke-width="4" stroke-linejoin="round"/><path d="M30 18 a8 8 0 0 1 0 12" fill="none" stroke="#F9A825" stroke-width="4" stroke-linecap="round"/><path d="M35 13 a15 15 0 0 1 0 22" fill="none" stroke="#F9A825" stroke-width="4" stroke-linecap="round"/></svg>'
    }
```

### Step 5: Test and commit

Run: `node --test` — Expected: 83 pass, 0 fail.
Open `games/dengar-cari-hewan/index.html` using the existing browser smoke convention and confirm menu, prompt button, two cards, wrong shake, celebrate, and end stars. The authoritative repeatable browser verification is Task 3.
Commit the page and registry together: `git add games/dengar-cari-hewan shared/games-registry.js && git commit -m "feat: add dengar-cari-hewan audio quiz"`.

---

## Task 3: Verifikasi penuh suite dan smoke CDP tiga fase

**Files:**
- Create outside repository: `/tmp/smoke-dengar-cari-hewan.mjs`.
- Repository code is not changed by this task unless a smoke failure identifies a real implementation defect; fix such a defect in the responsible file, add a focused test when applicable, and rerun all verification.

**Consumes:** Tasks 1–2; Node >=22; `/usr/bin/google-chrome` or `google-chrome`; free CDP/HTTP ports.

### Step 1: Create the standalone CDP smoke script

Create `/tmp/smoke-dengar-cari-hewan.mjs` with this complete script. It uses `pointerdown` because the game binds pointerdown rather than click, captures TTS prompts, and solves each random round behaviorally by tapping card 0 and, when it shakes, card 1.

```js
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const CHROME = 'google-chrome';
const CDP_PORT = 9224;
const HTTP_PORT = 8088;
const ROOT = '/home/swanster/projects/games/games-kay/.worktrees/dengar-cari-hewan/';
const HTTP = `http://127.0.0.1:${HTTP_PORT}/`;
const GAME = 'games/dengar-cari-hewan/index.html';
let asserts = 0;
function assert(condition, message) {
  asserts++;
  if (!condition) { console.error('ASSERT FAIL:', message); process.exitCode = 1; }
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Tab {
  constructor(ws, id) {
    this.ws = ws; this.id = id; this.n = 1;
    this.errors = []; this.failed = [];
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) return;
      if (message.method === 'Runtime.exceptionThrown') this.errors.push('exception');
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') this.errors.push('console.error');
      if (message.method === 'Network.loadingFailed') this.failed.push(message.params.errorText || 'netfail');
    });
  }
  send(method, params) {
    const id = this.n++;
    return new Promise((resolve, reject) => {
      const listener = (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        this.ws.removeEventListener('message', listener);
        if (message.error) reject(new Error(method + ': ' + message.error.message));
        else resolve(message.result);
      };
      this.ws.addEventListener('message', listener);
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise: true
    });
    if (result.exceptionDetails) throw new Error('eval exception');
    return result.result.value;
  }
  async navigate(url, width, height) {
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
    await this.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: false
    });
    const loaded = new Promise((resolve) => {
      const listener = (event) => {
        const message = JSON.parse(event.data);
        if (message.method !== 'Page.loadEventFired') return;
        this.ws.removeEventListener('message', listener);
        resolve();
      };
      this.ws.addEventListener('message', listener);
    });
    await this.send('Page.navigate', { url });
    await loaded;
    await sleep(250);
  }
  async close() {
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${this.id}`);
    this.ws.close();
  }
}

async function newTab() {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
  const info = await response.json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  return new Tab(ws, info.id);
}

function fileUrl() { return pathToFileURL(ROOT + GAME).href; }
function httpUrl() { return HTTP + GAME; }
function tapExpression(selector) {
  return `(() => { const el = ${selector}; if (!el) throw new Error('tap target missing'); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' })); })()`;
}

async function runGame(tab, label) {
  await tab.evaluate(`(() => {
    window.__tts = [];
    const synth = window.speechSynthesis;
    if (synth) {
      synth.speak = (utterance) => window.__tts.push(utterance.text);
      synth.cancel = () => {};
    }
  })()`);
  assert(await tab.evaluate(`!document.getElementById('menu').classList.contains('hidden')`), label + ': menu tampil');
  assert(await tab.evaluate(`!!document.getElementById('btn-start')`), label + ': btn-start ada');
  await tab.evaluate(tapExpression(`document.getElementById('btn-start')`));
  await sleep(250);
  assert(await tab.evaluate(`!document.getElementById('round-screen').classList.contains('hidden')`), label + ': round tampil');
  const cards = await tab.evaluate(`(() => {
    const all = [...document.querySelectorAll('#grid .card')];
    return { count: all.length, art: all.every((card) => card.innerHTML.includes('#5A4630')), viewBox: all.every((card) => card.querySelector('svg').getAttribute('viewBox') === '0 0 120 120') };
  })()`);
  assert(cards.count === 2, label + ': tepat dua kartu');
  assert(cards.art, label + ': kartu memakai seni A-2');
  assert(cards.viewBox, label + ': wrapper viewBox 120');
  assert(await tab.evaluate(`!!document.getElementById('btn-prompt')`), label + ': tombol ulang ada');
  const initialTts = await tab.evaluate(`window.__tts.length`);
  assert(initialTts >= 1, label + ': prompt awal dipanggil');
  assert(await tab.evaluate(`/^Mana .+\\?$/.test(window.__tts[window.__tts.length - 1])`), label + ': prompt format benar');
  await tab.evaluate(tapExpression(`document.getElementById('btn-prompt')`));
  await sleep(80);
  assert(await tab.evaluate(`window.__tts.length > ${initialTts}`), label + ': tombol ulang memanggil TTS');

  for (let round = 0; round < 8; round++) {
    const before = await tab.evaluate(`window.__tts.length`);
    await tab.evaluate(tapExpression(`document.querySelectorAll('#grid .card')[0]`));
    await sleep(120);
    const firstShook = await tab.evaluate(`document.querySelectorAll('#grid .card')[0].classList.contains('shake')`);
    if (firstShook) {
      assert(await tab.evaluate(`window.__tts.length > ${before}`), label + ': salah mengulang prompt ronde ' + (round + 1));
      await tab.evaluate(tapExpression(`document.querySelectorAll('#grid .card')[1]`));
    }
    await sleep(600);
    assert(await tab.evaluate(`!document.getElementById('celebrate').classList.contains('hidden')`), label + ': celebrate ronde ' + (round + 1));
    await tab.evaluate(tapExpression(`document.getElementById('btn-celebrate')`));
    await sleep(180);
  }
  assert(await tab.evaluate(`!document.getElementById('end-screen').classList.contains('hidden')`), label + ': end screen tampil');
  const end = await tab.evaluate(`({ total: document.querySelectorAll('#stars .star').length, title: document.getElementById('end-title').textContent })`);
  assert(end.total === 8, label + ': total bintang delapan');
  assert(end.title.length > 0, label + ': judul akhir ada');
}

const phases = [
  { name: 'file', width: 1280, height: 800, url: fileUrl },
  { name: 'http768', width: 768, height: 800, url: httpUrl },
  { name: 'http360', width: 360, height: 640, url: httpUrl }
];

let chrome;
let server;
async function main() {
  chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, '--no-sandbox', '--disable-gpu', '--user-data-dir=/tmp/smoke-dengar-' + Date.now(), 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); break; } catch { await sleep(100); }
  }
  server = spawn('python3', ['-m', 'http.server', String(HTTP_PORT), '--directory', ROOT], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) {
    try { await fetch(HTTP); break; } catch { await sleep(100); }
  }
  for (const phase of phases) {
    const tab = await newTab();
    await tab.navigate(phase.url(), phase.width, phase.height);
    await runGame(tab, phase.name);
    assert(tab.errors.length === 0, phase.name + ': tidak ada error konsol');
    assert(tab.failed.length === 0, phase.name + ': tidak ada request gagal');
    console.log('PASS dengar-cari-hewan fase ' + phase.name);
    await tab.close();
  }
}

main().catch((error) => { console.error('SMOKE ERROR:', error.message); process.exitCode = 1; }).finally(() => {
  if (server) server.kill('SIGTERM');
  if (chrome) chrome.kill('SIGTERM');
  console.log('TOTAL ASERSI:', asserts);
});
```

### Step 2: Run the verification commands

Run from the worktree:

1. `node --test` — Expected: 83 pass, 0 fail.
2. `node /tmp/smoke-dengar-cari-hewan.mjs` — Expected: file, http768, and http360 PASS; at least 40 assertions; exit 0.
3. `git status --short` — Expected: clean after the smoke script is outside the repository.

If the smoke fails, reproduce the specific assertion in the browser, fix only the responsible implementation file, and rerun the full suite plus all three smoke phases. Do not weaken an assertion to hide a real rendering or interaction defect.

### Step 3: Commit verification artifacts only when needed

The smoke script remains in `/tmp` and is not committed. If Task 3 made no repository fix, no commit is needed. If a real defect required a source fix, commit it with `git commit -am "fix: verify dengar-cari-hewan behavior"` after the green suite and smoke.

---

## Completion Gate

- [ ] Task 1 committed with six pure-logic tests passing.
- [ ] Task 2 committed with playable offline page and registry entry.
- [ ] Full suite reports 83 pass and 0 fail.
- [ ] Smoke reports all three phases PASS and at least 40 assertions.
- [ ] No unrelated files changed.
