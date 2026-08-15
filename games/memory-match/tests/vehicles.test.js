const test = require('node:test');
const assert = require('node:assert');
const VEHICLES = require('../vehicles.js');

test('ada 8 kendaraan dengan id unik dan nama non-kosong', () => {
  assert.strictEqual(VEHICLES.length, 8);
  const ids = new Set();
  VEHICLES.forEach((v) => {
    assert.ok(v.id && !ids.has(v.id), 'id duplikat: ' + v.id);
    ids.add(v.id);
    assert.ok(v.name && v.name.trim().length > 0, 'nama kosong: ' + v.id);
  });
  assert.ok(ids.has('car') && ids.has('train') && ids.has('plane') && ids.has('ship') &&
    ids.has('bike') && ids.has('tractor') && ids.has('bus') && ids.has('helicopter'),
    'harus ada 8 kendaraan standar');
});

test('setiap kendaraan punya svg inner tanpa tag luar', () => {
  VEHICLES.forEach((v) => {
    assert.ok(typeof v.svg === 'string' && v.svg.length > 0, 'svg kosong: ' + v.id);
    assert.ok(v.svg.includes('<path') || v.svg.includes('<circle') || v.svg.includes('<ellipse'),
      'svg tanpa bentuk: ' + v.id);
    assert.ok(!v.svg.includes('<svg'), 'svg tidak boleh membungkus tag <svg>: ' + v.id);
  });
});
