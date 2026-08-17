const test = require('node:test');
const assert = require('node:assert');
const Simon = require('../simon.js');

test('PADS: 4 pad dengan id unik, nama, hex, dan shape valid', () => {
  assert.strictEqual(Simon.PADS.length, 4);
  const ids = new Set();
  const SHAPES = ['circle', 'square', 'triangle', 'star'];
  Simon.PADS.forEach((p) => {
    assert.ok(p.id && !ids.has(p.id), 'id duplikat: ' + p.id);
    ids.add(p.id);
    assert.ok(p.name && p.name.trim().length > 0, 'nama kosong: ' + p.id);
    assert.ok(/^#[0-9A-F]{6}$/.test(p.hex), 'hex invalid: ' + p.id + ' -> ' + p.hex);
    assert.ok(SHAPES.includes(p.shape), 'shape invalid: ' + p.id + ' -> ' + p.shape);
  });
  assert.deepStrictEqual([...ids], ['red', 'blue', 'yellow', 'green']);
});

test('SEQUENCE_LENGTHS: 8 ronde, nilai [2,2,3,3,4,4,5,5]', () => {
  assert.deepStrictEqual(Simon.SEQUENCE_LENGTHS, [2, 2, 3, 3, 4, 4, 5, 5]);
});

test('makeSequence: panjang tepat dan semua elemen id pad dikenal', () => {
  [1, 2, 3, 4, 5, 6, 7, 8].forEach((len) => {
    const seq = Simon.makeSequence(len);
    assert.ok(Array.isArray(seq), 'bukan array len ' + len);
    assert.strictEqual(seq.length, len, 'panjang len ' + len);
    seq.forEach((id) => {
      assert.ok(Simon.PADS.some((p) => p.id === id), 'id tak dikenal: ' + id);
    });
  });
});

test('makeSequence acak (pengulangan diperbolehkan)', () => {
  const variants = new Set();
  for (let i = 0; i < 20; i++) {
    variants.add(Simon.makeSequence(3).join(','));
  }
  assert.ok(variants.size >= 2, 'urutan harus acak (varian terlihat: ' + variants.size + ')');
});

test('makeSequence: input invalid -> null', () => {
  assert.strictEqual(Simon.makeSequence(-1), null);
  assert.strictEqual(Simon.makeSequence(0), null);
  assert.strictEqual(Simon.makeSequence('x'), null);
  assert.strictEqual(Simon.makeSequence(null), null);
  assert.strictEqual(Simon.makeSequence(), null);
});

test('padSVG: svg lengkap, aria-label Pad {Nama}, hex, bentuk identitas, tanpa bocor', () => {
  const red = Simon.padSVG('red');
  assert.ok(red.startsWith('<svg'), 'harus <svg>');
  assert.ok(red.includes('role="img"') && red.includes('aria-label="Pad Merah"'), 'aria-label');
  assert.ok(red.includes('#E53935'), 'fill merah');
  assert.ok(red.includes('rx="10"'), 'body membulat');
  assert.ok(red.includes('<circle cx="24" cy="24" r="10" fill="#FFFFFF"'), 'bentuk circle putih');
  assert.ok(!red.includes('#1E88E5') && !red.includes('#F9A825') && !red.includes('#43A047'), 'warna lain bocor');
  assert.ok(Simon.padSVG('blue').includes('<rect x="15" y="15" width="18" height="18" rx="2" fill="#FFFFFF"'), 'blue = square putih');
  assert.ok(Simon.padSVG('yellow').includes('<polygon points="24,13 35,34 13,34" fill="#FFFFFF"'), 'yellow = triangle putih');
  assert.ok(Simon.padSVG('green').includes('<path d="M24 14'), 'green = star path putih');
  assert.strictEqual(Simon.padSVG('pink'), null);
  assert.strictEqual(Simon.padSVG(''), null);
});

test('matches: kecocokan warna', () => {
  assert.strictEqual(Simon.matches('red', 'red'), true);
  assert.strictEqual(Simon.matches('red', 'blue'), false);
  assert.strictEqual(Simon.matches('green', 'green'), true);
});

test('isRoundDone boundaries', () => {
  assert.strictEqual(Simon.isRoundDone(0, 5), false);
  assert.strictEqual(Simon.isRoundDone(4, 5), false);
  assert.strictEqual(Simon.isRoundDone(5, 5), true);
  assert.strictEqual(Simon.isRoundDone(8, 8), true);
  assert.strictEqual(Simon.isRoundDone(6, 5), true);
  assert.strictEqual(Simon.isRoundDone(0, 0), false);
});
