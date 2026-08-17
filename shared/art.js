(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Art = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var OUTLINE = '#5A4630';

  var PALETTE = [
    '#3A2A1E', '#4A3728', '#5A4630', '#6D4C41', '#8A5A33', '#9DA9B5', '#A3B8C4',
    '#B07A4F', '#B39DDB', '#B97A45', '#C08A5C', '#C98E5A', '#D9A87C', '#E0A86E',
    '#E4E8EC', '#E08A2E', '#E53935', '#F0C060', '#F0C9A0', '#F4A63A', '#F6D9B8',
    '#F9A825', '#F9C6D2', '#FB8C00', '#FBE8C8', '#FF8A80', '#FFB3B3', '#FFD54F',
    '#FFE082', '#FF7043', '#7CB342', '#43A047', '#26C6DA', '#1E88E5', '#7E57C2',
    '#8E24AA', '#FFFFFF', '#FFCA28', '#4DB6AC', '#9E9E9E', '#F0E6D2'
  ];

  function O(w) { return ' stroke="#5A4630" stroke-width="' + (w || 4) + '"'; }

  function eyesE(cx, cy, s) {
    s = s || 1;
    return '<circle cx="' + (cx - 16 * s) + '" cy="' + (cy - 2 * s) + '" r="' + (9 * s) + '" fill="#FFFFFF" stroke="#5A4630" stroke-width="' + (3 * s) + '"/>' +
      '<circle cx="' + (cx + 16 * s) + '" cy="' + (cy - 2 * s) + '" r="' + (9 * s) + '" fill="#FFFFFF" stroke="#5A4630" stroke-width="' + (3 * s) + '"/>' +
      '<circle cx="' + (cx - 16 * s) + '" cy="' + (cy + 1 * s) + '" r="' + (4.5 * s) + '" fill="#3A2A1E"/>' +
      '<circle cx="' + (cx + 16 * s) + '" cy="' + (cy + 1 * s) + '" r="' + (4.5 * s) + '" fill="#3A2A1E"/>' +
      '<circle cx="' + (cx - 14.5 * s) + '" cy="' + (cy - 3.5 * s) + '" r="' + (1.8 * s) + '" fill="#FFFFFF"/>' +
      '<circle cx="' + (cx + 17.5 * s) + '" cy="' + (cy - 3.5 * s) + '" r="' + (1.8 * s) + '" fill="#FFFFFF"/>';
  }

  function brows(cx, cy, s) {
    s = s || 1;
    return '<path d="M' + (cx - 22 * s) + ' ' + (cy - 10 * s) + ' q ' + (5 * s) + ' ' + (-4 * s) + ' ' + (10 * s) + ' ' + (-1 * s) + '" stroke="#5A4630" stroke-width="' + (3 * s) + '" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + (cx + 12 * s) + ' ' + (cy - 11 * s) + ' q ' + (5 * s) + ' ' + (-3 * s) + ' ' + (10 * s) + ' ' + (1 * s) + '" stroke="#5A4630" stroke-width="' + (3 * s) + '" fill="none" stroke-linecap="round"/>';
  }

  function blush(cx, cy, s) {
    s = s || 1;
    return '<ellipse cx="' + (cx - 23 * s) + '" cy="' + (cy + 8 * s) + '" rx="' + (7 * s) + '" ry="' + (4.5 * s) + '" fill="#FFB3B3"/>' +
      '<ellipse cx="' + (cx + 23 * s) + '" cy="' + (cy + 8 * s) + '" rx="' + (7 * s) + '" ry="' + (4.5 * s) + '" fill="#FFB3B3"/>';
  }

  function muzzle(cx, cy, s, opts) {
    s = s || 1;
    opts = opts || {};
    var out = '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (16 * s) + '" ry="' + (12 * s) + '" fill="#F6D9B8"/>' +
      '<ellipse cx="' + cx + '" cy="' + (cy - 5 * s) + '" rx="' + (6 * s) + '" ry="' + (4.5 * s) + '" fill="#3A2A1E"/>' +
      '<ellipse cx="' + (cx - 2 * s) + '" cy="' + (cy - 6.5 * s) + '" rx="' + (2 * s) + '" ry="' + (1.4 * s) + '" fill="#FFFFFF"/>' +
      '<path d="M' + (cx - 6 * s) + ' ' + (cy + 4 * s) + ' q ' + (6 * s) + ' ' + (4 * s) + ' ' + (12 * s) + ' 0" stroke="#5A4630" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
    if (opts.tongue !== false) {
      out += '<ellipse cx="' + cx + '" cy="' + (cy + 11 * s) + '" rx="' + (5 * s) + '" ry="' + (5.5 * s) + '" fill="#FF8A80" stroke="#5A4630" stroke-width="' + (3 * s) + '"/>';
    }
    return out;
  }

  function body(cx, cy, s, color) {
    s = s || 1;
    color = color || '#E0A86E';
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (26 * s) + '" ry="' + (13 * s) + '" fill="' + color + '" stroke="#5A4630" stroke-width="' + (5 * s) + '"/>' +
      '<ellipse cx="' + cx + '" cy="' + (cy + 1 * s) + '" rx="' + (15 * s) + '" ry="' + (8 * s) + '" fill="#F0C9A0"/>';
  }

  function collarTag(cx, cy, s) {
    s = s || 1;
    return '<rect x="' + (cx - 20 * s) + '" y="' + (cy - 12 * s) + '" width="' + (40 * s) + '" height="' + (9 * s) + '" rx="' + (4.5 * s) + '" fill="#E53935" stroke="#5A4630" stroke-width="' + (3.5 * s) + '"/>' +
      '<circle cx="' + cx + '" cy="' + (cy - 2 * s) + '" r="' + (6 * s) + '" fill="#FFD54F" stroke="#5A4630" stroke-width="' + (3 * s) + '"/>';
  }

  function pawsY(cx, cy, s) {
    s = s || 1;
    return '<ellipse cx="' + (cx - 13 * s) + '" cy="' + cy + '" rx="' + (8 * s) + '" ry="' + (5.5 * s) + '" fill="#F6D9B8" stroke="#5A4630" stroke-width="' + (3.5 * s) + '"/>' +
      '<ellipse cx="' + (cx + 13 * s) + '" cy="' + cy + '" rx="' + (8 * s) + '" ry="' + (5.5 * s) + '" fill="#F6D9B8" stroke="#5A4630" stroke-width="' + (3.5 * s) + '"/>';
  }

  function groundShadow(cx, cy, rx, s) {
    s = s || 1;
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (rx * s) + '" ry="' + (5 * s) + '" fill="rgba(0,0,0,0.12)"/>';
  }

  var FALLBACK =
    '<path d="M60 18 l7.5 16.5 18 2.5 -13 12.5 3 18 -15.5 -8.5 -15.5 8.5 3 -18 -13 -12.5 18 -2.5 Z" fill="#FFCA28"' + O(5) + ' stroke-linejoin="round"/>' +
    '<circle cx="60" cy="42" r="3.5" fill="#FFFFFF"/>' +
    '<circle cx="44" cy="72" r="2.5" fill="#FFFFFF"/>' +
    '<ellipse cx="60" cy="100" rx="20" ry="4" fill="rgba(0,0,0,0.12)"/>';

  // KUCING (seed Task 1; lengkap di Task 3)
  var kucing =
    groundShadow(60, 112, 36) +
    '<path d="M32 44 L44 12 L58 36 Z" fill="#B97A45"' + O() + ' stroke-linejoin="round"/>' +
    '<path d="M88 44 L76 12 L62 36 Z" fill="#B97A45"' + O() + ' stroke-linejoin="round"/>' +
    '<path d="M42 42 L46 22 L54 36 Z" fill="#F9C6D2"' + O(2) + ' stroke-linejoin="round"/>' +
    '<path d="M78 42 L74 22 L66 36 Z" fill="#F9C6D2"' + O(2) + ' stroke-linejoin="round"/>' +
    '<circle cx="60" cy="60" r="34" fill="#E0A86E"' + O(5) + '/>' +
    '<path d="M45 34 l4 -9 M55 32 l3 -8 M65 32 l3 -8 M75 34 l4 -9" stroke="#B97A45" stroke-width="4" stroke-linecap="round"/>' +
    eyesE(60, 54) +
    brows(60, 52) +
    blush(60, 66) +
    muzzle(60, 70) +
    '<path d="M26 62 L12 58 M26 68 L12 68 M26 74 L12 78 M94 62 L108 58 M94 68 L108 68 M94 74 L108 78" stroke="#5A4630" stroke-width="2" stroke-linecap="round"/>' +
    body(60, 100) +
    collarTag(60, 100) +
    pawsY(60, 113);

  // CAR (seed Task 1; lengkap di Task 2)
  function wheel(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#4A3728"' + O(3) + '/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.45) + '" fill="#9E9E9E"/>' +
      '<circle cx="' + (cx - r * 0.15) + '" cy="' + (cy - r * 0.15) + '" r="' + (r * 0.15) + '" fill="#FFFFFF"/>';
  }
  var car =
    groundShadow(60, 108, 44) +
    '<path d="M22 70 L30 46 a6 6 0 0 1 6 -5 h32 a6 6 0 0 1 6 5 l8 24 h-52 Z" fill="#E53935"' + O(5) + ' stroke-linejoin="round"/>' +
    '<rect x="36" y="42" width="26" height="19" rx="5" fill="#F0C9A0"' + O(3) + '/>' +
    '<path d="M42 46 l4 4 M56 46 l4 4" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="34" cy="64" r="4" fill="#FFE082"' + O(2.5) + '/>' +
    wheel(34, 84, 13) + wheel(78, 84, 13);

  var ANIMALS = [{ id: 'kucing', name: 'Kucing', group: 'feline', svg: kucing }];  // diperluas di Task 3
  var VEHICLES = [{ id: 'car', name: 'Mobil', svg: car }]; // diperluas di Task 2

  function catalogMap(arr) {
    var m = {};
    arr.forEach(function (e) { m[e.id] = e; });
    return m;
  }
  var animalById = null;
  var vehicleById = null;

  function unknown(kind, id) {
    console.error('[art] ' + kind + ' tak dikenal:', id);
    return FALLBACK;
  }

  function animalSvg(id) {
    if (!animalById) animalById = catalogMap(ANIMALS);
    var e = animalById[id];
    return e ? e.svg : unknown('animal', id);
  }

  function vehicleSvg(id) {
    if (!vehicleById) vehicleById = catalogMap(VEHICLES);
    var e = vehicleById[id];
    return e ? e.svg : unknown('vehicle', id);
  }

  return {
    OUTLINE: OUTLINE,
    PALETTE: PALETTE,
    FALLBACK: FALLBACK,
    ANIMALS: ANIMALS,
    VEHICLES: VEHICLES,
    animalSvg: animalSvg,
    vehicleSvg: vehicleSvg
  };
});
