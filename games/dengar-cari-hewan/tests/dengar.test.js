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
