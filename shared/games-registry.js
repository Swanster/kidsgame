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
    }
  ];
  return { GAMES: GAMES };
});
