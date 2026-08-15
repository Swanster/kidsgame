const test = require('node:test');
const assert = require('node:assert');
const Balls = require('../balls.js');

test('COLORS: 4 warna dengan id unik, nama, dan hex', () => {
  assert.strictEqual(Balls.COLORS.length, 4);
  const ids = new Set();
  Balls.COLORS.forEach((c) => {
    assert.ok(c.id && !ids.has(c.id), 'id duplikat: ' + c.id);
    ids.add(c.id);
    assert.ok(c.name && c.name.trim().length > 0, 'nama kosong: ' + c.id);
    assert.ok(/^#[0-9A-F]{6}$/.test(c.hex), 'hex invalid: ' + c.id + ' -> ' + c.hex);
  });
  assert.ok(['red', 'blue', 'yellow', 'green'].every((x) => ids.has(x)), '4 warna standar');
});

test('BALLS_PER_ROUND: 8 ronde, nilai [4,4,6,6,8,8,10,10]', () => {
  assert.deepStrictEqual(Balls.BALLS_PER_ROUND, [4, 4, 6, 6, 8, 8, 10, 10]);
});

test('makeRound: jumlah bola, id unik, minimal 2 warna, instruksi valid', () => {
  Balls.BALLS_PER_ROUND.forEach((count, i) => {
    const round = Balls.makeRound(i);
    assert.ok(round, 'round null ronde ' + i);
    assert.strictEqual(round.balls.length, count, 'jumlah bola ronde ' + i);
    const ids = new Set();
    round.balls.forEach((b) => {
      assert.ok(b.id && !ids.has(b.id), 'id bola duplikat: ' + b.id);
      ids.add(b.id);
      assert.ok(Balls.COLORS.some((c) => c.id === b.color), 'warna tak dikenal: ' + b.color);
    });
    const colorSet = new Set(round.balls.map((b) => b.color));
    assert.ok(colorSet.size >= 2, 'harus >= 2 warna ronde ' + i);
    assert.strictEqual(round.instructions.length, count, 'jumlah instruksi ronde ' + i);
    round.instructions.forEach((inst) => {
      assert.ok(Balls.COLORS.some((c) => c.id === inst.color), 'instruksi warna tak dikenal: ' + inst.color);
    });
  });
});

test('makeRound: selalu solvable — tiap instruksi punya bola tersisa (simulasi pop)', () => {
  Balls.BALLS_PER_ROUND.forEach((count, i) => {
    const round = Balls.makeRound(i);
    const remaining = {};
    round.balls.forEach((b) => { remaining[b.color] = (remaining[b.color] || 0) + 1; });
    round.instructions.forEach((inst) => {
      assert.ok(remaining[inst.color] > 0, 'macet ronde ' + i + ' warna ' + inst.color);
      remaining[inst.color]--;
    });
  });
});

test('makeRound: index tak dikenal -> null', () => {
  assert.strictEqual(Balls.makeRound(-1), null);
  assert.strictEqual(Balls.makeRound(8), null);
  assert.strictEqual(Balls.makeRound(99), null);
});

test('ballSVG: svg lengkap, aria-label Bola {Nama}, isi warna, unknown -> null', () => {
  const svg = Balls.ballSVG('red');
  assert.ok(svg.startsWith('<svg'), 'harus <svg> lengkap');
  assert.ok(svg.includes('role="img"') && svg.includes('aria-label="Bola Merah"'), 'aria-label');
  assert.ok(svg.includes('#E53935'), 'isi warna merah');
  assert.ok(!svg.includes('#1E88E5') && !svg.includes('#F9A825') && !svg.includes('#43A047'), 'warna lain bocor');
  assert.ok(svg.includes('<circle') && svg.includes('<ellipse'), 'harus ada highlight');
  assert.strictEqual(Balls.ballSVG('pink'), null);
  assert.strictEqual(Balls.ballSVG(''), null);
});

test('matches: kecocokan warna', () => {
  assert.strictEqual(Balls.matches('red', 'red'), true);
  assert.strictEqual(Balls.matches('red', 'blue'), false);
  assert.strictEqual(Balls.matches('yellow', 'yellow'), true);
});

test('shuffle adalah permutasi, tidak mengubah input, dan mengacak urutan panjang', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const out = Balls.shuffle(input);
  assert.deepStrictEqual(input, input.slice(0).sort((a, b) => a - b), 'input tidak berubah');
  assert.deepStrictEqual([...out].sort((a, b) => a - b), input, 'permutasi');
  assert.notDeepStrictEqual(out, input, 'urutan harus teracak (prob 1/20! ~ 0)');
});

test('isRoundDone boundaries', () => {
  assert.strictEqual(Balls.isRoundDone(0, 4), false);
  assert.strictEqual(Balls.isRoundDone(3, 4), false);
  assert.strictEqual(Balls.isRoundDone(4, 4), true);
  assert.strictEqual(Balls.isRoundDone(10, 10), true);
  assert.strictEqual(Balls.isRoundDone(5, 4), true, 'over-place tidak merusak');
  assert.strictEqual(Balls.isRoundDone(0, 0), false, 'count 0 bukan ronde sah');
});
