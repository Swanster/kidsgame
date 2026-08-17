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

test('ANIMALS: 12 hewan union, id unik cocok pola, nama non-kosong, gaya A-2', () => {
  assert.ok(Array.isArray(Art.ANIMALS) && Art.ANIMALS.length === 12);
  const ids = Art.ANIMALS.map(a => a.id);
  assert.strictEqual(new Set(ids).size, 12);
  for (const id of ids) assert.ok(/^[a-z]+(?:-[a-z]+)*$/.test(id), 'id aneh: ' + id);
  for (const a of Art.ANIMALS) {
    assert.ok(a.name && a.name.trim().length > 0, 'nama kosong');
    assert.ok(a.group && a.group.trim().length > 0, 'group kosong: ' + a.id);
    assert.strictEqual(styleOk(a.svg), null, a.id + ': ' + styleOk(a.svg));
  }
  const shared = ['kucing', 'anjing', 'kelinci', 'bebek', 'burung', 'gajah'];
  const temukanOnly = ['singa', 'babi', 'sapi', 'katak'];
  const puzzleOnly = ['ikan', 'kura-kura'];
  for (const id of shared.concat(temukanOnly, puzzleOnly)) {
    assert.ok(ids.includes(id), 'union harus memuat ' + id);
  }
});

test('VEHICLES: 8 kendaraan standar, id unik, nama non-kosong, gaya A-2', () => {
  assert.ok(Array.isArray(Art.VEHICLES) && Art.VEHICLES.length === 8);
  const ids = Art.VEHICLES.map(v => v.id);
  const names = Art.VEHICLES.map(v => v.name);
  assert.strictEqual(new Set(ids).size, 8);
  assert.ok(names.every(n => n && n.trim().length > 0));
  for (const id of ['car', 'train', 'plane', 'ship', 'bike', 'tractor', 'bus', 'helicopter']) {
    assert.ok(ids.includes(id), 'harus ada ' + id);
  }
  for (const v of Art.VEHICLES) {
    assert.strictEqual(styleOk(v.svg), null, v.id + ': ' + styleOk(v.svg));
    assert.ok(!v.svg.includes('<svg'), v.id + ' tanpa <svg>');
  }
});
