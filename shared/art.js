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

  // wheel helper — dipakai VEHICLES
  function wheel(cx, cy, r) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#4A3728"' + O(3) + '/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.45) + '" fill="#9E9E9E"/>' +
      '<circle cx="' + (cx - r * 0.15) + '" cy="' + (cy - r * 0.15) + '" r="' + (r * 0.15) + '" fill="#FFFFFF"/>';
  }

  var ANIMALS = [{ id: 'kucing', name: 'Kucing', group: 'feline', svg: kucing }];  // diperluas di Task 3

  var VEHICLES = [
    { id: 'car', name: 'Mobil', svg:
      groundShadow(60, 108, 44) +
      '<path d="M22 70 L30 46 a6 6 0 0 1 6 -5 h32 a6 6 0 0 1 6 5 l8 24 h-52 Z" fill="#E53935"' + O(5) + ' stroke-linejoin="round"/>' +
      '<rect x="36" y="42" width="26" height="19" rx="5" fill="#F0C9A0"' + O(3) + '/>' +
      '<path d="M42 46 l4 4 M56 46 l4 4" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="34" cy="64" r="4" fill="#FFE082"' + O(2.5) + '/>' +
      wheel(34, 84, 13) + wheel(78, 84, 13) },
    { id: 'train', name: 'Kereta', svg:
      groundShadow(60, 108, 46) +
      '<path d="M18 66 L26 42 h52 l6 13 a4 4 0 0 1 1 4 v7 h-65 Z" fill="#1E88E5"' + O(5) + ' stroke-linejoin="round"/>' +
      '<rect x="34" y="44" width="24" height="16" rx="4" fill="#F0C9A0"' + O(3) + '/>' +
      '<path d="M16 62 l6 -12 h8 v12 Z" fill="#7E57C2"' + O(3) + ' stroke-linejoin="round"/>' +
      '<rect x="26" y="54" width="6" height="7" rx="2" fill="#FFFFFF" opacity="0.85"/>' +
      '<circle cx="28" cy="36" r="6" fill="#FF7043"' + O(3) + '/>' +
      wheel(24, 84, 12) + wheel(52, 84, 12) + wheel(78, 84, 12) },
    { id: 'plane', name: 'Pesawat', svg:
      groundShadow(60, 108, 44) +
      '<path d="M20 74 a26 14 0 0 1 52 -6 l36 4 -8 10 -38 -2 a30 12 0 0 0 -18 4 l-16 -4 a8 8 0 0 1 -8 -6 Z" fill="#FB8C00"' + O(4) + ' stroke-linejoin="round"/>' +
      '<path d="M40 46 l-14 -18 M46 52 l8 -24 M34 74 l-16 -6" stroke="#FBE8C8" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M90 70 l10 -16 8 16 Z" fill="#E08A2E"' + O(3) + ' stroke-linejoin="round"/>' +
      '<path d="M30 82 h42" stroke="#FBE8C8" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="44" cy="62" r="7" fill="#F0C9A0"' + O(3) + '/>' +
      '<circle cx="42" cy="60" r="2" fill="#FFFFFF"/>' +
      '<circle cx="14" cy="74" r="4" fill="#4A3728"' + O(2.5) + '/>' +
      '<path d="M14 62 v24 M4 74 h20" stroke="#4A3728" stroke-width="4" stroke-linecap="round"/>' },
    { id: 'ship', name: 'Kapal', svg:
      '<path d="M18 72 a38 14 0 0 0 30 12 a14 14 0 0 0 10 -3 a38 12 0 0 0 26 -8 l-8 26 h-50 Z" fill="#26C6DA"' + O(5) + ' stroke-linejoin="round"/>' +
      '<rect x="34" y="42" width="24" height="24" rx="5" fill="#FBE8C8"' + O(4) + '/>' +
      '<path d="M38 46 h16 M38 52 h16 M38 58 h10" stroke="#E53935" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M38 34 v8" stroke="#5A4630" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M38 34 l14 -3 v6 Z" fill="#E53935"' + O(2.5) + ' stroke-linejoin="round"/>' +
      '<circle cx="40" cy="74" r="3.5" fill="#FFFFFF"' + O(2) + '/>' +
      '<circle cx="52" cy="76" r="3.5" fill="#FFFFFF"' + O(2) + '/>' +
      '<ellipse cx="60" cy="78" rx="16" ry="4" fill="rgba(0,0,0,0.12)"/>' +
      '<path d="M22 78 q16 -8 32 0 M58 76 q14 -6 28 0" stroke="#1E88E5" stroke-width="4" fill="none" stroke-linecap="round"/>' },
    { id: 'bike', name: 'Sepeda', svg:
      groundShadow(60, 106, 46) +
      wheel(28, 74, 17) + wheel(82, 74, 17) +
      '<path d="M28 74 L48 46 L76 74 M48 46 L62 74 M60 55 L48 46 M36 70 L56 66" stroke="#E53935" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="46" y="34" width="7" height="18" rx="3.5" fill="#4A3728" transform="rotate(18 49 43)"/>' +
      '<path d="M72 40 a6 6 0 1 0 0.1 0" stroke="#4A3728" stroke-width="4" fill="none"/>' },
    { id: 'tractor', name: 'Traktor', svg:
      groundShadow(60, 110, 46) +
      '<path d="M20 62 L28 42 h34 a4 4 0 0 1 4 4 v16 h-46 Z" fill="#43A047"' + O(5) + ' stroke-linejoin="round"/>' +
      '<rect x="44" y="34" width="18" height="16" rx="4" fill="#FFE082"' + O(3) + '/>' +
      '<rect x="22" y="58" width="40" height="7" rx="3.5" fill="#8A5A33"' + O(3) + '/>' +
      wheel(28, 78, 14) + wheel(82, 84, 19) +
      '<rect x="16" y="66" width="23" height="5" rx="2.5" fill="#B39DDB"' + O(2.5) + '/>' },
    { id: 'bus', name: 'Bus', svg:
      groundShadow(60, 108, 46) +
      '<rect x="14" y="38" width="70" height="42" rx="10" fill="#FFCA28"' + O(5) + '/>' +
      '<rect x="20" y="46" width="16" height="14" rx="3" fill="#F0C9A0"' + O(2.5) + '/>' +
      '<rect x="40" y="46" width="16" height="14" rx="3" fill="#F0C9A0"' + O(2.5) + '/>' +
      '<rect x="60" y="46" width="16" height="14" rx="3" fill="#F0C9A0"' + O(2.5) + '/>' +
      '<path d="M56 70 l-3 -4 M56 70 l3 -4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>' +
      wheel(30, 84, 12) + wheel(78, 84, 12) },
    { id: 'helicopter', name: 'Helikopter', svg:
      groundShadow(60, 106, 44) +
      '<ellipse cx="60" cy="62" rx="34" ry="20" fill="#7E57C2"' + O(5) + '/>' +
      '<path d="M34 58 a16 12 0 0 1 0 -16 l-22 -16" stroke="#7E57C2" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<circle cx="12" cy="26" r="7" fill="#B39DDB"' + O(3) + '/>' +
      '<path d="M24 44 l52 -8 M88 34 l6 -10" stroke="#4A3728" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="26" y="52" width="20" height="14" rx="4" fill="#F0C9A0"' + O(3) + '/>' +
      '<rect x="50" y="58" width="10" height="8" rx="3" fill="#F0C9A0"' + O(2.5) + '/>' +
      '<path d="M30 55 l6 -4" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="90" cy="63" r="3.5" fill="#FFE082"' + O(2) + '/>' +
      '<path d="M50 80 h22 l-6 12 h-10 Z" fill="#8E24AA"' + O(3) + ' stroke-linejoin="round"/>' }
  ];

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
