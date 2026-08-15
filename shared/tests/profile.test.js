const test = require('node:test');
const assert = require('node:assert');
const Profiles = require('../profile.js');

function MockStorage() {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: (k) => { delete m[k]; },
    dump: () => m
  };
}

test('create menyimpan profil dan mempertahankan nama ter-trim', () => {
  const s = MockStorage();
  Profiles.init(s);
  const p = Profiles.create('  Lala  ', 'cat');
  assert.ok(p);
  assert.strictEqual(p.name, 'Lala');
  assert.strictEqual(p.avatarId, 'cat');
  assert.deepStrictEqual(p.scores, {});
  assert.strictEqual(Profiles.list().length, 1);
  assert.ok(JSON.parse(s.getItem('thk:profiles')).length === 1, 'tersimpan di storage');
});

test('create menolak argumen invalid', () => {
  Profiles.init(MockStorage());
  assert.strictEqual(Profiles.create('', 'cat'), null);
  assert.strictEqual(Profiles.create('A', ''), null);
  assert.strictEqual(Profiles.create('A', null), null);
  assert.strictEqual(Profiles.create(undefined, 'cat'), null);
  assert.strictEqual(Profiles.list().length, 0);
});

test('activate/active memilih profil aktif', () => {
  const s = MockStorage();
  Profiles.init(s);
  assert.strictEqual(Profiles.active(), null);
  const p = Profiles.create('Budi', 'duck');
  assert.strictEqual(Profiles.activate(p.id), true);
  assert.strictEqual(Profiles.activate('tidak-ada'), false);
  assert.strictEqual(Profiles.active().id, p.id);
});

test('addScore hanya menyimpan yang lebih baik', () => {
  Profiles.init(MockStorage());
  const p = Profiles.create('Sari', 'fish');
  Profiles.activate(p.id);
  assert.strictEqual(Profiles.addScore('temukan-hewan', 5), 5);
  assert.strictEqual(Profiles.addScore('temukan-hewan', 3), 5);
  assert.strictEqual(Profiles.addScore('temukan-hewan', 8), 8);
  assert.strictEqual(Profiles.getScore(p.id, 'temukan-hewan'), 8);
  assert.strictEqual(Profiles.getScore(p.id, 'memory-match'), 0);
  assert.strictEqual(Profiles.getScore('profil-lain', 'temukan-hewan'), 0);
});

test('addScore tanpa profil aktif mengembalikan null', () => {
  Profiles.init(MockStorage());
  assert.strictEqual(Profiles.addScore('game', 3), null);
});

test('fallback memori (init null) tetap berfungsi tanpa storage', () => {
  Profiles.init(null);
  const p = Profiles.create('Oka', 'star');
  Profiles.activate(p.id);
  Profiles.addScore('temukan-hewan', 4);
  assert.strictEqual(Profiles.getScore(p.id, 'temukan-hewan'), 4);
  assert.strictEqual(Profiles.active().id, p.id);
});

test('JSON storage rusak tidak membuat crash', () => {
  const s = MockStorage();
  s.setItem('thk:profiles', '{rusak!!');
  Profiles.init(s);
  assert.deepStrictEqual(Profiles.list(), []);
});
