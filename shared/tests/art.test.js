const test = require('node:test');
const assert = require('node:assert');
const Art = require('../art.js');

function findHexes(svg) {
  const out = [];
  const re = /(?:fill|stroke)="#([0-9A-Fa-f]{6})"/g;
  let m;
  while ((m = re.exec(svg)) !== null) out.push('#' + m[1].toUpperCase());
  return out;
}

function styleOk(svg) {
  const shapes = (svg.match(/<(circle|ellipse|rect|path|polygon)/g) || []);
  if (svg.length < 150) return 'terlalu pendek';
  if (shapes.length < 8) return 'elemen bentuk < 8';
  if (svg.includes('<svg') || svg.trim().startsWith('<g')) return 'ada bungkus';
  if (!svg.includes('#5A4630')) return 'tanpa stroke token';
  for (const hex of findHexes(svg)) {
    if (!Art.PALETTE.includes(hex)) return 'warna liar: ' + hex;
  }
  return null;
}

test('Art diekspor dengan konstanta gaya', () => {
  assert.strictEqual(Art.OUTLINE, '#5A4630');
  assert.ok(Array.isArray(Art.PALETTE) && Art.PALETTE.length >= 20);
});

test('FALLBACK adalah bintang A-2 valid dan bebas warna liar', () => {
  const f = Art.FALLBACK;
  assert.ok(typeof f === 'string' && f.length >= 150, 'panjang >= 150');
  assert.ok(!f.includes('<svg') && !f.trim().startsWith('<g'), 'tanpa bungkus');
  assert.ok((f.match(/<(circle|ellipse|rect|path|polygon)/g) || []).length >= 4);
  assert.ok(f.includes('#5A4630'), 'memakai stroke token A-2');
  for (const hex of findHexes(f)) assert.ok(Art.PALETTE.includes(hex), 'warna liar: ' + hex + ' di FALLBACK');
});

test('lookup hewan/kendaraan: dikenal -> string, tak dikenal -> FALLBACK + console.error', () => {
  const orig = console.error;
  const calls = [];
  console.error = (...a) => calls.push(a.join(' '));
  try {
    assert.strictEqual(Art.animalSvg('kucing'), Art.ANIMALS.find(a => a.id === 'kucing').svg);
    assert.strictEqual(Art.animalSvg('nope'), Art.FALLBACK);
    assert.strictEqual(Art.vehicleSvg('car'), Art.VEHICLES.find(v => v.id === 'car').svg);
    assert.strictEqual(Art.vehicleSvg('nope'), Art.FALLBACK);
    assert.ok(calls.length >= 2 && calls.every(c => c.includes('tak dikenal')));
  } finally {
    console.error = orig;
  }
});
