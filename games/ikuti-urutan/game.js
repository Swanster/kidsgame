// game.js
(function (root) {
  'use strict';

  var Simon = root.Simon;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Simon.SEQUENCE_LENGTHS.length;
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    round: null,
    posisi: 0,
    lock: false
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.roundLabel = $('round-label');
    els.progressLabel = $('progress-label');
    els.status = $('status');
    els.pads = $('pads');
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
    if (screen === 'end') renderEnd();
  }

  function startSession() {
    GameAudio.unlock();
    state.roundIndex = 0;
    state.stars = 0;
    nextRound();
  }

  function setStatus(text) {
    els.status.textContent = text;
  }

  function padButton(colorId) {
    return els.pads.querySelector('.pad[data-color="' + colorId + '"]');
  }

  function setDim(on) {
    var pads = els.pads.querySelectorAll('.pad');
    for (var i = 0; i < pads.length; i++) {
      pads[i].classList.toggle('dim', on);
    }
  }

  function nextRound() {
    state.round = Simon.makeSequence(Simon.SEQUENCE_LENGTHS[state.roundIndex]);
    state.posisi = 0;
    state.lock = true;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    els.progressLabel.textContent = '1/' + state.round.length;
    render('round');
    setStatus('Perhatikan lampu ya...');
    GameAudio.speak('Perhatikan!');
    buildPads();
    playDemo();
  }

  function buildPads() {
    els.pads.innerHTML = '';
    Simon.PADS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pad';
      b.dataset.color = p.id;
      b.innerHTML = Simon.padSVG(p.id);
      b.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onPadTap(p.id, b);
      });
      els.pads.appendChild(b);
    });
  }

  function playDemo() {
    var i = 0;
    var seq = state.round;
    state.lock = true;
    setDim(true);
    function step() {
      if (state.screen !== 'round') return;
      if (i >= seq.length) {
        setDim(false);
        state.lock = false;
        setStatus('Sekarang giliranmu!');
        GameAudio.speak('Ayo ulangi!');
        return;
      }
      var pad = padButton(seq[i]);
      var litPad = pad;
      if (pad) {
        pad.classList.add('lit');
        GameAudio.fx('ding');
      }
      i++;
      setTimeout(function () {
        if (litPad) litPad.classList.remove('lit');
        setTimeout(step, 250);
      }, 650);
    }
    step();
  }

  function onPadTap(colorId, btn) {
    if (state.screen !== 'round') return;
    if (state.lock) return;
    if (!Simon.matches(colorId, state.round[state.posisi])) {
      GameAudio.fx('wrong');
      btn.classList.remove('shake');
      void btn.offsetWidth; // restart animasi shake
      btn.classList.add('shake');
      setStatus('Coba lagi!');
      GameAudio.speak('Coba lagi!');
      window.setTimeout(function () {
        btn.classList.remove('shake');
        state.lock = false;
      }, 450);
      return;
    }
    state.lock = true;
    GameAudio.fx('ding');
    btn.classList.add('lit');
    window.setTimeout(function () {
      btn.classList.remove('lit');
    }, 200);
    state.posisi++;
    els.progressLabel.textContent = (state.posisi + 1) + '/' + state.round.length;
    window.setTimeout(function () {
      if (Simon.isRoundDone(state.posisi, state.round.length)) {
        finishRound();
      } else {
        state.lock = false;
      }
    }, 350);
  }

  function finishRound() {
    state.stars++;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
      GameAudio.fx('cheer');
      GameAudio.speak('Hebat!');
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
    if (root.Profiles) root.Profiles.addScore('ikuti-urutan', state.stars);
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

  root.IkutiUrutan = { init: init };
})(typeof window !== 'undefined' ? window : this);