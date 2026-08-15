(function (root) {
  'use strict';

  var Avatars = root.Avatars;
  var Profiles = root.Profiles;
  var GameRegistry = root.GameRegistry;
  var GameAudio = root.GameAudio;

  var els = {};
  var adding = false;

  function $(id) { return document.getElementById(id); }

  function speak(text) { GameAudio.speak(text); }

  function init() {
    els.setup = $('setup-screen');
    els.main = $('main-screen');
    els.nameInput = $('name-input');
    els.avatarPick = $('avatar-pick');
    els.setupMsg = $('setup-msg');
    els.avatarRow = $('avatar-row');
    els.gameGrid = $('game-grid');

    renderAvatarPick();
    $('btn-create').addEventListener('pointerdown', onCreate);
    $('btn-cancel-setup').addEventListener('pointerdown', onCancelSetup);
    render();
  }

  function renderAvatarPick() {
    els.avatarPick.innerHTML = '';
    Avatars.AVATARS.forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-opt';
      b.dataset.avatarId = a.id;
      b.innerHTML = a.svg + '<span class="avatar-name">' + a.name + '</span>';
      b.addEventListener('pointerdown', function () {
        els.avatarPick.querySelectorAll('.avatar-opt').forEach(function (x) { x.classList.remove('selected'); });
        b.classList.add('selected');
        speak(a.name);
      });
      els.avatarPick.appendChild(b);
    });
  }

  function selectedAvatar() {
    var sel = els.avatarPick.querySelector('.avatar-opt.selected');
    return sel ? sel.dataset.avatarId : null;
  }

  function onCreate() {
    var name = els.nameInput.value.trim();
    var avatarId = selectedAvatar();
    if (!name) { els.setupMsg.textContent = 'Tulis dulu nama anak.'; return; }
    if (!avatarId) { els.setupMsg.textContent = 'Pilih satu avatar.'; return; }
    var p = Profiles.create(name, avatarId);
    if (!p) { els.setupMsg.textContent = 'Gagal membuat profil.'; return; }
    Profiles.activate(p.id);
    adding = false;
    speak('Halo, ' + p.name + '!');
    render();
  }

  function onCancelSetup() {
    adding = false;
    els.setupMsg.textContent = '';
    render();
  }

  function render() {
    var profiles = Profiles.list();
    var has = profiles.length > 0;
    var showSetup = !has || adding;
    els.setup.classList.toggle('hidden', !showSetup);
    els.main.classList.toggle('hidden', showSetup);
    if (has) {
      if (!Profiles.active()) Profiles.activate(profiles[0].id);
      renderAvatars(profiles);
      renderGames();
    }
  }

  function renderAvatars(profiles) {
    els.avatarRow.innerHTML = '';
    var active = Profiles.active();
    profiles.forEach(function (p) {
      var avatar = Avatars.AVATARS.filter(function (x) { return x.id === p.avatarId; })[0] || Avatars.AVATARS[0];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-btn' + (active && active.id === p.id ? ' active' : '');
      b.innerHTML = avatar.svg + '<span class="avatar-name">' + p.name + '</span>';
      b.addEventListener('pointerdown', function () {
        Profiles.activate(p.id);
        speak('Halo, ' + p.name + '!');
        render();
      });
      els.avatarRow.appendChild(b);
    });
    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'avatar-btn avatar-add';
    add.textContent = '+';
    add.setAttribute('aria-label', 'Tambah profil');
    add.addEventListener('pointerdown', function () {
      adding = true;
      els.nameInput.value = '';
      els.avatarPick.querySelectorAll('.avatar-opt').forEach(function (x) { x.classList.remove('selected'); });
      els.setupMsg.textContent = '';
      render();
    });
    els.avatarRow.appendChild(add);
  }

  function renderGames() {
    els.gameGrid.innerHTML = '';
    var active = Profiles.active();
    GameRegistry.GAMES.forEach(function (g) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'game-card';
      var stars = active ? Profiles.getScore(active.id, g.id) : 0;
      card.innerHTML =
        '<span class="game-icon">' + g.icon + '</span>' +
        '<span class="game-name">' + g.name + '</span>' +
        (stars > 0 ? '<span class="game-stars">Bintang ' + stars + '/' + g.maxStars + '</span>' : '');
      card.addEventListener('pointerdown', function () {
        speak(g.name);
        setTimeout(function () { window.location.href = g.path; }, 350);
      });
      els.gameGrid.appendChild(card);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  root.Dashboard = { init: init };
})(typeof window !== 'undefined' ? window : this);
