(function (root) {
  'use strict';

  var Art = root.Art;
  var Dengar = root.Dengar;
  var GameAudio = root.GameAudio;
  var PRIDE = ['Hebat!', 'Keren!', 'Luar biasa!', 'Pintar!'];
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ANIMAL_IDS = Art.ANIMALS.map(function (a) { return a.id; });

  var els = {};
  var returnTimer = null;
  var state = { screen: 'menu', session: [], roundIndex: 0, stars: 0, firstTry: true, locked: false };

  function $(id) { return document.getElementById(id); }
  function animalOf(id) {
    return Art.ANIMALS.filter(function (a) { return a.id === id; })[0] || null;
  }
  function promptText() {
    var target = state.session[state.roundIndex].targetId;
    var animal = animalOf(target);
    return 'Mana ' + (animal ? animal.name : target) + '?';
  }
  function svgOf(id) {
    var animal = animalOf(id);
    var label = animal ? animal.name : id;
    return '<svg viewBox="0 0 120 120" role="img" aria-label="' + label + '">' +
      (animal ? animal.svg : Art.animalSvg(id)) + '</svg>';
  }

  function bindKeyboardActivation(id, action) {
    $(id).addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      action();
    });
  }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.endScreen = $('end-screen');
    els.celebrate = $('celebrate');
    els.grid = $('grid');
    els.stars = $('stars');
    els.endTitle = $('end-title');
    $('btn-start').addEventListener('pointerdown', startSession);
    $('btn-again').addEventListener('pointerdown', startSession);
    $('btn-celebrate').addEventListener('pointerdown', continueAfterCelebrate);
    $('btn-sound').addEventListener('pointerdown', toggleSound);
    $('btn-prompt').addEventListener('pointerdown', repeatPrompt);
    bindKeyboardActivation('btn-start', startSession);
    bindKeyboardActivation('btn-sound', toggleSound);
    bindKeyboardActivation('btn-prompt', repeatPrompt);
    bindKeyboardActivation('btn-celebrate', continueAfterCelebrate);
    bindKeyboardActivation('btn-again', startSession);
    render('menu');
  }

  function toggleSound() {
    GameAudio.setMuted(!GameAudio.isMuted());
    $('btn-sound').innerHTML = GameAudio.isMuted() ? ICON_MUTED : ICON_SOUND;
    if (!GameAudio.isMuted()) GameAudio.unlock();
  }

  function startSession() {
    clearTimeout(returnTimer);
    GameAudio.unlock();
    state.session = Dengar.makeSession(ANIMAL_IDS, Dengar.TOTAL_ROUNDS);
    state.roundIndex = 0;
    state.stars = 0;
    startRound();
  }

  function startRound() {
    state.firstTry = true;
    state.locked = false;
    render('round');
    GameAudio.speak(promptText());
  }

  function repeatPrompt() {
    if (state.screen === 'round') GameAudio.speak(promptText());
  }

  function render(screen) {
    state.screen = screen;
    els.menu.classList.toggle('hidden', screen !== 'menu');
    els.roundScreen.classList.toggle('hidden', screen !== 'round');
    els.endScreen.classList.toggle('hidden', screen !== 'end');
    els.celebrate.classList.add('hidden');
    if (screen === 'round') renderGrid();
    if (screen === 'end') renderEnd();
  }

  function renderGrid() {
    els.grid.innerHTML = '';
    state.session[state.roundIndex].choices.forEach(function (id) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'card';
      el.dataset.animalId = id;
      el.innerHTML = svgOf(id);
      el.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onCardTap(el, id);
      });
      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onCardTap(el, id);
        }
      });
      els.grid.appendChild(el);
    });
  }

  function onCardTap(el, id) {
    if (state.screen !== 'round' || state.locked) return;
    if (id === state.session[state.roundIndex].targetId) {
      state.locked = true;
      el.classList.add('correct');
      state.stars += Dengar.score(state.firstTry);
      GameAudio.fx(state.firstTry ? 'party' : 'ding');
      GameAudio.speak(state.firstTry ? 'Yeay!' : PRIDE[Math.floor(Math.random() * PRIDE.length)]);
      setTimeout(showCelebrate, 450);
    } else {
      state.firstTry = false;
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      GameAudio.fx('wrong');
      GameAudio.speak(promptText());
    }
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
    if (state.roundIndex >= state.session.length) render('end');
    else startRound();
  }

  function backToDashboard() {
    clearTimeout(returnTimer);
    window.location.href = '../../index.html';
  }

  function renderEnd() {
    clearTimeout(returnTimer);
    els.stars.innerHTML = '';
    for (var i = 0; i < Dengar.TOTAL_ROUNDS; i++) {
      var star = document.createElement('span');
      star.className = 'star' + (i < state.stars ? ' filled' : '');
      star.innerHTML = STAR_SVG;
      els.stars.appendChild(star);
    }
    if (root.Profiles) root.Profiles.addScore('dengar-cari-hewan', state.stars);
    returnTimer = setTimeout(backToDashboard, 6000);
    els.endTitle.textContent = state.stars === Dengar.TOTAL_ROUNDS ? 'Sempurna! 🌟' :
      state.stars >= 5 ? 'Hebat sekali!' : state.stars >= 3 ? 'Mantap!' : 'Ayo coba lagi!';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  root.Game = { init: init };
})(typeof window !== 'undefined' ? window : this);
