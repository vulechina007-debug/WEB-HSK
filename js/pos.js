(function () {
  'use strict';

  // Loại từ: đổi ký hiệu viết tắt của bộ dữ liệu sang tiếng Việt.
  var NAMES = {
    N: 'danh từ', V: 'động từ', Adj: 'tính từ', Adv: 'phó từ', M: 'lượng từ', Conj: 'liên từ',
    Pron: 'đại từ', Prep: 'giới từ', Num: 'số từ', Aux: 'trợ từ', Suffix: 'hậu tố',
    Prefix: 'tiền tố', Intj: 'thán từ', Phonetic: 'từ tượng thanh'
  };

  function name(pos) {
    if (!pos) return '';
    return pos.split('/').map(function (p) { return NAMES[p] || p; }).join(', ');
  }

  window.HSKPos = { name: name };
})();
