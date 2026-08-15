const test = require('node:test');
const assert = require('node:assert');
const Sorting = require('../sorting.js');

test('ada 4 bentuk dengan id unik, nama, dan body ber-placeholder', () => {
  assert.strictEqual(Sorting.SHAPES.length, 4);
  const ids = new Set();
  Sorting.SHAPES.forEach((s) => {
    assert.ok(s.id && !ids.has(s.id), 'id duplikat: ' + s.id);
    ids.add(s.id);
    assert.ok(s.name && s.name.trim().length > 0, 'nama kosong: ' + s.id);
    assert.ok(s.body.includes('{FILL}') && s.body.includes('{STROKE}'), 'placeholder hilang: ' + s.id);
    assert.ok(!s.body.includes('<svg'), 'body tidak boleh membungkus tag <svg>');
  });
  assert.ok(['circle', 'square', 'triangle', 'star'].every((x) => ids.has(x)), '4 bentuk standar');
});

test('ada 4 warna dengan id unik, nama, dan hex', () => {
  assert.strictEqual(Sorting.COLORS.length, 4);
  const ids = new Set();
  Sorting.COLORS.forEach((c) => {
    assert.ok(c.id && !ids.has(c.id), 'id duplikat: ' + c.id);
    ids.add(c.id);
    assert.ok(c.name && c.name.trim().length > 0, 'nama kosong: ' + c.id);
    assert.ok(/^#[0-9A-F]{6}$/.test(c.hex), 'hex invalid: ' + c.id + ' -> ' + c.hex);
  });
  assert.ok(['red', 'blue', 'yellow', 'green'].every((x) => ids.has(x)), '4 warna standar');
});

test('ROUNDS: 8 ronde dengan progresi bin 2,2,3,4,2,3,4,4', () => {
  assert.strictEqual(Sorting.ROUNDS.length, 8);
  const counts = Sorting.ROUNDS.map((r) => r.bins.length);
  assert.deepStrictEqual(counts, [2, 2, 3, 4, 2, 3, 4, 4]);
  Sorting.ROUNDS.forEach((r, i) => {
    assert.ok(r.attr === 'color' || r.attr === 'shape', 'attr invalid ronde ' + i);
    assert.ok(r.bins.length > 0, 'bins kosong ronde ' + i);
    assert.ok(r.count === 4 || r.count === 5, 'count invalid ronde ' + i + ' -> ' + r.count);
    r.bins.forEach((b) => {
      const pool = r.attr === 'color' ? Sorting.COLORS : Sorting.SHAPES;
      assert.ok(pool.some((x) => x.id === b), 'bin tak dikenal ronde ' + i + ': ' + b);
    });
  });
});

test('makeItem: 16 kombinasi valid, input tak dikenal -> null', () => {
  Sorting.SHAPES.forEach((s) => {
    Sorting.COLORS.forEach((c) => {
      const item = Sorting.makeItem(s.id, c.id);
      assert.ok(item, 'item null: ' + s.id + '/' + c.id);
      assert.strictEqual(item.shape, s.id);
      assert.strictEqual(item.color, c.id);
      assert.ok(item.svg.includes(c.hex), 'fill tidak sesuai: ' + s.id + '/' + c.id);
      assert.ok(item.svg.includes('#4A3728'), 'stroke objek harus gelap');
      assert.ok(!item.svg.includes('<svg'), 'svg tidak boleh membungkus tag <svg>');
    });
  });
  assert.strictEqual(Sorting.makeItem('hexagon', 'red'), null);
  assert.strictEqual(Sorting.makeItem('circle', 'pink'), null);
});

test('binIcon: color blob filled; shape stroke abu netral; unknown -> null', () => {
  const redBin = Sorting.binIcon('color', 'red');
  assert.ok(redBin.includes('<svg'), 'bin color harus berupa <svg> lengkap');
  assert.ok(redBin.includes('#E53935') && redBin.includes('aria-label="Merah"'), 'bin merah');
  const circleBin = Sorting.binIcon('shape', 'circle');
  assert.ok(circleBin.includes('#90A4AE') && circleBin.includes('fill="none"'), 'bin bentuk netral abu');
  assert.ok(!circleBin.includes('#E53935') && !circleBin.includes('#1E88E5'), 'bin bentuk tanpa warna');
  assert.strictEqual(Sorting.binIcon('color', 'pink'), null);
  assert.strictEqual(Sorting.binIcon('shape', 'hexagon'), null);
  assert.strictEqual(Sorting.binIcon('size', 'red'), null);
});

test('matches menegakkan kontrak atribut', () => {
  const item = { shape: 'circle', color: 'red' };
  assert.strictEqual(Sorting.matches('color', item, 'red'), true);
  assert.strictEqual(Sorting.matches('color', item, 'blue'), false);
  assert.strictEqual(Sorting.matches('shape', item, 'circle'), true);
  assert.strictEqual(Sorting.matches('shape', item, 'square'), false);
  assert.strictEqual(Sorting.matches('color', null, 'red'), false);
  assert.strictEqual(Sorting.matches('size', item, 'red'), false);
});

test('roundItems: tiap ronde ter-answerable dan konsisten atributnya', () => {
  const fixedShapes = ['circle', 'square', 'triangle', 'star'];
  Sorting.ROUNDS.forEach((r, i) => {
    const items = Sorting.roundItems(i);
    assert.strictEqual(items.length, r.count, 'jumlah item ronde ' + i);
    items.forEach((it) => {
      assert.ok(r.bins.some((b) => Sorting.matches(r.attr, it, b)),
        'item tanpa bin jawaban ronde ' + i + ': ' + JSON.stringify(it));
      if (r.attr === 'color') {
        assert.ok(r.bins.includes(it.color), 'warna di luar bin ronde ' + i);
      } else {
        assert.ok(r.bins.includes(it.shape), 'bentuk di luar bin ronde ' + i);
      }
    });
    if (i < 4) {
      const shapes = new Set(items.map((it) => it.shape));
      assert.strictEqual(shapes.size, 1, 'ronde warna ' + i + ' harus bentuk konstan: ' + fixedShapes[i]);
      assert.ok(shapes.has(fixedShapes[i]), 'bentuk konstan ronde ' + i);
    }
  });
});

test('shuffle adalah permutasi dan tidak mengubah input; isRoundDone boundaries', () => {
  const input = [1, 2, 3, 4];
  const out = Sorting.shuffle(input);
  assert.deepStrictEqual(input, [1, 2, 3, 4], 'input tidak berubah');
  assert.deepStrictEqual([...out].sort((a, b) => a - b), [1, 2, 3, 4], 'permutasi');
  assert.strictEqual(Sorting.isRoundDone(0, 4), false);
  assert.strictEqual(Sorting.isRoundDone(3, 4), false);
  assert.strictEqual(Sorting.isRoundDone(4, 4), true);
  assert.strictEqual(Sorting.isRoundDone(9, 4), true, 'over-place tidak merusak');
  assert.strictEqual(Sorting.isRoundDone(0, 0), false, 'count 0 bukan ronde sah');
});
