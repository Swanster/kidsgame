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
