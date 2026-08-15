// memory.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Memory = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function buildBoard(pairs) {
    if (!Number.isInteger(pairs) || pairs < 1) return [];
    var cards = [];
    var id = 0;
    for (var p = 0; p < pairs; p++) {
      cards.push({ pair: p, id: 'c' + (id++) });
      cards.push({ pair: p, id: 'c' + (id++) });
    }
    return shuffle(cards);
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

  function isMatch(a, b) {
    return !!(a && b && a.pair === b.pair);
  }

  function boardDone(foundPairs, totalPairs) {
    return foundPairs.length >= totalPairs;
  }

  return { buildBoard: buildBoard, shuffle: shuffle, isMatch: isMatch, boardDone: boardDone };
});
