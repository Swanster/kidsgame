// puzzle.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Puzzle = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var IMAGES = [
    { id: 'cat', name: 'Kucing', svg:
      '<circle cx="60" cy="64" r="38" fill="#F9A825"/>' +
      '<path d="M28 34 L18 6 L46 22 Z" fill="#F9A825"/>' +
      '<path d="M92 34 L102 6 L74 22 Z" fill="#F9A825"/>' +
      '<path d="M30 32 L24 14 L41 23 Z" fill="#F2A5B8"/>' +
      '<path d="M90 32 L96 14 L79 23 Z" fill="#F2A5B8"/>' +
      '<circle cx="44" cy="60" r="6" fill="#4A3636"/>' +
      '<circle cx="76" cy="60" r="6" fill="#4A3636"/>' +
      '<path d="M50 76 Q60 86 70 76" stroke="#4A3636" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M38 80 L20 88 M82 80 l18 8" stroke="#4A3636" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<path d="M4 106 Q30 118 60 114 Q92 118 116 106" stroke="#F9A825" stroke-width="5" fill="none" stroke-linecap="round"/>' },
    { id: 'dog', name: 'Anjing', svg:
      '<ellipse cx="60" cy="70" rx="40" ry="36" fill="#A9744F"/>' +
      '<ellipse cx="28" cy="48" rx="15" ry="26" fill="#8B5A33"/>' +
      '<ellipse cx="92" cy="48" rx="15" ry="26" fill="#8B5A33"/>' +
      '<circle cx="44" cy="64" r="6" fill="#4A3636"/>' +
      '<circle cx="76" cy="64" r="6" fill="#4A3636"/>' +
      '<ellipse cx="60" cy="82" rx="12" ry="9" fill="#F5E6D3"/>' +
      '<circle cx="60" cy="76" r="5" fill="#4A3636"/>' +
      '<path d="M54 88 Q60 92 66 88" stroke="#4A3636" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="42" cy="20" r="8" fill="#8B5A33"/>' },
    { id: 'elephant', name: 'Gajah', svg:
      '<ellipse cx="60" cy="64" rx="42" ry="38" fill="#90A4AE"/>' +
      '<ellipse cx="20" cy="58" rx="17" ry="28" fill="#78909C"/>' +
      '<ellipse cx="100" cy="58" rx="17" ry="28" fill="#78909C"/>' +
      '<circle cx="42" cy="56" r="6" fill="#37474F"/>' +
      '<circle cx="78" cy="56" r="6" fill="#37474F"/>' +
      '<path d="M56 82 Q52 106 62 108 Q72 110 70 92 Q68 84 60 86 Q56 88 56 82 Z" fill="#90A4AE"/>' +
      '<path d="M34 98 Q30 112 46 112" stroke="#78909C" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M86 98 Q90 112 74 112" stroke="#78909C" stroke-width="7" fill="none" stroke-linecap="round"/>' },
    { id: 'rabbit', name: 'Kelinci', svg:
      '<ellipse cx="38" cy="26" rx="13" ry="28" fill="#F5F0E8"/>' +
      '<ellipse cx="82" cy="26" rx="13" ry="28" fill="#F5F0E8"/>' +
      '<ellipse cx="38" cy="26" rx="7" ry="18" fill="#F2A5B8"/>' +
      '<ellipse cx="82" cy="26" rx="7" ry="18" fill="#F2A5B8"/>' +
      '<circle cx="60" cy="62" r="36" fill="#F5F0E8"/>' +
      '<circle cx="46" cy="58" r="6" fill="#4A3636"/>' +
      '<circle cx="74" cy="58" r="6" fill="#4A3636"/>' +
      '<circle cx="60" cy="72" r="7" fill="#F2A5B8"/>' +
      '<path d="M60 79 L55 86 M60 79 l5 7" stroke="#4A3636" stroke-width="4" fill="none" stroke-linecap="round"/>' },
    { id: 'duck', name: 'Bebek', svg:
      '<circle cx="60" cy="56" r="38" fill="#F6D32D"/>' +
      '<circle cx="44" cy="50" r="6" fill="#333333"/>' +
      '<ellipse cx="62" cy="80" rx="20" ry="11" fill="#FF9F43"/>' +
      '<path d="M62 70 L62 90 M50 79 L74 79" stroke="#D08A00" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M30 40 Q44 14 66 26 Q82 36 76 48" stroke="#E8B93C" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="14" cy="84" r="9" fill="#F6D32D"/>' },
    { id: 'fish', name: 'Ikan', svg:
      '<ellipse cx="54" cy="60" rx="36" ry="24" fill="#5AA9E6"/>' +
      '<path d="M84 58 L110 38 L110 82 Z" fill="#4178B8"/>' +
      '<circle cx="40" cy="54" r="6" fill="#37474F"/>' +
      '<path d="M72 40 Q64 34 58 40" stroke="#4178B8" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M70 82 Q62 88 56 82" stroke="#4178B8" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M96 50 Q88 60 82 58" stroke="#5AA9E6" stroke-width="4" fill="none" stroke-linecap="round"/>' },
    { id: 'bird', name: 'Burung', svg:
      '<circle cx="56" cy="58" r="34" fill="#E53935"/>' +
      '<path d="M38 22 L46 34 L30 36 Z" fill="#C62828"/>' +
      '<path d="M84 52 L106 58 L84 64 Z" fill="#FF9F43"/>' +
      '<circle cx="44" cy="50" r="6" fill="#333333"/>' +
      '<ellipse cx="52" cy="70" rx="13" ry="11" fill="#C62828"/>' +
      '<path d="M64 78 Q82 74 90 60" stroke="#C62828" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<path d="M76 88 L84 98" stroke="#FFB300" stroke-width="5" stroke-linecap="round"/>' },
    { id: 'turtle', name: 'Kura-kura', svg:
      '<ellipse cx="60" cy="66" rx="44" ry="30" fill="#6FBF44"/>' +
      '<path d="M60 38 L60 94 M30 52 L90 52 M24 78 L96 78 M60 52 L44 78 M60 52 L76 78 M44 56 L30 46 M76 56 L90 46" stroke="#43A047" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="36" cy="40" r="14" fill="#43A047"/>' +
      '<circle cx="32" cy="36" r="4" fill="#263238"/>' +
      '<ellipse cx="22" cy="90" rx="12" ry="8" fill="#43A047"/>' +
      '<ellipse cx="98" cy="90" rx="12" ry="8" fill="#43A047"/>' +
      '<path d="M60 100 Q56 112 66 112 Q76 112 70 100" stroke="#43A047" stroke-width="7" fill="none" stroke-linecap="round"/>' }
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
    isRoundDone: isRoundDone
  };
});
