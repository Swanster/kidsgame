const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { GAMES } = require('../games-registry.js');

test('setiap game punya halaman game yang memuat profile.js dan shared/audio.js', () => {
  GAMES.forEach((g) => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', g.path), 'utf8');
    assert.ok(html.includes('../../shared/audio.js'), g.id + ': memuat audio bersama');
    assert.ok(html.includes('../../shared/profile.js'), g.id + ': memuat profile bersama');
  });
});

test('halaman dashboard memuat semua shared module', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
  assert.ok(html.includes('shared/audio.js'));
  assert.ok(html.includes('shared/avatars.js'));
  assert.ok(html.includes('shared/profile.js'));
  assert.ok(html.includes('shared/games-registry.js'));
  assert.ok(html.includes('dashboard.js'));
});
