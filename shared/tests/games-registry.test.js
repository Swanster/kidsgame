const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { GAMES } = require('../games-registry.js');

test('registri tidak kosong dan lancar', () => {
  assert.ok(GAMES.length >= 1);
  const ids = new Set();
  GAMES.forEach((g) => {
    assert.ok(g.id && !ids.has(g.id), 'id duplikat: ' + g.id);
    ids.add(g.id);
    assert.ok(g.name && g.name.trim().length > 0);
    assert.ok(g.maxStars >= 1);
    assert.strictEqual(g.path, 'games/' + g.id + '/index.html');
    assert.ok(g.icon.includes('<svg') && g.icon.includes('</svg>'));
    assert.ok(fs.existsSync(path.join(__dirname, '..', '..', g.path)), 'file game ada: ' + g.path);
  });
});
