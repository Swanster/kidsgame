// simon.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Simon = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PADS = [
    { id: 'red', name: 'Merah', hex: '#E53935', shape: 'circle' },
    { id: 'blue', name: 'Biru', hex: '#1E88E5', shape: 'square' },
    { id: 'yellow', name: 'Kuning', hex: '#F9A825', shape: 'triangle' },
    { id: 'green', name: 'Hijau', hex: '#43A047', shape: 'star' }
  ];

  var SEQUENCE_LENGTHS = [2, 2, 3, 3, 4, 4, 5, 5];

  function padById(id) {
    for (var i = 0; i < PADS.length; i++) {
      if (PADS[i].id === id) return PADS[i];
    }
    return null;
  }

  function makeSequence(len) {
    if (typeof len !== 'number' || len <= 0) return null;
    var seq = [];
    for (var i = 0; i < len; i++) {
      seq.push(PADS[Math.floor(Math.random() * PADS.length)].id);
    }
    return seq;
  }

  var STAR_PATH = 'M24 14 L27.4 21.2 L35.2 21.8 L29.3 27.3 L31 35 L24 30.9 L17 35 L18.7 27.3 L12.8 21.8 L20.6 21.2 Z';

  function shapeMarkup(shape) {
    if (shape === 'circle') return '<circle cx="24" cy="24" r="10" fill="#FFFFFF"/>';
    if (shape === 'square') return '<rect x="15" y="15" width="18" height="18" rx="2" fill="#FFFFFF"/>';
    if (shape === 'triangle') return '<polygon points="24,13 35,34 13,34" fill="#FFFFFF"/>';
    if (shape === 'star') return '<path d="' + STAR_PATH + '" fill="#FFFFFF"/>';
    return null;
  }

  function padSVG(colorId) {
    var p = padById(colorId);
    if (!p) return null;
    var shape = shapeMarkup(p.shape);
    if (!shape) return null;
    return '<svg viewBox="0 0 48 48" role="img" aria-label="Pad ' + p.name + '">' +
      '<rect x="1" y="1" width="46" height="46" rx="10" fill="' + p.hex + '" stroke="#4A3728" stroke-width="2"/>' +
      shape +
      '</svg>';
  }

  function matches(tap, expected) {
    return tap === expected;
  }

  function isRoundDone(placed, len) {
    return len > 0 && placed >= len;
  }

  return {
    PADS: PADS,
    SEQUENCE_LENGTHS: SEQUENCE_LENGTHS,
    makeSequence: makeSequence,
    padSVG: padSVG,
    matches: matches,
    isRoundDone: isRoundDone
  };
});
