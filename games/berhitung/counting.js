// counting.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Counting = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BALLOONS = [
    { id: 'red', name: 'Merah', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#E53935" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#E53935" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#E53935" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'orange', name: 'Oranye', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#FB8C00" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#FB8C00" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#FB8C00" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'yellow', name: 'Kuning', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#F9A825" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#F9A825" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#F9A825" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'green', name: 'Hijau', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#43A047" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#43A047" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#43A047" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'blue', name: 'Biru', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#1E88E5" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#1E88E5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#1E88E5" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'purple', name: 'Ungu', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#8E24AA" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#8E24AA" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#8E24AA" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'pink', name: 'Pink', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#EC407A" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#EC407A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#EC407A" stroke-width="3" stroke-linecap="round"/>' },
    { id: 'teal', name: 'Toska', svg: '<circle cx="24" cy="18" r="14" fill="none" stroke="#26C6DA" stroke-width="4"/><path d="M21 32 l3 5 3 -5" fill="none" stroke="#26C6DA" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 37 q-4 7 0 9" fill="none" stroke="#26C6DA" stroke-width="3" stroke-linecap="round"/>' }
  ];

  var OBJECTS_PER_ROUND = [1, 2, 3, 4, 5, 6, 7, 8];

  function layout(count) {
    if (!Number.isInteger(count) || count < 1 || count > 8) return [];
    var cols = count <= 1 ? 1 : count <= 3 ? 3 : count === 4 ? 2 : count <= 6 ? 3 : 4;
    var rows = Math.ceil(count / cols);
    var cellW = 100 / cols;
    var cellH = 100 / rows;
    var s = Math.floor((Math.min(cellW, cellH) - 8) * 100) / 100;
    var out = [];
    for (var i = 0; i < count; i++) {
      var c = i % cols;
      var r = Math.floor(i / cols);
      out.push({ x: (c + 0.5) * cellW, y: (r + 0.5) * cellH, s: s });
    }
    return out;
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

  function isDone(tapped, total) {
    return total > 0 && tapped >= total;
  }

  return { BALLOONS: BALLOONS, OBJECTS_PER_ROUND: OBJECTS_PER_ROUND, layout: layout, shuffle: shuffle, isDone: isDone };
});
