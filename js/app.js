(function () {
  'use strict';

  var PAGE_SIZE = 100;
  var words = window.HSK_WORDS || [];
  // Nội dung do AI tạo (nghĩa Việt, Hán-Việt, ví dụ, chủ đề) được nạp ở việc 3, theo id từ.
  var content = window.HSK_CONTENT || {};

  var store = window.HSKStore;
  var state = { query: '', level: 'all', known: 'all', topic: '', shown: PAGE_SIZE, results: [] };

  var els = {
    topicFilter: document.getElementById('topic-filter'),
    knownFilter: document.getElementById('known-filter'),
    tabs: document.getElementById('tabs'),
    viewBrowse: document.getElementById('view-browse'),
    viewFlash: document.getElementById('view-flash'),
    search: document.getElementById('search'),
    levels: document.getElementById('level-filter'),
    summary: document.getElementById('summary'),
    list: document.getElementById('word-list'),
    more: document.getElementById('load-more'),
    theme: document.getElementById('theme-toggle')
  };

  function strip(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  }

  words.forEach(function (w) {
    var c = content[w.id] || {};
    w._search = [w.hanzi, w.traditional, strip(w.pinyin), c.vi ? strip(c.vi) : '', c.hv ? strip(c.hv) : ''].join(' ');
  });

  function applyFilters() {
    var q = strip(state.query.trim());
    state.results = words.filter(function (w) {
      if (state.level !== 'all' && String(w.level) !== state.level) return false;
      if (state.topic && ((content[w.id] || {}).t || []).indexOf(state.topic) === -1) return false;
      if (state.known === 'known' && !store.isKnown(w.id)) return false;
      if (state.known === 'unknown' && store.isKnown(w.id)) return false;
      return !q || w._search.indexOf(q) !== -1;
    });
    state.shown = PAGE_SIZE;
    render();
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function renderWord(w) {
    var c = content[w.id] || {};
    var li = el('li', 'word');

    li.appendChild(el('span', 'hanzi', w.hanzi));

    var mid = el('div');
    mid.appendChild(el('div', 'pinyin', w.pinyin));
    mid.appendChild(el('div', 'meta', 'HSK ' + w.level + (w.pos ? ' · ' + w.pos : '') + (c.hv ? ' · ' + c.hv : '')));
    li.appendChild(mid);

    var btn = el('button', 'speak', '🔊');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Phát âm ' + w.hanzi);
    btn.addEventListener('click', function () { speak(w.hanzi); });
    li.appendChild(btn);

    var known = store.isKnown(w.id);
    var kb = el('button', 'known-btn', known ? '✓ Đã thuộc' : 'Đánh dấu đã thuộc');
    kb.type = 'button';
    kb.setAttribute('aria-pressed', known ? 'true' : 'false');
    kb.addEventListener('click', function () {
      store.markKnown(w.id, !store.isKnown(w.id));
      if (state.known === 'all') {
        var now = store.isKnown(w.id);
        kb.textContent = now ? '✓ Đã thuộc' : 'Đánh dấu đã thuộc';
        kb.setAttribute('aria-pressed', now ? 'true' : 'false');
      } else {
        var keep = state.shown;
        applyFilters();
        state.shown = keep;
        render();
      }
    });
    li.appendChild(kb);

    if (c.vi) {
      var vi = el('div', 'vi', c.vi);
      vi.appendChild(el('span', 'badge', 'AI tạo'));
      li.appendChild(vi);
    }
    if (c.ex && c.ex.length) {
      var d = el('details', 'examples');
      d.appendChild(el('summary', null, 'Ví dụ (' + c.ex.length + ')'));
      c.ex.forEach(function (x) {
        var b = el('div', 'fc-ex');
        b.appendChild(el('div', 'ex-zh', x.zh));
        b.appendChild(el('div', 'ex-py', x.py));
        b.appendChild(el('div', 'ex-vi', x.vi));
        d.appendChild(b);
      });
      li.appendChild(d);
    }
    return li;
  }

  function render() {
    els.list.textContent = '';
    var frag = document.createDocumentFragment();
    state.results.slice(0, state.shown).forEach(function (w) { frag.appendChild(renderWord(w)); });
    els.list.appendChild(frag);

    els.summary.textContent = 'Hiển thị ' + Math.min(state.shown, state.results.length) + ' / ' + state.results.length + ' từ';
    els.more.hidden = state.shown >= state.results.length;
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

  function initTabs() {
    Array.prototype.forEach.call(els.tabs.children, function (t) {
      t.addEventListener('click', function () {
        var v = t.dataset.view;
        Array.prototype.forEach.call(els.tabs.children, function (x) {
          x.setAttribute('aria-pressed', x === t ? 'true' : 'false');
        });
        els.viewBrowse.hidden = v !== 'browse';
        els.viewFlash.hidden = v !== 'flash';
        document.getElementById('view-context').hidden = v !== 'context';
        document.getElementById('view-backup').hidden = v !== 'backup';
        window.HSKBackup.updateBanner();
        if (v === 'flash') window.HSKFlash.show();
        else if (v === 'context') window.HSKContext.show();
        else if (v === 'backup') window.HSKBackup.show();
        else applyFilters();
      });
    });
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
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
  els.more.addEventListener('click', function () { state.shown += PAGE_SIZE; render(); });

  initTheme();
  buildLevelChips();
  buildKnownChips();
  window.HSKTopics.fill(els.topicFilter, '');
  els.topicFilter.addEventListener('change', function () { state.topic = els.topicFilter.value; applyFilters(); });
  initTabs();
  applyFilters();
})();
