const test = require('node:test');
const assert = require('node:assert');
const { AVATARS } = require('../avatars.js');

test('memiliki 6 avatar', () => {
  assert.strictEqual(AVATARS.length, 6);
});

test('id unik, nama & svg tidak kosong', () => {
  const ids = new Set();
  AVATARS.forEach((a) => {
    assert.ok(a.id && typeof a.id === 'string');
    assert.ok(!ids.has(a.id), 'id duplikat: ' + a.id);
    ids.add(a.id);
    assert.ok(a.name && a.name.trim().length > 0);
    assert.ok(a.svg.includes('<svg') && a.svg.includes('</svg>'));
  });
});
