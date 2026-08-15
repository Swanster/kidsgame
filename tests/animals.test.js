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
