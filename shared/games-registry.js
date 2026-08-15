(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameRegistry = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var GAMES = [
    {
      id: 'temukan-hewan',
      name: 'Temukan Hewan',
      maxStars: 8,
      path: 'games/temukan-hewan/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="#7E57C2" stroke-width="4"/><path d="M30 30 L42 42" stroke="#7E57C2" stroke-width="4" stroke-linecap="round"/><path d="M14 22 Q17 25 26 22" stroke="#B39DDB" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="16" cy="17" r="2" fill="#B39DDB"/><circle cx="24" cy="17" r="2" fill="#B39DDB"/></svg>'
    },
    {
      id: 'memory-match',
      name: 'Memory Match',
      maxStars: 8,
      path: 'games/memory-match/index.html',
      icon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 26 h26 a4 4 0 0 1 4 4 v4 h-34 v-4 a4 4 0 0 1 4 -4 Z" fill="none" stroke="#E53935" stroke-width="4" stroke-linejoin="round"/><path d="M15 26 l4 -7 a3 3 0 0 1 6 0 l4 7" fill="none" stroke="#E53935" stroke-width="4" stroke-linecap="round"/><circle cx="14" cy="34" r="4.5" fill="#E53935"/><circle cx="30" cy="34" r="4.5" fill="#E53935"/><circle cx="14" cy="34" r="1.8" fill="#fff"/><circle cx="30" cy="34" r="1.8" fill="#fff"/></svg>'
    }
  ];
  return { GAMES: GAMES };
});
