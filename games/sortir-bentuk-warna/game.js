// game.js
(function (root) {
  'use strict';

  var Sorting = root.Sorting;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Sorting.ROUNDS.length;
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    items: [],
    itemIndex: 0,
    item: null,
    placed: 0,
    lock: false
  };

  function $(id) { return document.getElementById(id); }
  function roundAttr() { return Sorting.ROUNDS[state.roundIndex].attr; }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.roundLabel = $('round-label');
    els.progressLabel = $('progress-label');
    els.object = $('object');
    els.bins = $('bins');
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
      renderBin();
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
    var r = Sorting.ROUNDS[state.roundIndex];
    state.items = Sorting.roundItems(state.roundIndex);
    state.itemIndex = 0;
    state.placed = 0;
    state.lock = false;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    render('round');
    showItem();
  }

  function attrName(attr, id) {
    var pool = attr === 'color' ? Sorting.COLORS : Sorting.SHAPES;
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].id === id) return pool[i].name;
    }
    return '';
  }

  function renderBin() {
    els.bins.innerHTML = '';
    var r = Sorting.ROUNDS[state.roundIndex];
    r.bins.forEach(function (binId) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'bin';
      b.dataset.bin = binId;
      b.innerHTML = Sorting.binIcon(r.attr, binId);
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onBinTap(binId, b);
      });
      els.bins.appendChild(b);
    });
  }

  function showItem() {
    state.item = state.items[state.itemIndex];
    els.object.className = 'object';
    els.progressLabel.textContent = (state.itemIndex + 1) + '/' + state.items.length;
    els.object.innerHTML = '<svg viewBox="0 0 48 48" role="img" aria-label="' +
      attrName(roundAttr(), roundAttr() === 'color' ? state.item.color : state.item.shape) + '">' +
      state.item.svg + '</svg>';
    state.lock = false;
    GameAudio.speak(attrName(roundAttr(), roundAttr() === 'color' ? state.item.color : state.item.shape) + '!');
  }

  function onBinTap(binId, btn) {
    if (state.screen !== 'round') return;
    if (state.lock) return;
    if (Sorting.matches(roundAttr(), state.item, binId)) {
      state.lock = true;
      GameAudio.fx('ding');
      btn.classList.add('pulse');
      els.object.classList.add('done');
      GameAudio.speak('Yeay! Betul!');
      window.setTimeout(function () {
        btn.classList.remove('pulse');
        state.placed++;
        if (Sorting.isRoundDone(state.placed, state.items.length)) {
          finishRound();
        } else {
          state.itemIndex++;
          showItem();
        }
      }, 320);
    } else {
      GameAudio.fx('wrong');
      els.object.classList.remove('shake');
      void els.object.offsetWidth; // restart animasi shake
      els.object.classList.add('shake');
      GameAudio.speak('Coba lagi!');
      window.setTimeout(function () {
        els.object.classList.remove('shake');
      }, 500);
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
    els.celebrateMsg.textContent = 'Yeay! 🎉';
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
    if (root.Profiles) root.Profiles.addScore('sortir-bentuk-warna', state.stars);
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
