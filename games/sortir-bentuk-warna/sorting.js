// sorting.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Sorting = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SHAPES = [
    { id: 'circle', name: 'Lingkaran', body: '<circle cx="24" cy="24" r="14" fill="{FILL}" stroke="{STROKE}" stroke-width="4"/>' },
    { id: 'square', name: 'Kotak', body: '<rect x="10" y="10" width="28" height="28" rx="4" fill="{FILL}" stroke="{STROKE}" stroke-width="4" stroke-linejoin="round"/>' },
    { id: 'triangle', name: 'Segitiga', body: '<path d="M24 8 L40 34 L8 34 Z" fill="{FILL}" stroke="{STROKE}" stroke-width="4" stroke-linejoin="round"/>' },
    { id: 'star', name: 'Bintang', body: '<path d="M24 7 l4.5 9 9.8 1.1 -7.2 6.8 2 9.7L24 29.4 15 33.6l2 -9.7L9.8 17.1l9.8 -1.1Z" fill="{FILL}" stroke="{STROKE}" stroke-width="4" stroke-linejoin="round"/>' }
  ];

  var COLORS = [
    { id: 'red', name: 'Merah', hex: '#E53935' },
    { id: 'blue', name: 'Biru', hex: '#1E88E5' },
    { id: 'yellow', name: 'Kuning', hex: '#F9A825' },
    { id: 'green', name: 'Hijau', hex: '#43A047' }
  ];

  var ROUNDS = [
    { attr: 'color', bins: ['red', 'blue'], count: 4 },
    { attr: 'color', bins: ['yellow', 'green'], count: 4 },
    { attr: 'color', bins: ['red', 'yellow', 'blue'], count: 5 },
    { attr: 'color', bins: ['red', 'blue', 'yellow', 'green'], count: 5 },
    { attr: 'shape', bins: ['circle', 'square'], count: 5 },
    { attr: 'shape', bins: ['circle', 'square', 'triangle'], count: 5 },
    { attr: 'shape', bins: ['circle', 'square', 'triangle', 'star'], count: 5 },
    { attr: 'color', bins: ['red', 'blue', 'yellow', 'green'], count: 5 }
  ];

  function byId(pool, id) {
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function makeItem(shapeId, colorId) {
    var shape = byId(SHAPES, shapeId);
    var color = byId(COLORS, colorId);
    if (!shape || !color) return null;
    return {
      shape: shapeId,
      color: colorId,
      svg: shape.body.replace('{FILL}', color.hex).replace('{STROKE}', '#4A3728')
    };
  }

  function binIcon(attr, id) {
    if (attr === 'color') {
      var c = byId(COLORS, id);
      if (!c) return null;
      return '<svg viewBox="0 0 48 48" role="img" aria-label="' + c.name + '"><circle cx="24" cy="24" r="18" fill="' + c.hex + '" stroke="#4A3728" stroke-width="4"/></svg>';
    }
    if (attr === 'shape') {
      var s = byId(SHAPES, id);
      if (!s) return null;
      return '<svg viewBox="0 0 48 48" role="img" aria-label="' + s.name + '">' +
        s.body.replace('{FILL}', 'none').replace('{STROKE}', '#90A4AE') + '</svg>';
    }
    return null;
  }

  function matches(attr, item, binId) {
    if (!item) return false;
    if (attr === 'color') return item.color === binId;
    if (attr === 'shape') return item.shape === binId;
    return false;
  }

  function roundItems(roundIndex) {
    var r = ROUNDS[roundIndex];
    if (!r) return [];
    var items = [];
    var fixedShapes = ['circle', 'square', 'triangle', 'star'];
    for (var i = 0; i < r.count; i++) {
      var shapeId, colorId;
      if (r.attr === 'color') {
        colorId = r.bins[Math.floor(Math.random() * r.bins.length)];
        shapeId = roundIndex < 4 ? fixedShapes[roundIndex]
          : SHAPES[Math.floor(Math.random() * SHAPES.length)].id;
      } else {
        shapeId = r.bins[Math.floor(Math.random() * r.bins.length)];
        colorId = COLORS[Math.floor(Math.random() * COLORS.length)].id;
      }
      items.push(makeItem(shapeId, colorId));
    }
    return shuffle(items);
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
    SHAPES: SHAPES,
    COLORS: COLORS,
    ROUNDS: ROUNDS,
    makeItem: makeItem,
    binIcon: binIcon,
    matches: matches,
    roundItems: roundItems,
    shuffle: shuffle,
    isRoundDone: isRoundDone
  };
});
