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

test('pickIdVoice prefers named Google id-ID over unnamed id-ID', () => {
  const voices = [{ lang: 'id-ID' }, { lang: 'id-ID', name: 'Google Bahasa Indonesia' }];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[1]);
});

test('pickIdVoice prefers Google over Microsoft over generic, all id-ID', () => {
  const voices = [
    { lang: 'id-ID' },
    { lang: 'id-ID', name: 'Microsoft Ardi' },
    { lang: 'id-ID', name: 'Google Bahasa Indonesia' }
  ];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[2]);
});

test('pickIdVoice prefers Microsoft over generic when no Google, all id-ID', () => {
  const voices = [{ lang: 'id-ID' }, { lang: 'id-ID', name: 'Microsoft Ardi' }];
  assert.strictEqual(GameAudio.pickIdVoice(voices), voices[1]);
});
