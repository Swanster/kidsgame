const test = require('node:test');
const assert = require('node:assert');
const Puzzle = require('../puzzle.js');

test('ada 8 gambar hewan dengan id unik, nama, dan svg dalam', () => {
  assert.strictEqual(Puzzle.IMAGES.length, 8);
  const ids = new Set();
  Puzzle.IMAGES.forEach((img) => {
    assert.ok(img.id && !ids.has(img.id), 'id duplikat: ' + img.id);
    ids.add(img.id);
    assert.ok(img.name && img.name.trim().length > 0, 'nama kosong: ' + img.id);
    assert.ok(img.svg && img.svg.length > 0, 'svg kosong: ' + img.id);
    assert.ok(!img.svg.includes('<svg'), 'svg tidak boleh membungkus tag <svg>: ' + img.id);
    assert.ok(/<(circle|ellipse|rect|path)/.test(img.svg), 'svg tanpa bentuk dasar: ' + img.id);
  });
  assert.ok(['cat', 'dog', 'elephant', 'rabbit', 'duck', 'fish', 'bird', 'turtle']
    .every((x) => ids.has(x)), '8 hewan standar');
});

test('PIECES_PER_ROUND: 8 ronde, nilai 4/6/9', () => {
  assert.deepStrictEqual(Puzzle.PIECES_PER_ROUND, [4, 4, 6, 6, 9, 9, 9, 9]);
});

test('layout: 4 -> 2x2, 6 -> 3x2, 9 -> 3x3, lainnya null', () => {
  assert.deepStrictEqual(Puzzle.layout(4), { cols: 2, rows: 2 });
  assert.deepStrictEqual(Puzzle.layout(6), { cols: 3, rows: 2 });
  assert.deepStrictEqual(Puzzle.layout(9), { cols: 3, rows: 3 });
  assert.strictEqual(Puzzle.layout(0), null);
  assert.strictEqual(Puzzle.layout(5), null);
  assert.strictEqual(Puzzle.layout(12), null);
});

test('makeBoard: potongan unik 1..n, partisi 120x120 merata, index tak dikenal -> null', () => {
  Puzzle.IMAGES.forEach((img, i) => {
    const board = Puzzle.makeBoard(i);
    assert.ok(board, 'board null ronde ' + i);
    assert.strictEqual(board.image.id, img.id);
    const count = Puzzle.PIECES_PER_ROUND[i];
    assert.strictEqual(board.pieces.length, count);
    const seen = new Set();
    board.pieces.forEach((p) => {
      assert.ok(p.n >= 1 && p.n <= count && !seen.has(p.n), 'n rusak/duplikat: ' + p.n);
      seen.add(p.n);
      assert.ok(Number.isInteger(p.col) && Number.isInteger(p.row), 'col/row bukan integer');
    });
    // partisi merata tanpa overlap: kombinasi (x,y) unik dan x+w<=120, y+h<=120
    const cells = new Set();
    board.pieces.forEach((p) => {
      assert.strictEqual(p.w, 120 / (count === 4 ? 2 : count === 6 ? 3 : 3), 'lebarkan salah');
      assert.strictEqual(p.h, 120 / (count === 4 ? 2 : count === 6 ? 2 : 3), 'tinggi salah');
      assert.ok(p.x >= 0 && p.x + p.w <= 120.0001 && p.y >= 0 && p.y + p.h <= 120.0001, 'keluar papan');
      cells.add(p.x + ',' + p.y);
    });
    assert.strictEqual(cells.size, count, 'sel tumpang tindih');
  });
  assert.strictEqual(Puzzle.makeBoard(-1), null);
  assert.strictEqual(Puzzle.makeBoard(99), null);
});

test('pieceSVG: viewBox potongan, gambar ter-translate, angka, aria-label', () => {
  const imgIndex = 0;
  const board = Puzzle.makeBoard(imgIndex);
  const piece = board.pieces[0];
  const svg = Puzzle.pieceSVG(imgIndex, piece);
  assert.ok(svg.startsWith('<svg'), 'harus <svg> lengkap');
  assert.ok(svg.includes('role="img"') && svg.includes('aria-label="Potongan ' + piece.n + '"'), 'aria-label');
  assert.ok(svg.includes('viewBox="0 0 ' + piece.w + ' ' + piece.h + '"'), 'viewBox potongan');
  assert.ok(svg.includes('translate(' + (-piece.x) + ' ' + (-piece.y) + ')'), 'gambar ter-translate');
  assert.ok(svg.includes(Puzzle.IMAGES[imgIndex].svg), 'isi gambar utuh');
  assert.ok(svg.includes('<text') && svg.includes('>' + piece.n + '</text>'), 'angka potongan');
  assert.ok(!svg.includes('Potongan ' + (piece.n + 1) + '"'), 'angka salah');
  assert.strictEqual(Puzzle.pieceSVG(99, piece), null);
  assert.strictEqual(Puzzle.pieceSVG(0, null), null);
  assert.strictEqual(Puzzle.pieceSVG(-1, { n: 1 }), null);
});

test('shuffle adalah permutasi, tidak mengubah input, dan mengacak urutan panjang', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const out = Puzzle.shuffle(input);
  assert.deepStrictEqual(input, input.slice(0).sort((a, b) => a - b), 'input tidak berubah');
  assert.deepStrictEqual([...out].sort((a, b) => a - b), input, 'permutasi');
  assert.notDeepStrictEqual(out, input, 'urutan harus teracak (prob 1/20! ~ 0)');
});

test('isRoundDone boundaries', () => {
  assert.strictEqual(Puzzle.isRoundDone(0, 4), false);
  assert.strictEqual(Puzzle.isRoundDone(3, 4), false);
  assert.strictEqual(Puzzle.isRoundDone(4, 4), true);
  assert.strictEqual(Puzzle.isRoundDone(9, 9), true);
  assert.strictEqual(Puzzle.isRoundDone(5, 4), true, 'over-place tidak merusak');
  assert.strictEqual(Puzzle.isRoundDone(0, 0), false, 'count 0 bukan ronde sah');
});

test('SUBJECT_MAP: 8 id puzzle terpetakan ke subjek yang ada di shared art', () => {
  const Art = require('../../../shared/art.js');
  const ids = new Set(Art.ANIMALS.map(a => a.id));
  for (const [p, s] of Object.entries(Puzzle.SUBJECT_MAP)) {
    assert.ok(ids.has(s), 'subjek tak dikenal: ' + s);
    assert.strictEqual(Art.animalSvg(s), Art.ANIMALS.find(a => a.id === s).svg, 'svg ter-resolve: ' + s);
  }
  assert.deepStrictEqual(Puzzle.SUBJECT_MAP, {
    cat: 'kucing', dog: 'anjing', elephant: 'gajah', rabbit: 'kelinci',
    duck: 'bebek', fish: 'ikan', bird: 'burung', turtle: 'kura-kura'
  });
});
