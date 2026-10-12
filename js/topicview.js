(function () {
  'use strict';

  // Tab Chủ đề: lưới các chủ đề; bấm vào một chủ đề để xem danh sách từ của chủ đề đó.
  var words = window.HSK_WORDS || [];
  var content = window.HSK_CONTENT || {};
  var topics = window.HSK_TOPICS || [];
  var store = window.HSKStore;

  var root = document.getElementById('view-topics');
  var gridWrap = document.getElementById('topic-grid-wrap');
  var detail = document.getElementById('topic-detail');
  var grid = document.getElementById('topic-grid');
  var title = document.getElementById('topic-title');
  var list = window.HSKList.create({
    list: document.getElementById('topic-word-list'),
    summary: document.getElementById('topic-summary'),
    pager: document.getElementById('topic-pager'),
    onKnownChange: function () { return false; }
  });
  var current = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function showGrid() {
    current = null;
    detail.hidden = true;
    gridWrap.hidden = false;
    var n = window.HSKTopics.counts();
    grid.textContent = '';
    topics.forEach(function (t) {
      var b = el('button', 'topic-card');
      b.type = 'button';
      b.appendChild(el('span', 'topic-name', t.name));
      b.appendChild(el('span', 'topic-count', (n[t.id] || 0) + ' từ'));
      b.addEventListener('click', function () { open(t); });
      grid.appendChild(b);
    });
  }

  function open(t) {
    current = t;
    gridWrap.hidden = true;
    detail.hidden = false;
    title.textContent = t.name;
    var res = words.filter(function (w) {
      return ((content[w.id] || {}).t || []).indexOf(t.id) !== -1;
    });
    list.set(res);
    window.scrollTo(0, 0);
  }

  document.getElementById('topic-back').addEventListener('click', showGrid);
  document.getElementById('topic-study').addEventListener('click', function () {
    if (!current) return;
    store.settings().topic = current.id;
    store.save();
    window.HSKApp.showView('flash');
  });

  window.HSKTopicView = { show: showGrid };
})();
