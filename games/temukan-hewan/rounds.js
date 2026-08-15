// rounds.js (UMD-lite: works as script tag global AND CommonJS module)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Rounds = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Ramping: 1-2 easy (6 kartu), 3-5 medium (8 kartu), 6-8 hard (12 kartu)
  var ROUND_SPECS = [
    { cards: 6,  targets: 2, tier: 'easy'   },
    { cards: 6,  targets: 3, tier: 'easy'   },
    { cards: 8,  targets: 2, tier: 'medium' },
    { cards: 8,  targets: 2, tier: 'medium' },
    { cards: 8,  targets: 2, tier: 'medium' },
    { cards: 12, targets: 3, tier: 'hard'   },
    { cards: 12, targets: 3, tier: 'hard'   },
    { cards: 12, targets: 3, tier: 'hard'   }
  ];

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  // Pick n distractor ids from pool, cycling when pool is smaller than n.
  function fillFrom(pool, n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push(pool[i % pool.length].id);
    }
    return out;
  }

  function generateRound(roundIndex, animals) {
    if (roundIndex < 0 || roundIndex >= ROUND_SPECS.length) {
      throw new RangeError('roundIndex out of range: ' + roundIndex);
    }
    var spec = ROUND_SPECS[roundIndex];
    var target = animals[Math.floor(Math.random() * animals.length)];
    var same = animals.filter(function (a) {
      return a.id !== target.id && a.group === target.group;
    });
    var diff = animals.filter(function (a) {
      return a.id !== target.id && a.group !== target.group;
    });
    var needed = spec.cards - spec.targets;
    var distractorIds;
    if (spec.tier === 'hard' && same.length > 0) {
      distractorIds = [same[0].id].concat(fillFrom(diff, needed - 1));
    } else {
      distractorIds = fillFrom(diff.length > 0 ? diff : animals, needed);
    }
    var cards = [];
    for (var t = 0; t < spec.targets; t++) {
      cards.push({ id: target.id, isTarget: true });
    }
    distractorIds.forEach(function (id) {
      cards.push({ id: id, isTarget: false });
    });
    return {
      index: roundIndex,
      spec: spec,
      tier: spec.tier,
      targetId: target.id,
      targetName: target.name,
      cards: shuffle(cards)
    };
  }

  return { ROUND_SPECS: ROUND_SPECS, shuffle: shuffle, generateRound: generateRound };
});
