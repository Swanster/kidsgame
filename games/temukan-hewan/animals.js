// animals.js (UMD-lite)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Animals = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function EYES() {
    return '<circle cx="46" cy="52" r="5.5" fill="#fff"/>' +
           '<circle cx="74" cy="52" r="5.5" fill="#fff"/>' +
           '<circle cx="48.5" cy="54" r="2.8" fill="#2B2B2B"/>' +
           '<circle cx="71.5" cy="54" r="2.8" fill="#2B2B2B"/>';
  }

  var ANIMALS = [
    // Kucing (orange) — pointy ears, whiskers
    { id: 'kucing', name: 'Kucing', group: 'feline', svg: '<g>' +
      '<path d="M36 40 L42 12 L58 34 Z" fill="#F4A63A"/>' +
      '<path d="M84 40 L78 12 L62 34 Z" fill="#F4A63A"/>' +
      '<path d="M41 36 L44 20 L54 33 Z" fill="#F9C6D2"/>' +
      '<path d="M79 36 L76 20 L66 33 Z" fill="#F9C6D2"/>' +
      '<circle cx="60" cy="56" r="34" fill="#F4A63A"/>' +
      EYES() +
      '<path d="M60 60 L56 66 L64 66 Z" fill="#E86A6A"/>' +
      '<path d="M60 66 C58 71 52 72 50 68 M60 66 C62 71 68 72 70 68" stroke="#5A4630" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M30 56 L14 52 M30 62 L12 62 M30 68 L14 72 M90 56 L106 52 M90 62 L108 62 M90 68 L106 72" stroke="#5A4630" stroke-width="1.5" stroke-linecap="round"/>' +
      '</g>' },

    // Singa — mane behind head, tan muzzle
    { id: 'singa', name: 'Singa', group: 'feline', svg: '<g>' +
      '<circle cx="60" cy="56" r="38" fill="#E08A2E"/>' +
      '<circle cx="60" cy="58" r="30" fill="#F0C06A"/>' +
      '<circle cx="34" cy="34" r="6" fill="#F0C06A"/>' +
      '<circle cx="86" cy="34" r="6" fill="#F0C06A"/>' +
      EYES() +
      '<ellipse cx="60" cy="68" rx="14" ry="9" fill="#FBE8C8"/>' +
      '<path d="M60 62 L56 67 L64 67 Z" fill="#B95F2B"/>' +
      '<path d="M60 70 C58 73 53 72 52 69 M60 70 C62 73 67 72 68 69" stroke="#B95F2B" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</g>' },

    // Anjing (brown) — floppy ears, tongue
    { id: 'anjing', name: 'Anjing', group: 'canine', svg: '<g>' +
      '<ellipse cx="33" cy="48" rx="10" ry="22" fill="#8A5A33" transform="rotate(-12 33 48)"/>' +
      '<ellipse cx="87" cy="48" rx="10" ry="22" fill="#8A5A33" transform="rotate(12 87 48)"/>' +
      '<circle cx="60" cy="57" r="34" fill="#B07A4F"/>' +
      EYES() +
      '<ellipse cx="60" cy="70" rx="15" ry="10" fill="#D9A87C"/>' +
      '<ellipse cx="60" cy="65" rx="5" ry="4" fill="#3A2A1E"/>' +
      '<path d="M56 76 Q60 84 64 76 Z" fill="#E86A6A"/>' +
      '</g>' },

    // Kelinci (abu muda) — long ears outline so white-on-pastel still reads
    { id: 'kelinci', name: 'Kelinci', group: 'lagomorph', svg: '<g>' +
      '<ellipse cx="48" cy="18" rx="9" ry="26" fill="#E4E8EC" stroke="#C9D2DA" stroke-width="2"/>' +
      '<ellipse cx="72" cy="18" rx="9" ry="26" fill="#E4E8EC" stroke="#C9D2DA" stroke-width="2"/>' +
      '<ellipse cx="48" cy="20" rx="4.5" ry="18" fill="#F9C6D2"/>' +
      '<ellipse cx="72" cy="20" rx="4.5" ry="18" fill="#F9C6D2"/>' +
      '<circle cx="60" cy="54" r="32" fill="#E4E8EC" stroke="#C9D2DA" stroke-width="2"/>' +
      EYES() +
      '<path d="M60 58 L56 63 L64 63 Z" fill="#F2A5B8"/>' +
      '<path d="M56 68 L56 74 L60 74 L60 68 Z M64 68 L64 74 L60 74 L60 68 Z" fill="#fff" stroke="#C9D2DA" stroke-width="1"/>' +
      '</g>' },

    // Bebek (kuning) — orange beak, blush
    { id: 'bebek', name: 'Bebek', group: 'bird', svg: '<g>' +
      '<circle cx="60" cy="55" r="32" fill="#F6D32D"/>' +
      '<circle cx="46" cy="52" r="5.5" fill="#fff"/>' +
      '<circle cx="74" cy="52" r="5.5" fill="#fff"/>' +
      '<circle cx="48.5" cy="54" r="2.8" fill="#2B2B2B"/>' +
      '<circle cx="71.5" cy="54" r="2.8" fill="#2B2B2B"/>' +
      '<path d="M46 62 Q60 80 74 62 Q60 70 46 62 Z" fill="#F08A24"/>' +
      '<circle cx="40" cy="64" r="4" fill="#F7B7C6" opacity="0.7"/>' +
      '<circle cx="80" cy="64" r="4" fill="#F7B7C6" opacity="0.7"/>' +
      '</g>' },

    // Burung (biru) — crest, side beak, wing
    { id: 'burung', name: 'Burung', group: 'bird', svg: '<g>' +
      '<path d="M48 26 Q54 6 66 12 Q74 20 66 27 Z" fill="#3D7FC4"/>' +
      '<circle cx="60" cy="55" r="30" fill="#5AA9E6"/>' +
      '<circle cx="52" cy="50" r="5.5" fill="#fff"/>' +
      '<circle cx="76" cy="50" r="5.5" fill="#fff"/>' +
      '<circle cx="54.5" cy="52" r="2.8" fill="#2B2B2B"/>' +
      '<circle cx="73.5" cy="52" r="2.8" fill="#2B2B2B"/>' +
      '<path d="M60 56 L44 60 L60 66 Z" fill="#F08A24"/>' +
      '<path d="M40 62 Q52 84 76 80 Q60 92 40 62 Z" fill="#4A86C9"/>' +
      '</g>' },

    // Babi (pink) — triangular ears, snout
    { id: 'babi', name: 'Babi', group: 'suid', svg: '<g>' +
      '<path d="M40 34 L34 14 L52 28 Z" fill="#F2A5B8"/>' +
      '<path d="M80 34 L86 14 L68 28 Z" fill="#F2A5B8"/>' +
      '<circle cx="60" cy="55" r="33" fill="#F2A5B8"/>' +
      EYES() +
      '<ellipse cx="60" cy="66" rx="12" ry="9" fill="#F9C6D2"/>' +
      '<circle cx="56" cy="66" r="2.5" fill="#7A4A55"/>' +
      '<circle cx="64" cy="66" r="2.5" fill="#7A4A55"/>' +
      '<path d="M60 75 C58 78 53 77 52 74 M60 75 C62 78 67 77 68 74" stroke="#C2708A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</g>' },

    // Sapi (putih berbelang) — horns, patches, pink muzzle
    { id: 'sapi', name: 'Sapi', group: 'bovine', svg: '<g>' +
      '<path d="M40 30 Q32 16 20 20 Q30 26 36 34 Z" fill="#E8C16A"/>' +
      '<path d="M80 30 Q88 16 100 20 Q90 26 84 34 Z" fill="#E8C16A"/>' +
      '<circle cx="60" cy="56" r="34" fill="#FAFAFA" stroke="#D8DCE0" stroke-width="2"/>' +
      '<path d="M32 40 Q48 28 60 36 Q46 50 32 40 Z" fill="#3A3A3A"/>' +
      '<path d="M84 52 Q74 44 78 32 Q94 38 84 52 Z" fill="#3A3A3A"/>' +
      EYES() +
      '<ellipse cx="60" cy="70" rx="14" ry="10" fill="#F2B8C4"/>' +
      '<circle cx="55" cy="70" r="2" fill="#8A5560"/>' +
      '<circle cx="65" cy="70" r="2" fill="#8A5560"/>' +
      '</g>' },

    // Gajah (abu) — big side ears, trunk, tusks
    { id: 'gajah', name: 'Gajah', group: 'proboscidean', svg: '<g>' +
      '<ellipse cx="28" cy="58" rx="16" ry="24" fill="#8A97A4"/>' +
      '<ellipse cx="92" cy="58" rx="16" ry="24" fill="#8A97A4"/>' +
      '<circle cx="60" cy="55" r="32" fill="#9AA7B1"/>' +
      EYES() +
      '<path d="M52 58 C48 76 50 92 60 92 C70 92 72 76 68 58" fill="#9AA7B1"/>' +
      '<path d="M50 64 Q40 72 42 82 Q48 74 55 70 Z" fill="#F5F5F2"/>' +
      '<path d="M70 64 Q80 72 78 82 Q72 74 65 70 Z" fill="#F5F5F2"/>' +
      '</g>' },

    // Katak (hijau) — eyes on top, wide smile
    { id: 'katak', name: 'Katak', group: 'anuran', svg: '<g>' +
      '<circle cx="42" cy="34" r="12" fill="#6FBF44"/>' +
      '<circle cx="78" cy="34" r="12" fill="#6FBF44"/>' +
      '<circle cx="42" cy="34" r="7" fill="#fff"/>' +
      '<circle cx="78" cy="34" r="7" fill="#fff"/>' +
      '<circle cx="44" cy="35" r="3.5" fill="#2B2B2B"/>' +
      '<circle cx="76" cy="35" r="3.5" fill="#2B2B2B"/>' +
      '<circle cx="60" cy="55" r="34" fill="#6FBF44"/>' +
      '<path d="M34 60 Q60 82 86 60" stroke="#2E5D1E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="38" cy="62" r="4" fill="#F9C6D2" opacity="0.8"/>' +
      '<circle cx="82" cy="62" r="4" fill="#F9C6D2" opacity="0.8"/>' +
      '</g>' }
  ];

  var ANIMAL_BY_ID = {};
  ANIMALS.forEach(function (a) { ANIMAL_BY_ID[a.id] = a; });

  return { ANIMALS: ANIMALS, ANIMAL_BY_ID: ANIMAL_BY_ID };
});
