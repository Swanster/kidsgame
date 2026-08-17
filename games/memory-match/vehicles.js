// vehicles.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VEHICLES = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var Art = (typeof module === 'object' && module.exports)
    ? require('../../shared/art.js')
    : (typeof self !== 'undefined' ? self : globalThis).Art;
  if (!Art) throw new Error('shared/art.js harus dimuat sebelum file ini');

  var VEHICLES = Art.VEHICLES.map(function (v) { return { id: v.id, name: v.name, svg: v.svg }; });
  return VEHICLES;
});
