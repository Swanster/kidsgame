(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameAudio = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ctx = null;
  var muted = false;

  function pickIdVoice(voices) {
    if (!voices || !voices.length) return null;
    var full = voices.filter(function (v) { return /^id-/.test(v.lang || ''); });
    if (full.length) return full[0];
    var bare = voices.filter(function (v) { return (v.lang || '') === 'id'; });
    return bare[0] || null;
  }

  function unlock() {
    try {
      if (!ctx) {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
    } catch (e) { /* silent */ }
  }

  function speak(text) {
    if (muted) return;
    try {
      var voice = pickIdVoice(root.speechSynthesis.getVoices());
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'id-ID';
      if (voice) u.voice = voice;
      u.rate = 0.9;
      root.speechSynthesis.speak(u);
    } catch (e) { /* silent */ }
  }

  function tone(freq, dur, type, vol) {
    if (muted || !ctx) return;
    try {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch (e) { /* silent */ }
  }

  function fx(kind) {
    if (muted) return;
    if (!ctx) unlock();
    if (!ctx) return;
    switch (kind) {
      case 'ding':
        tone(880, 0.3, 'sine', 0.25);
        break;
      case 'wrong':
        tone(220, 0.25, 'triangle', 0.15);
        break;
      case 'pop':
        tone(300, 0.12, 'square', 0.08);
        break;
      case 'cheer':
        tone(523, 0.18, 'sine', 0.2);
        setTimeout(function () { tone(659, 0.18, 'sine', 0.2); }, 140);
        setTimeout(function () { tone(784, 0.3, 'sine', 0.22); }, 280);
        break;
    }
  }

  function setMuted(m) { muted = !!m; }
  function isMuted() { return muted; }

  return {
    pickIdVoice: pickIdVoice,
    unlock: unlock,
    speak: speak,
    fx: fx,
    setMuted: setMuted,
    isMuted: isMuted
  };
});
