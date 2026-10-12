(function () {
  'use strict';

  var words = window.HSK_WORDS || [];
  // Nội dung do AI tạo (nghĩa Việt, Hán-Việt, ví dụ, chủ đề) được nạp ở việc 3, theo id từ.
  var content = window.HSK_CONTENT || {};

  var store = window.HSKStore;
  var state = { query: '', level: 'all', known: 'all' };

  var els = {
    knownFilter: document.getElementById('known-filter'),
    tabs: document.getElementById('tabs'),
    search: document.getElementById('search'),
    levels: document.getElementById('level-filter'),
    theme: document.getElementById('theme-toggle')
  };

  var list = window.HSKList.create({
    list: document.getElementById('word-list'),
    summary: document.getElementById('summary'),
    pager: document.getElementById('pager'),
    // Khi đang lọc theo trạng thái, đổi trạng thái làm từ biến khỏi danh sách: lọc lại, giữ trang.
    onKnownChange: function () {
      if (state.known === 'all') return false;
      applyFilters(true);
      return true;
    }
  });

  function strip(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  }

  words.forEach(function (w) {
    var c = content[w.id] || {};
    w._search = [w.hanzi, w.traditional, strip(w.pinyin), c.vi ? strip(c.vi) : '', c.hv ? strip(c.hv) : ''].join(' ');
  });

  function applyFilters(keepPage) {
    var q = strip(state.query.trim());
    list.set(words.filter(function (w) {
      if (state.level !== 'all' && String(w.level) !== state.level) return false;
      if (state.known === 'known' && !store.isKnown(w.id)) return false;
      if (state.known === 'unknown' && store.isKnown(w.id)) return false;
      return !q || w._search.indexOf(q) !== -1;
    }), keepPage === true);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function buildLevelChips() {
    var options = [['all', 'Tất cả'], ['1', 'HSK 1'], ['2', 'HSK 2'], ['3', 'HSK 3'], ['4', 'HSK 4'], ['5', 'HSK 5'], ['6', 'HSK 6']];
    options.forEach(function (o) {
      var b = el('button', 'chip', o[1]);
      b.type = 'button';
      b.dataset.level = o[0];
      b.setAttribute('aria-pressed', o[0] === state.level ? 'true' : 'false');
      b.addEventListener('click', function () {
        state.level = o[0];
        Array.prototype.forEach.call(els.levels.children, function (c) {
          c.setAttribute('aria-pressed', c.dataset.level === state.level ? 'true' : 'false');
        });
        applyFilters();
      });
      els.levels.appendChild(b);
    });
  }

  function buildKnownChips() {
    [['all', 'Mọi trạng thái'], ['unknown', 'Chưa thuộc'], ['known', 'Đã thuộc']].forEach(function (o) {
      var b = el('button', 'chip', o[1]);
      b.type = 'button';
      b.dataset.k = o[0];
      b.setAttribute('aria-pressed', o[0] === state.known ? 'true' : 'false');
      b.addEventListener('click', function () {
        state.known = o[0];
        Array.prototype.forEach.call(els.knownFilter.children, function (c) {
          c.setAttribute('aria-pressed', c.dataset.k === state.known ? 'true' : 'false');
        });
        applyFilters();
      });
      els.knownFilter.appendChild(b);
    });
  }

  // Các tab: id = data-view, section tương ứng là #view-<id>.
  var VIEWS = ['browse', 'topics', 'notebook', 'flash', 'context'];

  function showView(v) {
    Array.prototype.forEach.call(els.tabs.children, function (x) {
      x.setAttribute('aria-pressed', x.dataset.view === v ? 'true' : 'false');
    });
    VIEWS.forEach(function (id) { document.getElementById('view-' + id).hidden = id !== v; });
    if (v !== 'notebook') window.HSKNotebook.hide();
    if (v === 'notebook') window.HSKNotebook.show();
    else if (v === 'flash') window.HSKFlash.show();
    else if (v === 'context') window.HSKContext.show();
    else if (v === 'topics') window.HSKTopicView.show();
    else applyFilters();
  }

  function initTabs() {
    Array.prototype.forEach.call(els.tabs.children, function (t) {
      t.addEventListener('click', function () { showView(t.dataset.view); });
    });
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    els.theme.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      if (!cur) cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  els.search.addEventListener('input', function () { state.query = els.search.value; applyFilters(); });

  window.HSKApp = { showView: showView };

  initTheme();
  window.HSKAccount.init();
  buildLevelChips();
  buildKnownChips();
  initTabs();
  applyFilters();
})();
