// game.js
(function (root) {
  'use strict';

  var Counting = root.Counting;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Counting.OBJECTS_PER_ROUND.length;
  var NUMBER_WORDS = ['satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan'];
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    total: 0,
    tapped: []
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.area = $('area');
    els.roundLabel = $('round-label');
    els.counterLabel = $('counter-label');
    els.celebrate = $('celebrate');
    els.celebrateNum = $('celebrate-num');
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
      renderObjects();
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
    state.total = Counting.OBJECTS_PER_ROUND[state.roundIndex];
    state.tapped = [];
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    els.counterLabel.textContent = '0';
    render('round');
    GameAudio.speak('Hitung balonnya!');
  }

  function renderObjects() {
    els.area.innerHTML = '';
    var order = Counting.shuffle(Counting.BALLOONS.map(function (b) { return b.id; }));
    var pos = Counting.layout(state.total);
    pos.forEach(function (p, i) {
      var balloon = Counting.BALLOONS.filter(function (b) { return b.id === order[i]; })[0];
      var obj = document.createElement('button');
      obj.type = 'button';
      obj.className = 'obj';
      obj.dataset.idx = String(i);
      obj.style.left = p.x + '%';
      obj.style.top = p.y + '%';
      obj.style.setProperty('--size', p.s + '%');
      obj.innerHTML = '<svg viewBox="0 0 48 48" role="img" aria-label="balon ' + balloon.name + '">' + balloon.svg + '</svg>';
      obj.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onObjTap(obj, i);
      });
      els.area.appendChild(obj);
    });
  }

  function onObjTap(obj, i) {
    if (state.screen !== 'round') return;
    if (obj.classList.contains('done')) return;
    obj.classList.add('done');
    state.tapped.push(i);
    GameAudio.fx('pop');
    GameAudio.speak(NUMBER_WORDS[state.tapped.length - 1]);
    els.counterLabel.textContent = String(state.tapped.length);
    if (Counting.isDone(state.tapped.length, state.total)) {
      finishRound();
    }
  }

  function finishRound() {
    state.stars++;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
      GameAudio.fx('cheer');
      GameAudio.speak('Hebat! Ada ' + NUMBER_WORDS[state.total - 1] + ' balon!');
      showCelebrate();
    } else {
      render('end');
    }
  }

  function showCelebrate() {
    els.celebrateNum.textContent = String(state.total);
    els.celebrateMsg.textContent = NUMBER_WORDS[state.total - 1];
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
    if (root.Profiles) root.Profiles.addScore('berhitung', state.stars);
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
