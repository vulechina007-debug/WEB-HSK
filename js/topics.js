(function () {
  'use strict';

  var words = window.HSK_WORDS || [];
  var content = window.HSK_CONTENT || {};
  var topics = window.HSK_TOPICS || [];

  // Đếm số từ theo chủ đề (tùy chọn: chỉ trong các cấp cho trước).
  function counts(levels) {
    var out = {}, total = 0;
    words.forEach(function (w) {
      var c = content[w.id];
      if (!c || (levels && levels.indexOf(w.level) === -1)) return;
      total++;
      (c.t || []).forEach(function (t) { out[t] = (out[t] || 0) + 1; });
    });
    out.all = total;
    return out;
  }

  // Đổ danh sách chủ đề vào một <select>.
  function fill(sel, current, levels) {
    var n = counts(levels);
    sel.textContent = '';
    var all = document.createElement('option');
    all.value = '';
    all.textContent = 'Tất cả chủ đề (' + n.all + ')';
    sel.appendChild(all);
    topics.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t.id;
      o.textContent = t.name + ' (' + (n[t.id] || 0) + ')';
      sel.appendChild(o);
    });
    sel.value = current || '';
  }

  window.HSKTopics = { fill: fill, counts: counts };
})();
