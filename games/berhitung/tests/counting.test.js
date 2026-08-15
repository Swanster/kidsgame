const test = require('node:test');
const assert = require('node:assert');
const Counting = require('../counting.js');

test('ada 8 balon dengan id unik dan nama non-kosong', () => {
  assert.strictEqual(Counting.BALLOONS.length, 8);
  const ids = new Set();
  Counting.BALLOONS.forEach((b) => {
    assert.ok(b.id && !ids.has(b.id), 'id duplikat: ' + b.id);
    ids.add(b.id);
    assert.ok(b.name && b.name.trim().length > 0, 'nama kosong: ' + b.id);
  });
  assert.ok(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'teal']
    .every((c) => ids.has(c)), 'harus ada 8 warna standar');
});

test('setiap balon punya svg inner tanpa tag luar', () => {
  Counting.BALLOONS.forEach((b) => {
    assert.ok(typeof b.svg === 'string' && b.svg.length > 0, 'svg kosong: ' + b.id);
    assert.ok(b.svg.includes('<circle'), 'svg tanpa bentuk lingkaran: ' + b.id);
    assert.ok(!b.svg.includes('<svg'), 'svg tidak boleh membungkus tag <svg>: ' + b.id);
  });
});

test('OBJECTS_PER_ROUND = 1..8', () => {
  assert.deepStrictEqual(Counting.OBJECTS_PER_ROUND, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test('layout deterministik, dalam batas, tanpa tumpang-tindih untuk 1..8', () => {
  for (let n = 1; n <= 8; n++) {
    const pos = Counting.layout(n);
    assert.strictEqual(pos.length, n, 'jumlah posisi: ' + n);
    pos.forEach((p) => {
      assert.ok(p.s >= 17, 'ukuran minimum: ' + n + ' -> ' + p.s);
      assert.ok(p.x - p.s / 2 >= 4 && p.x + p.s / 2 <= 96, 'dalam batas x: ' + n);
      assert.ok(p.y - p.s / 2 >= 4 && p.y + p.s / 2 <= 96, 'dalam batas y: ' + n);
    });
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const dx = pos[a].x - pos[b].x;
        const dy = pos[a].y - pos[b].y;
        assert.ok(Math.hypot(dx, dy) >= (pos[a].s + pos[b].s) / 2,
          'tumpang tindih: ' + n + ' antara ' + a + ' dan ' + b);
      }
    }
  }
  assert.deepStrictEqual(Counting.layout(3), Counting.layout(3), 'layout harus deterministik');
  assert.deepStrictEqual(Counting.layout(0), []);
  assert.deepStrictEqual(Counting.layout(9), []);
  assert.deepStrictEqual(Counting.layout(1.5), []);
});

test('shuffle adalah permutasi dan tidak mengubah input', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = Counting.shuffle(input);
  assert.deepStrictEqual(input, [1, 2, 3, 4, 5, 6, 7, 8], 'input tidak berubah');
  assert.strictEqual(out.length, input.length);
  assert.deepStrictEqual([...out].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8], 'permutasi');
});

test('isDone menegakkan kontrak selesai', () => {
  assert.strictEqual(Counting.isDone(0, 3), false);
  assert.strictEqual(Counting.isDone(2, 3), false);
  assert.strictEqual(Counting.isDone(3, 3), true);
  assert.strictEqual(Counting.isDone(5, 3), true, 'over-tap tidak merusak');
  assert.strictEqual(Counting.isDone(0, 0), false, 'total 0 bukan ronde sah');
});
