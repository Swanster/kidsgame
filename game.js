// game.js
(function (root) {
  'use strict';

  var Animals = root.Animals;
  var Rounds = root.Rounds;
  var GameAudio = root.GameAudio;

  var PRIDE = ['Hebat!', 'Keren!', 'Luar biasa!', 'Pintar!'];
  var TOTAL_ROUNDS = 8;

  var els = {};
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
    $('btn-again').addEventListener('pointerdown', startSession);
    $('btn-celebrate').addEventListener('pointerdown', continueAfterCelebrate);
    $('btn-sound').addEventListener('pointerdown', toggleSound);

    render('menu');
  }

  function toggleSound() {
    GameAudio.setMuted(!GameAudio.isMuted());
    $('btn-sound').textContent = GameAudio.isMuted() ? '🔇' : '🔊';
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

  function renderEnd() {
    var maxStars = 8;
    els.stars.innerHTML = '';
    for (var i = 0; i < maxStars; i++) {
      var s = document.createElement('span');
      s.className = 'star' + (i < state.stars ? ' filled' : '');
      s.textContent = '⭐';
      els.stars.appendChild(s);
    }
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
