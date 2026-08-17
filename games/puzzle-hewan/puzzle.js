// puzzle.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Puzzle = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var Art = (typeof module === 'object' && module.exports)
    ? require('../../shared/art.js')
    : (typeof self !== 'undefined' ? self : globalThis).Art;
  if (!Art) throw new Error('shared/art.js harus dimuat sebelum file ini');

  var SUBJECT_MAP = {
    cat: 'kucing', dog: 'anjing', elephant: 'gajah', rabbit: 'kelinci',
    duck: 'bebek', fish: 'ikan', bird: 'burung', turtle: 'kura-kura'
  };

  var IMAGES = [
    { id: 'cat', name: 'Kucing', svg: Art.animalSvg(SUBJECT_MAP.cat) },
    { id: 'dog', name: 'Anjing', svg: Art.animalSvg(SUBJECT_MAP.dog) },
    { id: 'elephant', name: 'Gajah', svg: Art.animalSvg(SUBJECT_MAP.elephant) },
    { id: 'rabbit', name: 'Kelinci', svg: Art.animalSvg(SUBJECT_MAP.rabbit) },
    { id: 'duck', name: 'Bebek', svg: Art.animalSvg(SUBJECT_MAP.duck) },
    { id: 'fish', name: 'Ikan', svg: Art.animalSvg(SUBJECT_MAP.fish) },
    { id: 'bird', name: 'Burung', svg: Art.animalSvg(SUBJECT_MAP.bird) },
    { id: 'turtle', name: 'Kura-kura', svg: Art.animalSvg(SUBJECT_MAP.turtle) }
  ];

  var PIECES_PER_ROUND = [4, 4, 6, 6, 9, 9, 9, 9];

  function layout(count) {
    if (count === 4) return { cols: 2, rows: 2 };
    if (count === 6) return { cols: 3, rows: 2 };
    if (count === 9) return { cols: 3, rows: 3 };
    return null;
  }

  function makeBoard(imgIndex) {
    var img = IMAGES[imgIndex];
    if (!img) return null;
    var count = PIECES_PER_ROUND[imgIndex];
    var lay = layout(count);
    var w = 120 / lay.cols;
    var h = 120 / lay.rows;
    var pieces = [];
    for (var r = 0; r < lay.rows; r++) {
      for (var c = 0; c < lay.cols; c++) {
        pieces.push({
          n: r * lay.cols + c + 1,
          col: c,
          row: r,
          x: c * w,
          y: r * h,
          w: w,
          h: h
        });
      }
    }
    return { image: img, pieces: shuffle(pieces) };
  }

  function pieceSVG(imgIndex, piece) {
    var img = IMAGES[imgIndex];
    if (!img || !piece) return null;
    return '<svg viewBox="0 0 ' + piece.w + ' ' + piece.h + '" role="img" aria-label="Potongan ' + piece.n + '">' +
      '<g transform="translate(' + (-piece.x) + ' ' + (-piece.y) + ')">' + img.svg + '</g>' +
      '<text x="' + (piece.w - 5) + '" y="' + (piece.h - 2) + '" text-anchor="end" font-size="11" font-weight="bold" fill="#FFFFFF" stroke="#4A3636" stroke-width="2" font-family="sans-serif">' + piece.n + '</text>' +
      '</svg>';
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function isRoundDone(placed, count) {
    return count > 0 && placed >= count;
  }

  return {
    IMAGES: IMAGES,
    PIECES_PER_ROUND: PIECES_PER_ROUND,
    layout: layout,
    makeBoard: makeBoard,
    pieceSVG: pieceSVG,
    shuffle: shuffle,
    isRoundDone: isRoundDone,
    SUBJECT_MAP: SUBJECT_MAP
  };
});
