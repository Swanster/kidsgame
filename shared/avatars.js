(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Avatars = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var AVATARS = [
    { id: 'cat', name: 'Kucing', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 20 L6 10 L16 14 L24 6 L32 14 L42 10 L36 20 Q42 28 42 34 Q42 42 24 42 Q6 42 6 34 Q6 28 12 20 Z" fill="#F2A65E"/><path d="M14 24 L20 24 L20 30 L14 30 Z M28 24 L34 24 L34 30 L28 30 Z" fill="#3E2723"/><path d="M20 34 Q24 38 28 34" stroke="#3E2723" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="17" cy="36" r="1.6" fill="#F48FB1"/><circle cx="31" cy="36" r="1.6" fill="#F48FB1"/></svg>' },
    { id: 'duck', name: 'Bebek', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="16" cy="30" r="12" fill="#FFD54F"/><circle cx="30" cy="20" r="9" fill="#FFC107"/><path d="M37 14 L46 20 L37 24 Z" fill="#F57C00"/><circle cx="33" cy="16" r="1.8" fill="#3E2723"/></svg>' },
    { id: 'fish', name: 'Ikan', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 18 L20 24 L6 30 Z" fill="#42A5F5"/><ellipse cx="28" cy="24" rx="14" ry="10" fill="#64B5F6"/><circle cx="34" cy="21" r="2" fill="#0D47A1"/><path d="M24 16 L26 24 L24 32 Z" fill="#E3F2FD"/></svg>' },
    { id: 'rabbit', name: 'Kelinci', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 24 L14 8 Q20 2 20 12 Z" fill="#B0BEC5"/><path d="M30 24 L34 8 Q28 2 28 12 Z" fill="#B0BEC5"/><ellipse cx="24" cy="32" rx="14" ry="12" fill="#CFD8DC"/><circle cx="18" cy="30" r="2" fill="#37474F"/><circle cx="30" cy="30" r="2" fill="#37474F"/><path d="M21 38 Q24 41 27 38" stroke="#EF9A9A" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
    { id: 'car', name: 'Mobil', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="22" width="36" height="12" rx="4" fill="#EF5350"/><path d="M14 14 L9 22 L39 22 L34 14 Z" fill="#90CAF9"/><circle cx="16" cy="36" r="4" fill="#263238"/><circle cx="32" cy="36" r="4" fill="#263238"/><rect x="18" y="18" width="6" height="4" fill="#BBDEFB"/><rect x="26" y="18" width="6" height="4" fill="#BBDEFB"/></svg>' },
    { id: 'star', name: 'Bintang', svg: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4 L29.5 18.5 L44 20 L33 30 L36.5 45 L24 37 L11.5 45 L15 30 L4 20 L18.5 18.5 Z" fill="#FFD54F"/></svg>' }
  ];
  return { AVATARS: AVATARS };
});
