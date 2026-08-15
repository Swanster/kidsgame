const test = require('node:test');
const assert = require('node:assert');
const Memory = require('../memory.js');

test('buildBoard membuat 2*pairs kartu dengan tiap pair tepat 2 kartu', () => {
  const board = Memory.buildBoard(3);
  assert.strictEqual(board.length, 6);
  const counts = {};
  const ids = new Set();
  board.forEach((c) => {
    counts[c.pair] = (counts[c.pair] || 0) + 1;
    ids.add(c.id);
  });
  assert.strictEqual(ids.size, 6, 'id harus unik');
  assert.deepStrictEqual(Object.values(counts).sort(), [2, 2, 2]);
});

test('buildBoard menolak jumlah pasangan invalid', () => {
  assert.deepStrictEqual(Memory.buildBoard(0), []);
  assert.deepStrictEqual(Memory.buildBoard(-1), []);
  assert.deepStrictEqual(Memory.buildBoard(1.5), []);
  assert.deepStrictEqual(Memory.buildBoard('x'), []);
});

test('shuffle adalah permutasi dan tidak mengubah input', () => {
  const input = [0, 1, 2, 3, 4, 5, 6, 7];
  const out = Memory.shuffle(input);
  assert.deepStrictEqual(input, [0, 1, 2, 3, 4, 5, 6, 7], 'input tidak berubah');
  assert.strictEqual(out.length, input.length);
  assert.deepStrictEqual([...out].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7], 'permutasi');
});

test('isMatch dan boardDone menegakkan kontrak cocok', () => {
  const a = { pair: 2, id: 'x' };
  const b = { pair: 2, id: 'y' };
  const c = { pair: 3, id: 'z' };
  assert.strictEqual(Memory.isMatch(a, b), true);
  assert.strictEqual(Memory.isMatch(a, c), false);
  assert.strictEqual(Memory.isMatch(a, null), false);
  assert.strictEqual(Memory.isMatch(null, null), false);
  assert.strictEqual(Memory.boardDone([], 4), false);
  assert.strictEqual(Memory.boardDone([1, 2], 2), true);
  assert.strictEqual(Memory.boardDone([1, 2, 3], 3), true);
});
