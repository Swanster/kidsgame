// game.js
(function (root) {
  'use strict';

  var Vehicles = root.VEHICLES;
  var Memory = root.Memory;
  var GameAudio = root.GameAudio;

  var PAIRS_PER_ROUND = [2, 3, 4, 4, 5, 5, 6, 6];
  var TOTAL_ROUNDS = PAIRS_PER_ROUND.length;
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var BACK_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="10" fill="none" stroke="#7E57C2" stroke-width="4"/><circle cx="24" cy="24" r="7" fill="none" stroke="#B39DDB" stroke-width="4"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    pairs: 0,
    found: [],
    open: [],
    locked: false,
    board: []
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.board = $('board');
    els.roundLabel = $('round-label');
    els.pairsLabel = $('pairs-label');
    els.celebrate = $('celebrate');
    els.celebrateMsg = $('celebrate-msg');
    els.endScreen = $('end-screen');
    els.endTitle = $('end-title');
    els.stars = $('stars');

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

  function render(screen) {
    state.screen = screen;
    els.menu.classList.toggle('hidden', screen !== 'menu');
    els.roundScreen.classList.toggle('hidden', screen !== 'round');
    els.endScreen.classList.toggle('hidden', screen !== 'end');
    els.celebrate.classList.add('hidden');
    if (screen === 'round') {
      renderBoard();
    } else if (screen === 'end') {
      renderEnd();
    }
  }

  function startSession() {
    GameAudio.unlock();
    state.roundIndex = 0;
    state.stars = 0;
    nextRound();
  }

  function nextRound() {
    state.pairs = PAIRS_PER_ROUND[state.roundIndex];
    state.board = Memory.buildBoard(state.pairs);
    state.found = [];
    state.open = [];
    state.locked = false;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    els.pairsLabel.textContent = '0/' + state.pairs + ' pasang';
    render('round');
    GameAudio.speak('Cocokkan kartu yang sama!');
  }

  function renderBoard() {
    els.board.className = 'board cols' + colsFor(state.board.length);
    els.board.innerHTML = '';
    state.board.forEach(function (card) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.dataset.pair = String(card.pair);
      b.innerHTML = BACK_SVG;
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onCardTap(b, card);
      });
      els.board.appendChild(b);
    });
  }

  function colsFor(n) {
    if (n <= 4) return 2;
    if (n <= 6) return 3;
    if (n <= 8) return 4;
    if (n <= 10) return 5;
    return 4;
  }

  function onCardTap(btn, card) {
    if (state.screen !== 'round') return;
    if (state.locked) return;
    if (btn.classList.contains('done')) return;
    if (state.open.length === 2) return;
    if (state.open.length === 1 && state.open[0].btn === btn) return;
    btn.classList.add('open');
    btn.innerHTML = faceOf(card);
    GameAudio.fx('pop');
    state.open.push({ btn: btn, card: card });
    if (state.open.length === 2) {
      state.locked = true;
      checkPair();
    }
  }

  function faceOf(card) {
    var v = Vehicles[card.pair];
    return '<svg viewBox="0 0 48 48" role="img" aria-label="' + v.name + '">' + v.svg + '</svg>';
  }

  function checkPair() {
    var a = state.open[0];
    var b = state.open[1];
    if (Memory.isMatch(a.card, b.card)) {
      window.setTimeout(function () {
        a.btn.classList.add('done');
        b.btn.classList.add('done');
        if (state.found.indexOf(a.card.pair) === -1) state.found.push(a.card.pair);
        els.pairsLabel.textContent = state.found.length + '/' + state.pairs + ' pasang';
        GameAudio.fx('ding');
        GameAudio.speak(Vehicles[a.card.pair].name + '!');
        state.open = [];
        state.locked = false;
        if (Memory.boardDone(state.found, state.pairs)) {
          finishRound();
        }
      }, 350);
    } else {
      window.setTimeout(function () {
        a.btn.classList.remove('open');
        b.btn.classList.remove('open');
        a.btn.innerHTML = BACK_SVG;
        b.btn.innerHTML = BACK_SVG;
        GameAudio.fx('wrong');
        state.open = [];
        state.locked = false;
      }, 700);
    }
  }

  function finishRound() {
    state.stars++;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
      GameAudio.fx('cheer');
      GameAudio.speak(Math.random() < 0.5 ? 'Yeay!' : 'Bagus sekali!');
      showCelebrate();
    } else {
      render('end');
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
    nextRound();
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
    if (root.Profiles) root.Profiles.addScore('memory-match', state.stars);
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
