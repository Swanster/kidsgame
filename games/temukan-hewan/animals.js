// animals.js (UMD-lite)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Animals = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var Art = (typeof module === 'object' && module.exports)
    ? require('../../shared/art.js')
    : (typeof self !== 'undefined' ? self : globalThis).Art;
  if (!Art) throw new Error('shared/art.js harus dimuat sebelum file ini');

  // ORDER & GROUP: SALIN PERSIS dari animals.js lama (diverifikasi saat penulisan plan):
  var ORDER = ['kucing', 'singa', 'anjing', 'kelinci', 'bebek', 'burung',
               'babi', 'sapi', 'gajah', 'katak'];
  var GROUP = {
    kucing: 'feline', singa: 'feline', anjing: 'canine', kelinci: 'lagomorph',
    bebek: 'bird', burung: 'bird', babi: 'suid', sapi: 'bovine',
    gajah: 'proboscidean', katak: 'anuran'
  };

  var ANIMALS = ORDER.map(function (id) {
    var meta = Art.ANIMALS.find(function (a) { return a.id === id; });
    return { id: id, name: meta.name, group: GROUP[id], svg: '<g>' + meta.svg + '</g>' };
  });

  var ANIMAL_BY_ID = {};
  ANIMALS.forEach(function (a) { ANIMAL_BY_ID[a.id] = a; });

  return { ANIMALS: ANIMALS, ANIMAL_BY_ID: ANIMAL_BY_ID };
});
