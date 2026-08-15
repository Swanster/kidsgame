// balls.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Balls = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var COLORS = [
    { id: 'red', name: 'Merah', hex: '#E53935' },
    { id: 'blue', name: 'Biru', hex: '#1E88E5' },
    { id: 'yellow', name: 'Kuning', hex: '#F9A825' },
    { id: 'green', name: 'Hijau', hex: '#43A047' }
  ];

  var BALLS_PER_ROUND = [4, 4, 6, 6, 8, 8, 10, 10];

  function byId(pool, id) {
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === id) return pool[i];
    }
    return null;
  }

  function makeRound(roundIndex) {
    var count = BALLS_PER_ROUND[roundIndex];
    if (!count) return null;
    var balls = [];
    for (var i = 0; i < count; i++) {
      balls.push({ id: 'ball-' + (i + 1), color: COLORS[i % COLORS.length].id });
    }
    balls = shuffle(balls);
    var instructions = shuffle(balls.map(function (b) { return { color: b.color }; }));
    return { balls: balls, instructions: instructions };
  }

  function ballSVG(colorId) {
    var c = byId(COLORS, colorId);
    if (!c) return null;
    return '<svg viewBox="0 0 48 48" role="img" aria-label="Bola ' + c.name + '">' +
      '<circle cx="24" cy="24" r="21" fill="' + c.hex + '" stroke="#4A3728" stroke-width="3"/>' +
      '<ellipse cx="17" cy="15" rx="7" ry="5" fill="#FFFFFF" opacity="0.45"/>' +
      '</svg>';
  }

  function matches(instColor, ballColor) {
    return instColor === ballColor;
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
    COLORS: COLORS,
    BALLS_PER_ROUND: BALLS_PER_ROUND,
    makeRound: makeRound,
    ballSVG: ballSVG,
    matches: matches,
    shuffle: shuffle,
    isRoundDone: isRoundDone
  };
});
