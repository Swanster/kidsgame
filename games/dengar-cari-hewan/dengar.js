(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Dengar = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TOTAL_ROUNDS = 8;

  function pick(ids) {
    return ids[Math.floor(Math.random() * ids.length)];
  }

  function generateRound(animalIds, prevTargetId) {
    if (!animalIds || animalIds.length < 2) {
      throw new RangeError('generateRound membutuhkan minimal dua animalIds');
    }
    var targetPool = animalIds;
    if (prevTargetId != null) {
      targetPool = animalIds.filter(function (id) { return id !== prevTargetId; });
    }
    var targetId = pick(targetPool);
    var distractors = animalIds.filter(function (id) { return id !== targetId; });
    var distractorId = pick(distractors);
    var choices = Math.random() < 0.5
      ? [targetId, distractorId]
      : [distractorId, targetId];
    return { targetId: targetId, choices: choices };
  }

  function makeSession(animalIds, nRounds) {
    var count = nRounds == null ? TOTAL_ROUNDS : nRounds;
    var rounds = [];
    var previous = null;
    for (var i = 0; i < count; i++) {
      var round = generateRound(animalIds, previous);
      rounds.push(round);
      previous = round.targetId;
    }
    return rounds;
  }

  function score(firstTry) { return firstTry ? 1 : 0; }

  return {
    TOTAL_ROUNDS: TOTAL_ROUNDS,
    generateRound: generateRound,
    makeSession: makeSession,
    score: score
  };
});
