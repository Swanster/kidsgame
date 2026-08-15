// game.js
(function (root) {
  'use strict';

  var Animals = root.Animals;
  var Rounds = root.Rounds;
  var GameAudio = root.GameAudio;

  var PRIDE = ['Hebat!', 'Keren!', 'Luar biasa!', 'Pintar!'];
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var TOTAL_ROUNDS = 8;

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',      // 'menu' | 'round' | 'end'
    roundIndex: 0,
    stars: 0,
    remaining: 0,
    perfect: true,
    round: null
  };

  function $(id) { return document.getElementById(id); }

  function svgOf(animal, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 120 120" role="img" aria-label="' +
      animal.name + '">' + animal.svg + '</svg>';
  }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.endScreen = $('end-screen');
    els.celebrate = $('celebrate');
    els.grid = $('grid');
    els.targetSvg = $('target-svg');
    els.targetName = $('target-name');
    els.stars = $('stars');
    els.endTitle = $('end-title');

    $('btn-start').addEventListener('pointerdown', startSession);
    $('btn-again').addEventListener('pointerdown', backToDashboard);
    $('btn-celebrate').addEventListener('pointerdown', continueAfterCelebrate);
    $('btn-sound').addEventListener('pointerdown', toggleSound);

    render('menu');
  }

  function toggleSound() {
    GameAudio.setMuted(!GameAudio.isMuted());
    $('btn-sound').innerHTML = GameAudio.isMuted() ? ICON_MUTED : ICON_SOUND;
    if (!GameAudio.isMuted()) GameAudio.unlock();
  }

  function startSession() {
    GameAudio.unlock();
    state.roundIndex = 0;
    state.stars = 0;
    startRound();
  }

  function startRound() {
    state.round = Rounds.generateRound(state.roundIndex, Animals.ANIMALS);
    state.remaining = state.round.spec.targets;
    state.perfect = true;
    render('round');
    GameAudio.speak('Ketuk semua ' + state.round.targetName.toLowerCase() + '!');
  }

  function render(screen) {
    state.screen = screen;
    els.menu.classList.toggle('hidden', screen !== 'menu');
    els.roundScreen.classList.toggle('hidden', screen !== 'round');
    els.endScreen.classList.toggle('hidden', screen !== 'end');
    els.celebrate.classList.add('hidden');
    if (screen === 'round') {
      var target = Animals.ANIMAL_BY_ID[state.round.targetId];
      els.targetSvg.innerHTML = svgOf(target, 'target');
      els.targetName.textContent = target.name;
      renderGrid();
    } else if (screen === 'end') {
      renderEnd();
    }
  }

  function renderGrid() {
    els.grid.innerHTML = '';
    state.round.cards.forEach(function (card) {
      var animal = Animals.ANIMAL_BY_ID[card.id];
      var el = document.createElement('div');
      el.className = 'card';
      el.dataset.isTarget = card.isTarget ? '1' : '0';
      el.innerHTML = svgOf(animal);
      el.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onCardTap(el, card);
      });
      els.grid.appendChild(el);
    });
  }

  function onCardTap(el, card) {
    if (state.screen !== 'round') return;
    if (el.classList.contains('found')) return;
    if (card.isTarget) {
      el.classList.add('found');
      state.remaining--;
      GameAudio.fx('ding');
      if (Math.random() < 0.4 && state.remaining > 0) {
        GameAudio.speak(PRIDE[Math.floor(Math.random() * PRIDE.length)]);
      }
      if (state.remaining === 0) finishRound();
    } else {
      state.perfect = false;
      el.classList.remove('shake');
      void el.offsetWidth; // restart animation
      el.classList.add('shake');
      GameAudio.fx('wrong');
    }
  }

  function finishRound() {
    state.stars += state.perfect ? 1 : 0;
    GameAudio.fx('cheer');
    GameAudio.speak(Math.random() < 0.5 ? 'Yeay!' : 'Bagus sekali!');
    showCelebrate();
  }

  function showCelebrate() {
    els.celebrate.classList.remove('hidden');
    var conf = els.celebrate.querySelector('#confetti');
    conf.innerHTML = '';
    var colors = ['#FF9F43', '#6FBF44', '#5AA9E6', '#F2A5B8', '#F6D32D'];
    for (var i = 0; i < 14; i++) {
      var piece = document.createElement('i');
      piece.style.left = (Math.random() * 100) + '%';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
      piece.style.animationDelay = (Math.random() * 0.4) + 's';
      conf.appendChild(piece);
    }
  }

  function continueAfterCelebrate() {
    state.roundIndex++;
    if (state.roundIndex >= TOTAL_ROUNDS) {
      render('end');
    } else {
      startRound();
    }
  }

  function backToDashboard() {
    clearTimeout(returnTimer);
    window.location.href = '../../index.html';
  }

  function renderEnd() {
    clearTimeout(returnTimer);
    var maxStars = 8;
    els.stars.innerHTML = '';
    for (var i = 0; i < maxStars; i++) {
      var s = document.createElement('span');
      s.className = 'star' + (i < state.stars ? ' filled' : '');
      s.innerHTML = STAR_SVG;
      els.stars.appendChild(s);
    }
    if (root.Profiles) root.Profiles.addScore('temukan-hewan', state.stars);
    returnTimer = setTimeout(backToDashboard, 6000);
    els.endTitle.textContent =
      state.stars === maxStars ? 'Sempurna! 🌟' :
      state.stars >= 5 ? 'Hebat sekali!' :
      state.stars >= 3 ? 'Mantap!' : 'Ayo coba lagi!';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.Game = { init: init };
})(typeof window !== 'undefined' ? window : this);
