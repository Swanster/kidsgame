const test = require('node:test');
const assert = require('node:assert');
const GameAudio = require('../../../shared/audio.js');

test('pickIdVoice prefers full id-ID voice', () => {
  const voices = [{ lang: 'en-US' }, { lang: 'id-ID' }, { lang: 'id' }];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[1]);
});

test('pickIdVoice falls back to bare id', () => {
  const voices = [{ lang: 'en-US' }, { lang: 'id' }];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[1]);
});

test('pickIdVoice returns null without id voices', () => {
  assert.strictEqual(GameAudio.pickIdVoice([{ lang: 'en-US' }, { lang: 'ja-JP' }]), null);
  assert.strictEqual(GameAudio.pickIdVoice([]), null);
  assert.strictEqual(GameAudio.pickIdVoice(null), null);
});
