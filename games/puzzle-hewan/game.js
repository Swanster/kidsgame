// game.js
(function (root) {
  'use strict';

  var Puzzle = root.Puzzle;
  var GameAudio = root.GameAudio;

  var TOTAL_ROUNDS = Puzzle.IMAGES.length;
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" width="40" height="40"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z" fill="currentColor"/></svg>';
  var ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
  var ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

  var els = {};
  var returnTimer = null;
  var state = {
    screen: 'menu',
    roundIndex: 0,
    stars: 0,
    board: null,
    placed: 0,
    current: null,
    lock: false
  };

  function $(id) { return document.getElementById(id); }

  function init() {
    els.menu = $('menu');
    els.roundScreen = $('round-screen');
    els.roundLabel = $('round-label');
    els.progressLabel = $('progress-label');
    els.reference = $('reference');
    els.grid = $('grid');
    els.pieceLabel = $('piece-label');
    els.pieceBig = $('piece-big');
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

  function nextRound() {
    state.board = Puzzle.makeBoard(state.roundIndex);
    state.placed = 0;
    state.lock = false;
    var count = state.board.pieces.length;
    els.roundLabel.textContent = 'Ronde ' + (state.roundIndex + 1);
    render('round');
    els.reference.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true">' + state.board.image.svg + '</svg>';
    GameAudio.speak('Pasangkan ' + state.board.image.name + '!');
    buildGrid();
    showNextPiece();
  }

  function buildGrid() {
    var count = state.board.pieces.length;
    var lay = Puzzle.layout(count);
    var cellW = 120 / lay.cols;
    var cellH = 120 / lay.rows;
    els.grid.style.gridTemplateColumns = 'repeat(' + lay.cols + ', 1fr)';
    els.grid.innerHTML = '';
    for (var n = 1; n <= count; n++) {
      var s = document.createElement('button');
      s.type = 'button';
      s.className = 'slot';
      s.dataset.slot = String(n);
      s.style.aspectRatio = cellW + ' / ' + cellH; // persis rasio potongan (1/1 atau 2/3) — tiling pas
      s.innerHTML = '<svg viewBox="0 0 120 120" aria-hidden="true">' + state.board.image.svg + '</svg>' +
        '<span class="slot-num">' + n + '</span>';
      s.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        onSlotTap(this.dataset.slot, this);
      });
      els.grid.appendChild(s);
    }
  }

  function showNextPiece() {
    state.current = state.board.pieces[state.placed];
    var count = state.board.pieces.length;
    els.pieceLabel.textContent = 'Potongan ' + state.current.n;
    els.pieceBig.style.aspectRatio = state.current.w + ' / ' + state.current.h;
    els.pieceBig.innerHTML = Puzzle.pieceSVG(state.roundIndex, state.current);
    els.progressLabel.textContent = (state.placed + 1) + '/' + count;
    state.lock = false;
  }

  function onSlotTap(slotNum, btn) {
    if (state.screen !== 'round') return;
    if (state.lock) return;
    if (btn.classList.contains('filled')) return;
    var n = parseInt(slotNum, 10);
    if (n !== state.current.n) {
      GameAudio.fx('wrong');
      btn.classList.remove('shake');
      void btn.offsetWidth; // restart animasi shake
      btn.classList.add('shake');
      GameAudio.speak('Coba lagi!');
      window.setTimeout(function () {
        btn.classList.remove('shake');
      }, 500);
      return;
    }
    state.lock = true;
    GameAudio.fx('ding');
    btn.classList.add('filled');
    btn.innerHTML = Puzzle.pieceSVG(state.roundIndex, state.current);
    if (state.placed > 0 && state.placed % 3 === 2) GameAudio.speak('Yeay!');
    window.setTimeout(function () {
      state.placed++;
      if (Puzzle.isRoundDone(state.placed, state.board.pieces.length)) {
        finishRound();
      } else {
        showNextPiece();
      }
    }, 320);
  }

  function finishRound() {
    state.stars++;
    if (state.roundIndex + 1 < TOTAL_ROUNDS) {
      GameAudio.fx('party');
      GameAudio.speak('Hebat! ' + state.board.image.name + ' selesai!');
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
    if (root.Profiles) root.Profiles.addScore('puzzle-hewan', state.stars);
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
