# Temukan Hewan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Temukan Hewan" — a vanilla-JS, zero-dependency web game that trains focus for a 4-year-old by tapping all target animals among distractor cards.

**Architecture:** Four classic script files + CSS + HTML, no build step, opens from `file://`. Pure logic (round generation, animal metadata, voice picking) lives in UMD-lite modules exported to both `window.*` globals and Node `module.exports` so `node --test` can test them without a browser. `game.js` is a small state machine (`menu → round → celebrate → end`) driven by `pointerdown` events (unified touch/mouse).

**Tech Stack:** Vanilla HTML/CSS/JS. Node ≥ 18 (tested on v24) for `node --test` only. No frameworks, no bundlers, no external assets, no network.

## Global Constraints

- **Zero dependencies, zero build, zero network**: game must run by opening `index.html` directly from disk (`file://`). Classic `<script>` tags only — NO ES modules (`<script type="module">` fails on `file://`).
- **All hewan = inline SVG** in `animals.js`. No image files, no emoji dependence (emoji rendering is platform-inconsistent).
- **8 fixed rounds per session.** Round specs (from spec): ronde 1-2: 6 cards / 2-3 targets / easy; ronde 3-5: 8 cards / 2 targets / medium; ronde 6-8: 12 cards / 3 targets / hard.
- **Tiers**: easy & medium = distractors only from different `group` than target; hard = always include one same-`group` distractor when one exists, rest from other groups.
- **Star rule**: 1 star per round finished with zero wrong taps; max 8 stars. No timer anywhere. Wrong tap = soft sound + card shake, NEVER punishment.
- **UI language**: Indonesian. TTS instructions in `id-ID`. Visual instruction (big target SVG + name) MUST always be visible — game must stay fully playable with no TTS.
- **Tap targets ≥ 96px** (CSS `minmax(96px, 1fr)`).
- **Input**: `pointerdown` only, on cards AND buttons. `Audio.unlock()` MUST run on the first user gesture (start button) due to autoplay policy.
- **Audio failure is silent**: any TTS/Web Audio error → game continues in silent mode; sound toggle always visible.
- Global names: `window.Animals`, `window.Rounds`, `window.GameAudio` (NOT `Audio` — that name is the native `HTMLAudioElement` constructor), `window.Game`.
- Every task ends with a commit. Skip formatters/linters (none configured).

## File Structure

- Create: `index.html` — screens (menu / round / celebrate overlay / end) + script tags
- Create: `style.css` — full visual design, animations (wiggle, shake, pop, confetti), responsive grid
- Create: `animals.js` — `ANIMALS` metadata + `ANIMAL_BY_ID` + inline SVG art (10 animals)
- Create: `rounds.js` — `ROUND_SPECS` + `generateRound()` + `shuffle()` (pure logic)
- Create: `audio.js` — TTS wrapper (id-ID) + Web Audio effects + `pickIdVoice()` (pure) + mute
- Create: `game.js` — state machine + DOM rendering + tap handling
- Create: `tests/rounds.test.js`, `tests/animals.test.js`, `tests/audio.test.js` — `node --test`

Run all unit tests: `node --test` (from project root — auto-discovers `tests/*.test.js`; note: directory form `node --test tests/` fails on Node v24, use bare `node --test`).

---

### Task 1: Round generator (pure logic, TDD)

**Files:**
- Create: `rounds.js`
- Test: `tests/rounds.test.js`

**Interfaces:**
- Consumes: nothing (tests use their own `FIXTURE` animal array).
- Produces (used by Task 2, 5):
  - `Rounds.ROUND_SPECS` — Array of 8 `{ cards, targets, tier }` objects
  - `Rounds.shuffle(arr: any[]) → any[]` — Fisher-Yates on a copy
  - `Rounds.generateRound(roundIndex: number, animals: Array<{id, name, group}>) → { index, spec, tier, targetId, targetName, cards: Array<{id, isTarget}> }` — throws `RangeError` for out-of-range `roundIndex`; `cards` length equals `spec.cards`; exactly `spec.targets` cards have `isTarget: true` and `id === targetId`.

- [ ] **Step 1: Write the failing test**

```js
// tests/rounds.test.js
const test = require('node:test');
const assert = require('node:assert');
const Rounds = require('../rounds.js');

const FIXTURE = [
  { id: 'cat',  name: 'Cat',  group: 'feline' },
  { id: 'lion', name: 'Lion', group: 'feline' },
  { id: 'dog',  name: 'Dog',  group: 'canine' },
  { id: 'duck', name: 'Duck', group: 'bird'   },
  { id: 'cow',  name: 'Cow',  group: 'farm'   }
];

test('shuffle preserves elements and returns a copy', () => {
  const src = [1, 2, 3, 4, 5];
  const out = Rounds.shuffle(src);
  assert.deepStrictEqual([...out].sort((a, b) => a - b), src);
  assert.notStrictEqual(out, src);
});

test('easy tier: 6 cards, 2 targets, no same-group distractors', () => {
  const r = Rounds.generateRound(0, FIXTURE);
  assert.strictEqual(r.cards.length, 6);
  assert.strictEqual(r.cards.filter(c => c.isTarget).length, 2);
  assert.strictEqual(r.cards.filter(c => c.id === r.targetId).length, 2);
  const targetGroup = FIXTURE.find(a => a.id === r.targetId).group;
  for (const c of r.cards) {
    if (!c.isTarget) {
      assert.notStrictEqual(FIXTURE.find(a => a.id === c.id).group, targetGroup);
    }
  }
});

test('hard tier includes a same-group distractor when possible', () => {
  const r = Rounds.generateRound(5, FIXTURE); // first hard round: 12 cards
  const targetGroup = FIXTURE.find(a => a.id === r.targetId).group;
  const sameIds = FIXTURE.filter(a => a.group === targetGroup && a.id !== r.targetId).map(a => a.id);
  if (sameIds.length > 0) {
    const shown = r.cards.map(c => c.id);
    assert.ok(sameIds.some(id => shown.includes(id)), 'same-group distractor must be present');
  }
});

test('every round spec is valid and generated correctly', () => {
  assert.strictEqual(Rounds.ROUND_SPECS.length, 8);
  Rounds.ROUND_SPECS.forEach((spec, i) => {
    assert.ok(spec.targets > 0 && spec.targets < spec.cards, `round ${i} targets < cards`);
    const r = Rounds.generateRound(i, FIXTURE);
    assert.strictEqual(r.cards.length, spec.cards);
    assert.strictEqual(r.cards.filter(c => c.isTarget).length, spec.targets);
    assert.strictEqual(r.targetId, r.cards.find(c => c.isTarget).id);
  });
});

test('out-of-range round index throws RangeError', () => {
  assert.throws(() => Rounds.generateRound(8, FIXTURE), RangeError);
  assert.throws(() => Rounds.generateRound(-1, FIXTURE), RangeError);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rounds.test.js`
Expected: FAIL — `Cannot find module '../rounds.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// rounds.js (UMD-lite: works as script tag global AND CommonJS module)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Rounds = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Ramping: 1-2 easy (6 kartu), 3-5 medium (8 kartu), 6-8 hard (12 kartu)
  var ROUND_SPECS = [
    { cards: 6,  targets: 2, tier: 'easy'   },
    { cards: 6,  targets: 3, tier: 'easy'   },
    { cards: 8,  targets: 2, tier: 'medium' },
    { cards: 8,  targets: 2, tier: 'medium' },
    { cards: 8,  targets: 2, tier: 'medium' },
    { cards: 12, targets: 3, tier: 'hard'   },
    { cards: 12, targets: 3, tier: 'hard'   },
    { cards: 12, targets: 3, tier: 'hard'   }
  ];

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  // Pick n distractor ids from pool, cycling when pool is smaller than n.
  function fillFrom(pool, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push(pool[i % pool.length].id);
    }
    return out;
  }

  function generateRound(roundIndex, animals) {
    if (roundIndex < 0 || roundIndex >= ROUND_SPECS.length) {
      throw new RangeError('roundIndex out of range: ' + roundIndex);
    }
    var spec = ROUND_SPECS[roundIndex];
    var target = animals[Math.floor(Math.random() * animals.length)];
    var same = animals.filter(function (a) {
      return a.id !== target.id && a.group === target.group;
    });
    var diff = animals.filter(function (a) {
      return a.id !== target.id && a.group !== target.group;
    });
    var needed = spec.cards - spec.targets;
    var distractorIds;
    if (spec.tier === 'hard' && same.length > 0) {
      distractorIds = [same[0].id].concat(fillFrom(diff, needed - 1));
    } else {
      distractorIds = fillFrom(diff.length > 0 ? diff : animals, needed);
    }
    var cards = [];
    for (var t = 0; t < spec.targets; t++) {
      cards.push({ id: target.id, isTarget: true });
    }
    distractorIds.forEach(function (id) {
      cards.push({ id: id, isTarget: false });
    });
    return {
      index: roundIndex,
      spec: spec,
      tier: spec.tier,
      targetId: target.id,
      targetName: target.name,
      cards: shuffle(cards)
    };
  }

  return { ROUND_SPECS: ROUND_SPECS, shuffle: shuffle, generateRound: generateRound };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rounds.test.js`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add rounds.js tests/rounds.test.js
git commit -m "feat: add round generator with tiered difficulty"
```

---

### Task 2: Animal data + SVG art

**Files:**
- Create: `animals.js`
- Test: `tests/animals.test.js`

**Interfaces:**
- Consumes: `Rounds.generateRound` (integration test only).
- Produces (used by Task 4, 5):
  - `Animals.ANIMALS` — Array of exactly 10 `{ id, name, group, svg }`; `id` lowercase a-z, `name` Indonesian capitalized (e.g. `'Kucing'`), `svg` a single `<g>…</g>` string drawn on a 120×120 canvas.
  - `Animals.ANIMAL_BY_ID` — `{ id → animal }` lookup map.
  - Groups (used by round tiers): `feline` = kucing, singa; `bird` = burung, bebek; all others are unique groups.

- [ ] **Step 1: Write the failing test**

```js
// tests/animals.test.js
const test = require('node:test');
const assert = require('node:assert');
const Animals = require('../animals.js');

test('exactly 10 animals with unique ids and names', () => {
  assert.strictEqual(Animals.ANIMALS.length, 10);
  const ids = Animals.ANIMALS.map(a => a.id);
  const names = Animals.ANIMALS.map(a => a.name);
  assert.strictEqual(new Set(ids).size, 10);
  assert.strictEqual(new Set(names).size, 10);
  assert.ok(ids.every(id => /^[a-z]+$/.test(id)));
});

test('every animal has a real SVG and a group', () => {
  for (const a of Animals.ANIMALS) {
    assert.ok(a.svg.startsWith('<g'), `${a.id} svg starts with <g`);
    assert.ok(a.svg.endsWith('</g>'), `${a.id} svg ends with </g>`);
    assert.ok(a.svg.length > 100, `${a.id} svg is substantial`);
    assert.ok(a.group.length > 0, `${a.id} has a group`);
  }
});

test('ANIMAL_BY_ID maps every id', () => {
  for (const a of Animals.ANIMALS) {
    assert.strictEqual(Animals.ANIMAL_BY_ID[a.id], a);
  }
});

test('all 8 rounds generate valid cards from real ANIMALS', () => {
  const Rounds = require('../rounds.js');
  for (let i = 0; i < 8; i++) {
    const r = Rounds.generateRound(i, Animals.ANIMALS);
    assert.strictEqual(r.cards.length, r.spec.cards);
    assert.strictEqual(r.cards.filter(c => c.isTarget).length, r.spec.targets);
    for (const c of r.cards) {
      assert.ok(Animals.ANIMAL_BY_ID[c.id], `card id ${c.id} exists in ANIMALS`);
    }
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/animals.test.js`
Expected: FAIL — `Cannot find module '../animals.js'`

- [ ] **Step 3: Write minimal implementation**

Flat cartoon style, 120×120 viewBox. Convention: ears behind head drawn first, head circle centered ~(60,56) r≈32-34, eyes at (46,52) & (74,52) as white circle r5.5 + pupil r2.8 at (48.5,54) & (71.5,54).

```js
// animals.js (UMD-lite)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Animals = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function EYES() {
    return '<circle cx="46" cy="52" r="5.5" fill="#fff"/>' +
           '<circle cx="74" cy="52" r="5.5" fill="#fff"/>' +
           '<circle cx="48.5" cy="54" r="2.8" fill="#2B2B2B"/>' +
           '<circle cx="71.5" cy="54" r="2.8" fill="#2B2B2B"/>';
  }

  var ANIMALS = [
    // Kucing (orange) — pointy ears, whiskers
    { id: 'kucing', name: 'Kucing', group: 'feline', svg: '<g>' +
      '<path d="M36 40 L42 12 L58 34 Z" fill="#F4A63A"/>' +
      '<path d="M84 40 L78 12 L62 34 Z" fill="#F4A63A"/>' +
      '<path d="M41 36 L44 20 L54 33 Z" fill="#F9C6D2"/>' +
      '<path d="M79 36 L76 20 L66 33 Z" fill="#F9C6D2"/>' +
      '<circle cx="60" cy="56" r="34" fill="#F4A63A"/>' +
      EYES() +
      '<path d="M60 60 L56 66 L64 66 Z" fill="#E86A6A"/>' +
      '<path d="M60 66 C58 71 52 72 50 68 M60 66 C62 71 68 72 70 68" stroke="#5A4630" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M30 56 L14 52 M30 62 L12 62 M30 68 L14 72 M90 56 L106 52 M90 62 L108 62 M90 68 L106 72" stroke="#5A4630" stroke-width="1.5" stroke-linecap="round"/>' +
      '</g>' },

    // Singa — mane behind head, tan muzzle
    { id: 'singa', name: 'Singa', group: 'feline', svg: '<g>' +
      '<circle cx="60" cy="56" r="38" fill="#E08A2E"/>' +
      '<circle cx="60" cy="58" r="30" fill="#F0C06A"/>' +
      '<circle cx="34" cy="34" r="6" fill="#F0C06A"/>' +
      '<circle cx="86" cy="34" r="6" fill="#F0C06A"/>' +
      EYES() +
      '<ellipse cx="60" cy="68" rx="14" ry="9" fill="#FBE8C8"/>' +
      '<path d="M60 62 L56 67 L64 67 Z" fill="#B95F2B"/>' +
      '<path d="M60 70 C58 73 53 72 52 69 M60 70 C62 73 67 72 68 69" stroke="#B95F2B" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</g>' },

    // Anjing (brown) — floppy ears, tongue
    { id: 'anjing', name: 'Anjing', group: 'canine', svg: '<g>' +
      '<ellipse cx="33" cy="48" rx="10" ry="22" fill="#8A5A33" transform="rotate(-12 33 48)"/>' +
      '<ellipse cx="87" cy="48" rx="10" ry="22" fill="#8A5A33" transform="rotate(12 87 48)"/>' +
      '<circle cx="60" cy="57" r="34" fill="#B07A4F"/>' +
      EYES() +
      '<ellipse cx="60" cy="70" rx="15" ry="10" fill="#D9A87C"/>' +
      '<ellipse cx="60" cy="65" rx="5" ry="4" fill="#3A2A1E"/>' +
      '<path d="M56 76 Q60 84 64 76 Z" fill="#E86A6A"/>' +
      '</g>' },

    // Kelinci (abu muda) — long ears outline so white-on-pastel still reads
    { id: 'kelinci', name: 'Kelinci', group: 'lagomorph', svg: '<g>' +
      '<ellipse cx="48" cy="18" rx="9" ry="26" fill="#E4E8EC" stroke="#C9D2DA" stroke-width="2"/>' +
      '<ellipse cx="72" cy="18" rx="9" ry="26" fill="#E4E8EC" stroke="#C9D2DA" stroke-width="2"/>' +
      '<ellipse cx="48" cy="20" rx="4.5" ry="18" fill="#F9C6D2"/>' +
      '<ellipse cx="72" cy="20" rx="4.5" ry="18" fill="#F9C6D2"/>' +
      '<circle cx="60" cy="54" r="32" fill="#E4E8EC" stroke="#C9D2DA" stroke-width="2"/>' +
      EYES() +
      '<path d="M60 58 L56 63 L64 63 Z" fill="#F2A5B8"/>' +
      '<path d="M56 68 L56 74 L60 74 L60 68 Z M64 68 L64 74 L60 74 L60 68 Z" fill="#fff" stroke="#C9D2DA" stroke-width="1"/>' +
      '</g>' },

    // Bebek (kuning) — orange beak, blush
    { id: 'bebek', name: 'Bebek', group: 'bird', svg: '<g>' +
      '<circle cx="60" cy="55" r="32" fill="#F6D32D"/>' +
      '<circle cx="46" cy="52" r="5.5" fill="#fff"/>' +
      '<circle cx="74" cy="52" r="5.5" fill="#fff"/>' +
      '<circle cx="48.5" cy="54" r="2.8" fill="#2B2B2B"/>' +
      '<circle cx="71.5" cy="54" r="2.8" fill="#2B2B2B"/>' +
      '<path d="M46 62 Q60 80 74 62 Q60 70 46 62 Z" fill="#F08A24"/>' +
      '<circle cx="40" cy="64" r="4" fill="#F7B7C6" opacity="0.7"/>' +
      '<circle cx="80" cy="64" r="4" fill="#F7B7C6" opacity="0.7"/>' +
      '</g>' },

    // Burung (biru) — crest, side beak, wing
    { id: 'burung', name: 'Burung', group: 'bird', svg: '<g>' +
      '<path d="M48 26 Q54 6 66 12 Q74 20 66 27 Z" fill="#3D7FC4"/>' +
      '<circle cx="60" cy="55" r="30" fill="#5AA9E6"/>' +
      '<circle cx="52" cy="50" r="5.5" fill="#fff"/>' +
      '<circle cx="76" cy="50" r="5.5" fill="#fff"/>' +
      '<circle cx="54.5" cy="52" r="2.8" fill="#2B2B2B"/>' +
      '<circle cx="73.5" cy="52" r="2.8" fill="#2B2B2B"/>' +
      '<path d="M60 56 L44 60 L60 66 Z" fill="#F08A24"/>' +
      '<path d="M40 62 Q52 84 76 80 Q60 92 40 62 Z" fill="#4A86C9"/>' +
      '</g>' },

    // Babi (pink) — triangular ears, snout
    { id: 'babi', name: 'Babi', group: 'suid', svg: '<g>' +
      '<path d="M40 34 L34 14 L52 28 Z" fill="#F2A5B8"/>' +
      '<path d="M80 34 L86 14 L68 28 Z" fill="#F2A5B8"/>' +
      '<circle cx="60" cy="55" r="33" fill="#F2A5B8"/>' +
      EYES() +
      '<ellipse cx="60" cy="66" rx="12" ry="9" fill="#F9C6D2"/>' +
      '<circle cx="56" cy="66" r="2.5" fill="#7A4A55"/>' +
      '<circle cx="64" cy="66" r="2.5" fill="#7A4A55"/>' +
      '<path d="M60 75 C58 78 53 77 52 74 M60 75 C62 78 67 77 68 74" stroke="#C2708A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</g>' },

    // Sapi (putih berbelang) — horns, patches, pink muzzle
    { id: 'sapi', name: 'Sapi', group: 'bovine', svg: '<g>' +
      '<path d="M40 30 Q32 16 20 20 Q30 26 36 34 Z" fill="#E8C16A"/>' +
      '<path d="M80 30 Q88 16 100 20 Q90 26 84 34 Z" fill="#E8C16A"/>' +
      '<circle cx="60" cy="56" r="34" fill="#FAFAFA" stroke="#D8DCE0" stroke-width="2"/>' +
      '<path d="M32 40 Q48 28 60 36 Q46 50 32 40 Z" fill="#3A3A3A"/>' +
      '<path d="M84 52 Q74 44 78 32 Q94 38 84 52 Z" fill="#3A3A3A"/>' +
      EYES() +
      '<ellipse cx="60" cy="70" rx="14" ry="10" fill="#F2B8C4"/>' +
      '<circle cx="55" cy="70" r="2" fill="#8A5560"/>' +
      '<circle cx="65" cy="70" r="2" fill="#8A5560"/>' +
      '</g>' },

    // Gajah (abu) — big side ears, trunk, tusks
    { id: 'gajah', name: 'Gajah', group: 'proboscidean', svg: '<g>' +
      '<ellipse cx="28" cy="58" rx="16" ry="24" fill="#8A97A4"/>' +
      '<ellipse cx="92" cy="58" rx="16" ry="24" fill="#8A97A4"/>' +
      '<circle cx="60" cy="55" r="32" fill="#9AA7B1"/>' +
      EYES() +
      '<path d="M52 58 C48 76 50 92 60 92 C70 92 72 76 68 58" fill="#9AA7B1"/>' +
      '<path d="M50 64 Q40 72 42 82 Q48 74 55 70 Z" fill="#F5F5F2"/>' +
      '<path d="M70 64 Q80 72 78 82 Q72 74 65 70 Z" fill="#F5F5F2"/>' +
      '</g>' },

    // Katak (hijau) — eyes on top, wide smile
    { id: 'katak', name: 'Katak', group: 'anuran', svg: '<g>' +
      '<circle cx="42" cy="34" r="12" fill="#6FBF44"/>' +
      '<circle cx="78" cy="34" r="12" fill="#6FBF44"/>' +
      '<circle cx="42" cy="34" r="7" fill="#fff"/>' +
      '<circle cx="78" cy="34" r="7" fill="#fff"/>' +
      '<circle cx="44" cy="35" r="3.5" fill="#2B2B2B"/>' +
      '<circle cx="76" cy="35" r="3.5" fill="#2B2B2B"/>' +
      '<circle cx="60" cy="55" r="34" fill="#6FBF44"/>' +
      '<path d="M34 60 Q60 82 86 60" stroke="#2E5D1E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="38" cy="62" r="4" fill="#F9C6D2" opacity="0.8"/>' +
      '<circle cx="82" cy="62" r="4" fill="#F9C6D2" opacity="0.8"/>' +
      '</g>' }
  ];

  var ANIMAL_BY_ID = {};
  ANIMALS.forEach(function (a) { ANIMAL_BY_ID[a.id] = a; });

  return { ANIMALS: ANIMALS, ANIMAL_BY_ID: ANIMAL_BY_ID };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/animals.test.js`
Expected: PASS (all 4 tests, including round-generation integration)

- [ ] **Step 5: Commit**

```bash
git add animals.js tests/animals.test.js
git commit -m "feat: add 10 animal SVG assets with metadata"
```

---

### Task 3: Audio module (TTS + effects)

**Files:**
- Create: `audio.js`
- Test: `tests/audio.test.js`

**Interfaces:**
- Consumes: nothing (pure parts tested in Node; browser parts verified in Task 5 smoke test).
- Produces (used by Task 5):
  - `GameAudio.pickIdVoice(voices: Array<{lang}>) → voice | null` — prefers first `id-*`, then bare `id`, else `null` (pure, testable in Node)
  - `GameAudio.unlock()` — create/resume `AudioContext`; MUST be called from a user gesture
  - `GameAudio.speak(text)` — TTS, lang `id-ID`, rate 0.9, silent if muted or unsupported
  - `GameAudio.fx(kind)` — kinds: `'ding' | 'wrong' | 'cheer' | 'pop'`; silent if muted or context unavailable
  - `GameAudio.setMuted(bool)`, `GameAudio.isMuted()`
  - Global name MUST be `GameAudio` (never `Audio` — clashes with native constructor).

- [ ] **Step 1: Write the failing test**

```js
// tests/audio.test.js
const test = require('node:test');
const assert = require('node:assert');
const GameAudio = require('../audio.js');

test('pickIdVoice prefers full id-ID voice', () => {
  const voices = [{ lang: 'en-US' }, { lang: 'id-ID' }, { lang: 'id' }];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[1]);
});

test('pickIdVoice falls back to bare id', () => {
  const voices = [{ lang: 'en-US' }, { lang: 'id' }];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[1]);
});

test('pickIdVoice returns null without id voices', () => {
  assert.strictEqual(GameAudio.pickIdVoice([{ lang: 'en-US' }, { lang: 'ja-JP' }]), null);
  assert.strictEqual(GameAudio.pickIdVoice([]), null);
  assert.strictEqual(GameAudio.pickIdVoice(null), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/audio.test.js`
Expected: FAIL — `Cannot find module '../audio.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// audio.js (UMD-lite). Browser-only features degrade silently in Node.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameAudio = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ctx = null;
  var muted = false;

  function pickIdVoice(voices) {
    if (!voices || !voices.length) return null;
    var full = voices.filter(function (v) { return /^id-/.test(v.lang || ''); });
    if (full.length) return full[0];
    var bare = voices.filter(function (v) { return (v.lang || '') === 'id'; });
    return bare[0] || null;
  }

  function unlock() {
    try {
      if (!ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* silent */ }
  }

  function speak(text) {
    if (muted || !root.speechSynthesis) return;
    try {
      var voice = pickIdVoice(root.speechSynthesis.getVoices());
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      if (voice) u.voice = voice;
      u.rate = 0.9;
      root.speechSynthesis.speak(u);
    } catch (e) { /* silent */ }
  }

  function tone(freq, dur, type, vol) {
    if (muted || !ctx) return;
    try {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch (e) { /* silent */ }
  }

  function fx(kind) {
    if (muted) return;
    if (!ctx) unlock();
    if (!ctx) return;
    switch (kind) {
      case 'ding':
        tone(880, 0.3, 'sine', 0.25);
        break;
      case 'wrong':
        tone(220, 0.25, 'triangle', 0.15);
        break;
      case 'pop':
        tone(300, 0.12, 'square', 0.08);
        break;
      case 'cheer':
        tone(523, 0.18, 'sine', 0.2);
        setTimeout(function () { tone(659, 0.18, 'sine', 0.2); }, 140);
        setTimeout(function () { tone(784, 0.3, 'sine', 0.22); }, 280);
        break;
    }
  }

  function setMuted(m) { muted = !!m; }
  function isMuted() { return muted; }

  return {
    pickIdVoice: pickIdVoice,
    unlock: unlock,
    speak: speak,
    fx: fx,
    setMuted: setMuted,
    isMuted: isMuted
  };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/audio.test.js`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add audio.js tests/audio.test.js
git commit -m "feat: add TTS and Web Audio effects module"
```

---

### Task 4: UI shell — index.html + style.css

**Files:**
- Create: `index.html`
- Create: `style.css`

**Interfaces:**
- Consumes: nothing at runtime yet (game.js comes in Task 5). This task only makes the static screens render.
- Produces (used by Task 5) — element IDs that `game.js` MUST use:
  - `#menu`, `#btn-start`, `#btn-sound`
  - `#round-screen`, `#target-svg`, `#target-name`, `#grid`
  - `#celebrate`, `#confetti`, `#celebrate-msg`, `#btn-celebrate`
  - `#end-screen`, `#end-title`, `#stars`, `#btn-again`
  - Classes: `.screen` (fullscreen section), `.hidden` (display:none), `.card`, `.card.found`, `.card.shake`, `.btn-big`, `.stars .star`, `.stars .star.filled`

- [ ] **Step 1: Write the markup**

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Temukan Hewan 🐾</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>

  <section id="menu" class="screen">
    <h1 class="title">Temukan Hewan 🐾</h1>
    <p class="subtitle">Ketuk semua hewan yang diminta!</p>
    <button id="btn-start" class="btn-big">Main Yuk!</button>
    <button id="btn-sound" class="btn-sound" aria-label="Suara">🔊</button>
  </section>

  <section id="round-screen" class="screen hidden">
    <header class="target-panel">
      <span id="target-svg" class="target-svg"></span>
      <span id="target-name" class="target-name"></span>
    </header>
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
    <button id="btn-again" class="btn-big">Main Lagi?</button>
  </section>

  <script src="animals.js"></script>
  <script src="rounds.js"></script>
  <script src="audio.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write the stylesheet**

```css
/* style.css */
:root {
  --bg: #FFEFD5;
  --card: #FFFFFF;
  --ink: #4A3728;
  --accent: #FF9F43;
  --accent-dark: #E87E2E;
  --ok: #6FBF44;
  --soft: #FBE0C0;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body { height: 100%; }

body {
  font-family: "Comic Sans MS", "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--ink);
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px;
}

.hidden { display: none !important; }

.title { font-size: 2.4rem; color: var(--accent-dark); text-align: center; }
.subtitle { font-size: 1.3rem; text-align: center; }

.btn-big {
  font-size: 1.8rem;
  font-family: inherit;
  padding: 18px 44px;
  border: none;
  border-radius: 60px;
  background: var(--accent);
  color: #fff;
  box-shadow: 0 6px 0 var(--accent-dark);
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.btn-big:active {
  transform: translateY(5px);
  box-shadow: 0 1px 0 var(--accent-dark);
}

.btn-sound {
  position: fixed;
  top: 14px;
  right: 14px;
  font-size: 1.6rem;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 4px 10px rgba(74, 55, 40, 0.2);
  cursor: pointer;
}

/* Round screen */
.target-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff;
  border-radius: 24px;
  padding: 10px 22px;
  box-shadow: 0 4px 12px rgba(74, 55, 40, 0.15);
}
.target-svg svg { width: 72px; height: 72px; display: block; }
.target-name { font-size: 1.6rem; font-weight: bold; color: var(--accent-dark); }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 12px;
  width: 100%;
  max-width: 640px;
  padding: 8px;
}

.card {
  background: var(--card);
  border-radius: 20px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(74, 55, 40, 0.15);
  transition: transform 0.1s ease;
}
.card svg { width: 100%; height: 100%; }
.card:active { transform: scale(0.94); }

.card.found {
  box-shadow: 0 0 0 4px var(--ok) inset;
  background: #F3FBE8;
  opacity: 0.85;
}

.card.shake { animation: shake 0.35s ease; }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-4px); }
}

/* Celebrate overlay */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 239, 213, 0.94);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  z-index: 10;
  animation: pop 0.3s ease;
}
@keyframes pop {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.celebrate-msg { font-size: 2.2rem; color: var(--accent-dark); text-align: center; }

.confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.confetti i {
  position: absolute;
  top: -20px;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  animation: fall linear forwards;
}
@keyframes fall {
  to { transform: translateY(105vh) rotate(720deg); }
}

/* End screen */
.stars {
  display: flex;
  gap: 10px;
  font-size: 2.6rem;
  flex-wrap: wrap;
  justify-content: center;
}
.star { opacity: 0.22; filter: grayscale(1); }
.star.filled { opacity: 1; filter: none; }
.end-title { font-size: 2rem; color: var(--accent-dark); }
```

- [ ] **Step 3: Verify menu renders (browser smoke)**

Open in Chromium via the browser tool: `file:///home/swanster/projects/games/games-kay/index.html`
Expected: title "Temukan Hewan 🐾", button "Main Yuk!", sound toggle visible; no console errors. Note: pages are blank in other respects (game.js not written yet — it will fail to find `#btn-start` listeners? No — game.js doesn't exist yet, scripts silently absent; the other three scripts must not error).
Expected console: no errors (only the JS files listed exist).

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "feat: add game UI shell with responsive styles"
```

---

### Task 5: Game state machine (game.js)

**Files:**
- Create: `game.js`

**Interfaces:**
- Consumes (globals from earlier tasks): `root.Animals` (`ANIMALS`, `ANIMAL_BY_ID`), `root.Rounds` (`generateRound`), `root.GameAudio` (`unlock`, `speak`, `fx`, `setMuted`, `isMuted`); DOM ids from Task 4.
- Produces: `root.Game = { init }` — `init()` runs on load (called from a `DOMContentLoaded` listener inside the file). No other module consumes it.

- [ ] **Step 1: Write the implementation**

```js
// game.js
(function (root) {
  'use strict';

  var Animals = root.Animals;
  var Rounds = root.Rounds;
  var GameAudio = root.GameAudio;

  var PRIDE = ['Hebat!', 'Keren!', 'Luar biasa!', 'Pintar!'];
  var TOTAL_ROUNDS = 8;

  var els = {};
  var state = {
    screen: 'menu',      // 'menu' | 'round' | 'end'
    roundIndex: 0,
    stars: 0,
    remaining: 0,
    perfect: true,
    round: null
  };

  function $(id) { return document.getElementById(id); }

  function svgOf(animal, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 120 120" role="img" aria-label="' +
      animal.name + '">' + animal.svg + '</svg>';
  }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.endScreen = $('end-screen');
    els.celebrate = $('celebrate');
    els.grid = $('grid');
    els.targetSvg = $('target-svg');
    els.targetName = $('target-name');
    els.stars = $('stars');
    els.endTitle = $('end-title');

    $('btn-start').addEventListener('pointerdown', startSession);
    $('btn-again').addEventListener('pointerdown', startSession);
    $('btn-celebrate').addEventListener('pointerdown', continueAfterCelebrate);
    $('btn-sound').addEventListener('pointerdown', toggleSound);

    render('menu');
  }

  function toggleSound() {
    GameAudio.setMuted(!GameAudio.isMuted());
    $('btn-sound').textContent = GameAudio.isMuted() ? '🔇' : '🔊';
    if (!GameAudio.isMuted()) GameAudio.unlock();
  }

  function startSession() {
    GameAudio.unlock();
    state.roundIndex = 0;
    state.stars = 0;
    startRound();
  }

  function startRound() {
    state.round = Rounds.generateRound(state.roundIndex, Animals.ANIMALS);
    state.remaining = state.round.spec.targets;
    state.perfect = true;
    render('round');
    GameAudio.speak('Ketuk semua ' + state.round.targetName.toLowerCase() + '!');
  }

  function render(screen) {
    state.screen = screen;
    els.menu.classList.toggle('hidden', screen !== 'menu');
    els.roundScreen.classList.toggle('hidden', screen !== 'round');
    els.endScreen.classList.toggle('hidden', screen !== 'end');
    els.celebrate.classList.add('hidden');
    if (screen === 'round') {
      var target = Animals.ANIMAL_BY_ID[state.round.targetId];
      els.targetSvg.innerHTML = svgOf(target, 'target');
      els.targetName.textContent = target.name;
      renderGrid();
    } else if (screen === 'end') {
      renderEnd();
    }
  }

  function renderGrid() {
    els.grid.innerHTML = '';
    state.round.cards.forEach(function (card) {
      var animal = Animals.ANIMAL_BY_ID[card.id];
      var el = document.createElement('div');
      el.className = 'card';
      el.dataset.isTarget = card.isTarget ? '1' : '0';
      el.innerHTML = svgOf(animal);
      el.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onCardTap(el, card);
      });
      els.grid.appendChild(el);
    });
  }

  function onCardTap(el, card) {
    if (state.screen !== 'round') return;
    if (el.classList.contains('found')) return;
    if (card.isTarget) {
      el.classList.add('found');
      state.remaining--;
      GameAudio.fx('ding');
      if (Math.random() < 0.4 && state.remaining > 0) {
        GameAudio.speak(PRIDE[Math.floor(Math.random() * PRIDE.length)]);
      }
      if (state.remaining === 0) finishRound();
    } else {
      state.perfect = false;
      el.classList.remove('shake');
      void el.offsetWidth; // restart animation
      el.classList.add('shake');
      GameAudio.fx('wrong');
    }
  }

  function finishRound() {
    state.stars += state.perfect ? 1 : 0;
    GameAudio.fx('cheer');
    GameAudio.speak(Math.random() < 0.5 ? 'Yeay!' : 'Bagus sekali!');
    showCelebrate();
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
    if (state.roundIndex >= TOTAL_ROUNDS) {
      render('end');
    } else {
      startRound();
    }
  }

  function renderEnd() {
    var maxStars = 8;
    els.stars.innerHTML = '';
    for (var i = 0; i < maxStars; i++) {
      var s = document.createElement('span');
      s.className = 'star' + (i < state.stars ? ' filled' : '');
      s.textContent = '⭐';
      els.stars.appendChild(s);
    }
    els.endTitle.textContent =
      state.stars === maxStars ? 'Sempurna! 🌟' :
      state.stars >= 5 ? 'Hebat sekali!' :
      state.stars >= 3 ? 'Mantap!' : 'Ayo coba lagi!';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.Game = { init: init };
})(typeof window !== 'undefined' ? window : this);
```

- [ ] **Step 2: Browser smoke — menu → round**

Open `file:///home/swanster/projects/games/games-kay/index.html` in the browser tool.
Expected: menu visible. Click "Main Yuk!". Expected: round screen appears with target panel (big animal SVG + name) and a 6-card grid; console has no errors.

- [ ] **Step 3: Browser smoke — correct & wrong taps, celebrate, next round**

On the round screen: click a target card (cards whose animal equals the target panel animal). Expected: card gets green `found` inset + ding sound (muted check: toggle 🔊 first to confirm toggle works visually). Click a non-target card. Expected: shake animation + soft wrong sound, no progress loss. Tap remaining targets → celebrate overlay with confetti + "Lanjut!" button. Click "Lanjut!" → round 2 appears with 6 cards and 3 targets.
Expected console: no errors.

- [ ] **Step 4: Commit**

```bash
git add game.js
git commit -m "feat: add game state machine with tap feedback"
```

---

### Task 6: Full-session smoke test + responsive check

**Files:**
- None new (verification only).

- [ ] **Step 1: Run full unit suite**

Run: `node --test`
Expected: all 12 tests pass (5 rounds + 4 animals + 3 audio)

- [ ] **Step 2: Play a full session in the browser (desktop viewport, 1280×800)**

Open the game, click "Main Yuk!", then for each of the 8 rounds:
- verify target panel shows one animal prominently;
- tap all cards matching the target (finder's approach: read each card's `aria-label` or compare SVG);
- deliberately tap one wrong card in at least one round to confirm shake + no star for that round;
- click "Lanjut!" between rounds.
After round 8 → end screen. Expected: 8 star slots, filled count == number of rounds with zero wrong taps; end title matches the stars buckets (Sempurna! / Hebat sekali! / Mantap! / Ayo coba lagi!).
Expected console: no errors.

- [ ] **Step 3: Tablet portrait check (viewport 768×1024)**

Reload and start a session. Expected: grid reflows (cards ≥96px, 6-card round = 2-3 columns), everything tappable without zoom, no horizontal overflow (check `document.documentElement.scrollWidth <= window.innerWidth` via browser console).

- [ ] **Step 4: Confirm file:// independence**

Confirm no network requests occurred (browser devtools Network tab empty apart from the 5 local files).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: finalize Temukan Hewan game"
```

---

## Self-Review Notes

- Spec coverage: 8 fixed rounds ✓ (Task 1), tiered difficulty incl. same-group distractors at hard ✓ (Task 1 tests), 10 animals SVG inline ✓ (Task 2), TTS id-ID + silent fallback ✓ (Task 3), pointerdown + ≥96px targets ✓ (Task 4), star rule (1 per perfect round, max 8) ✓ (Task 5 `finishRound`), no timer / no punishment ✓ (Task 5 `onCardTap` wrong branch), end screen + Main Lagi ✓ (Task 5), smoke + node --test ✓ (Task 6), file:// zero-network ✓ (Task 6 Step 4).
- Consistency: global names `Animals`/`Rounds`/`GameAudio`/`Game`; `generateRound` return shape identical across Tasks 1, 2, 5; DOM ids match between Task 4 markup and Task 5 `init()`.
- SVG test threshold `> 100` chars is met by every animal definition (shortest is bebek ≈ 320 chars).