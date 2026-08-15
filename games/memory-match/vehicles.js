// vehicles.js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VEHICLES = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VEHICLES = [
    {
      id: 'car',
      name: 'Mobil',
      svg: '<path d="M6 26 h26 a4 4 0 0 1 4 4 v4 h-34 v-4 a4 4 0 0 1 4 -4 Z" fill="none" stroke="#E53935" stroke-width="4" stroke-linejoin="round"/><path d="M15 26 l4 -7 a3 3 0 0 1 6 0 l4 7" fill="none" stroke="#E53935" stroke-width="4" stroke-linecap="round"/><circle cx="14" cy="34" r="4.5" fill="#E53935"/><circle cx="30" cy="34" r="4.5" fill="#E53935"/><circle cx="14" cy="34" r="1.8" fill="#fff"/><circle cx="30" cy="34" r="1.8" fill="#fff"/>'
    },
    {
      id: 'train',
      name: 'Kereta',
      svg: '<path d="M4 22 h28 a4 4 0 0 1 4 4 v4 h-36 v-4 a4 4 0 0 1 4 -4 Z" fill="none" stroke="#1E88E5" stroke-width="4" stroke-linejoin="round"/><path d="M28 22 v-6 a4 4 0 0 1 4 -4 h4 v10" fill="none" stroke="#1E88E5" stroke-width="4" stroke-linejoin="round"/><path d="M10 22 v-8" stroke="#1E88E5" stroke-width="4" stroke-linecap="round"/><circle cx="8" cy="34" r="4.5" fill="#1E88E5"/><circle cx="18" cy="34" r="4.5" fill="#1E88E5"/><circle cx="28" cy="34" r="4.5" fill="#1E88E5"/><circle cx="8" cy="34" r="1.8" fill="#fff"/><circle cx="18" cy="34" r="1.8" fill="#fff"/><circle cx="28" cy="34" r="1.8" fill="#fff"/>'
    },
    {
      id: 'plane',
      name: 'Pesawat',
      svg: '<path d="M6 26 h30 a4 4 0 0 1 4 4" fill="none" stroke="#FB8C00" stroke-width="4" stroke-linecap="round"/><path d="M16 26 l-6 10" stroke="#FB8C00" stroke-width="4" stroke-linecap="round"/><path d="M40 20 v10" stroke="#FB8C00" stroke-width="4" stroke-linecap="round"/><circle cx="14" cy="36" r="2" fill="#FB8C00"/>'
    },
    {
      id: 'ship',
      name: 'Kapal',
      svg: '<path d="M8 30 h32 l-6 8 h-20 Z" fill="none" stroke="#26C6DA" stroke-width="4" stroke-linejoin="round"/><path d="M24 30 v-12" stroke="#26C6DA" stroke-width="4" stroke-linecap="round"/><path d="M24 24 h6 l-6 5" fill="none" stroke="#26C6DA" stroke-width="4" stroke-linejoin="round"/><path d="M6 38 h36" stroke="#26C6DA" stroke-width="4" stroke-linecap="round"/>'
    },
    {
      id: 'bike',
      name: 'Sepeda',
      svg: '<circle cx="12" cy="30" r="8" fill="none" stroke="#43A047" stroke-width="4"/><circle cx="36" cy="30" r="8" fill="none" stroke="#43A047" stroke-width="4"/><path d="M12 30 L24 14 L36 30 M24 14 L23 30 M12 30 L36 30" fill="none" stroke="#43A047" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    {
      id: 'tractor',
      name: 'Traktor',
      svg: '<circle cx="12" cy="32" r="9" fill="none" stroke="#6D4C41" stroke-width="4"/><circle cx="36" cy="34" r="4.5" fill="#6D4C41"/><path d="M12 23 v-9 a4 4 0 0 1 4 -4 h4 v13 M20 14 h14 a4 4 0 0 1 4 4 v5" fill="none" stroke="#6D4C41" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    {
      id: 'bus',
      name: 'Bus',
      svg: '<rect x="4" y="12" width="34" height="18" rx="5" fill="none" stroke="#F9A825" stroke-width="4"/><path d="M4 20 h34" stroke="#F9A825" stroke-width="4"/><rect x="10" y="15" width="7" height="3" rx="1.5" fill="#F9A825"/><rect x="21" y="15" width="7" height="3" rx="1.5" fill="#F9A825"/><circle cx="12" cy="34" r="4.5" fill="#F9A825"/><circle cx="30" cy="34" r="4.5" fill="#F9A825"/><circle cx="12" cy="34" r="1.8" fill="#fff"/><circle cx="30" cy="34" r="1.8" fill="#fff"/>'
    },
    {
      id: 'helicopter',
      name: 'Helikopter',
      svg: '<path d="M4 12 L44 12" stroke="#8E24AA" stroke-width="4" stroke-linecap="round"/><ellipse cx="18" cy="26" rx="12" ry="8" fill="none" stroke="#8E24AA" stroke-width="4"/><path d="M30 26 h12 a3 3 0 0 1 3 3" fill="none" stroke="#8E24AA" stroke-width="4" stroke-linecap="round"/><path d="M12 34 h8 M30 34 h8" stroke="#8E24AA" stroke-width="4" stroke-linecap="round"/>'
    }
  ];

  return VEHICLES;
});
