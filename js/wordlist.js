(function () {
  'use strict';

  // Danh sách từ có phân trang (50 từ / trang), dùng chung cho tab Từ vựng và tab Chủ đề.
  var PAGE_SIZE = 50;
  var content = window.HSK_CONTENT || {};
  var store = window.HSKStore;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  // opts: { list, summary, pager, onKnownChange(): gọi khi đổi trạng thái đã thuộc }
  function create(opts) {
    var results = [];
    var page = 1;

    function pages() { return Math.max(1, Math.ceil(results.length / PAGE_SIZE)); }

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
        if (opts.onKnownChange && opts.onKnownChange()) return; // danh sách được lọc lại
        var now = store.isKnown(w.id);
        kb.textContent = now ? '✓ Đã thuộc' : 'Đánh dấu đã thuộc';
        kb.setAttribute('aria-pressed', now ? 'true' : 'false');
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

    function pagerBtn(label, aria, disabled, to) {
      var b = el('button', 'pg-btn', label);
      b.type = 'button';
      b.setAttribute('aria-label', aria);
      b.disabled = disabled;
      b.addEventListener('click', function () { go(to); });
      return b;
    }

    function renderPager() {
      var n = pages();
      var p = opts.pager;
      p.textContent = '';
      p.hidden = results.length <= PAGE_SIZE;
      if (p.hidden) return;

      p.appendChild(pagerBtn('⏮', 'Trang đầu', page <= 1, 1));
      p.appendChild(pagerBtn('‹', 'Trang trước', page <= 1, page - 1));
      var input = el('input', 'pg-input');
      input.type = 'number';
      input.min = 1;
      input.max = n;
      input.value = page;
      input.setAttribute('aria-label', 'Số trang');
      input.addEventListener('change', function () { go(parseInt(input.value, 10) || page); });
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') input.blur(); });
      p.appendChild(input);
      p.appendChild(el('span', 'pg-total', 'trên ' + n));
      p.appendChild(pagerBtn('›', 'Trang sau', page >= n, page + 1));
      p.appendChild(pagerBtn('⏭', 'Trang cuối', page >= n, n));
    }

    function render() {
      opts.list.textContent = '';
      var frag = document.createDocumentFragment();
      results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).forEach(function (w) { frag.appendChild(renderWord(w)); });
      opts.list.appendChild(frag);
      var from = results.length ? (page - 1) * PAGE_SIZE + 1 : 0;
      var to = Math.min(page * PAGE_SIZE, results.length);
      opts.summary.textContent = 'Từ ' + from + '–' + to + ' / ' + results.length + ' từ';
      renderPager();
    }

    function go(p) {
      var n = pages();
      page = Math.min(n, Math.max(1, p));
      render();
      opts.summary.scrollIntoView({ block: 'start' });
    }

    return {
      // Đặt lại kết quả; keepPage = giữ nguyên trang hiện tại (nếu còn hợp lệ).
      set: function (r, keepPage) {
        results = r;
        page = keepPage ? Math.min(page, pages()) : 1;
        render();
      }
    };
  }

  window.HSKList = { create: create };
})();
