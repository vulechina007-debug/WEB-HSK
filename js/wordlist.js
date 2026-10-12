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

    // Nghĩa: từ nhiều nghĩa (ngăn cách bằng ;) hiển thị thành danh sách đánh số.
    function renderMeaning(vi) {
      var senses = String(vi).split(/\s*[;；]\s*/).filter(Boolean);
      if (senses.length < 2) return el('div', 'vi', vi);
      var box = el('div', 'vi');
      box.appendChild(el('div', 'senses-label', senses.length + ' nghĩa'));
      var ol = el('ol', 'senses');
      senses.forEach(function (s) { ol.appendChild(el('li', null, s)); });
      box.appendChild(ol);
      return box;
    }

    function pages() { return Math.max(1, Math.ceil(results.length / PAGE_SIZE)); }

    function renderWord(w) {
      var c = content[w.id] || {};
      var li = el('li', 'word');
      var slash = function (s) { return String(s || '').split('|').join(' / '); };

      // Dòng đầu: chữ Hán (to, đỏ) + dạng phồn thể + nút phát âm.
      var head = el('div', 'w-head');
      var title = el('div', 'w-title');
      title.appendChild(el('span', 'hanzi', slash(w.hanzi)));
      if (w.traditional && w.traditional !== w.hanzi) title.appendChild(el('span', 'trad', '【' + slash(w.traditional) + '】'));
      head.appendChild(title);
      var btn = el('button', 'pill speak-pill', '🔊 Phát âm');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Phát âm ' + w.hanzi);
      btn.addEventListener('click', function () { speak(String(w.hanzi).split('|')[0]); });
      head.appendChild(btn);
      li.appendChild(head);

      // Pinyin và âm Hán-Việt.
      var sub = el('div', 'w-sub');
      sub.appendChild(el('span', 'pinyin', '[' + slash(w.pinyin) + ']'));
      if (c.hv) sub.appendChild(el('span', 'hv', '[' + c.hv.toUpperCase() + ']'));
      li.appendChild(sub);

      // Loại từ dạng nhãn.
      var chips = el('div', 'w-chips');
      String(w.pos || '').split('/').filter(Boolean).forEach(function (p) {
        chips.appendChild(el('span', 'tag tag-pos', window.HSKPos.name(p)));
      });
      if (chips.children.length) li.appendChild(chips);

      var lv = el('div', 'w-level');
      lv.appendChild(el('span', 'muted', 'Cấp độ:'));
      lv.appendChild(el('span', 'tag tag-level', 'HSK ' + w.level));
      li.appendChild(lv);

      if (c.vi) li.appendChild(renderMeaning(c.vi));

      var row = el('div', 'word-actions');
      li.appendChild(row);
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
      row.appendChild(kb);

      // Sổ tay cá nhân: cần đăng nhập.
      var acc = window.HSKAccount;
      var nb = el('button', 'known-btn nb-btn');
      function paintNb() {
        var saved = acc.loggedIn() && acc.has(w.id);
        nb.textContent = saved ? '★ Đã lưu vào sổ tay' : '☆ Lưu vào sổ tay';
        nb.setAttribute('aria-pressed', saved ? 'true' : 'false');
      }
      paintNb();
      nb.type = 'button';
      nb.addEventListener('click', function () {
        if (!acc.loggedIn()) { window.HSKAuthUI.open(); return; }
        if (!acc.ready()) return;
        if (acc.has(w.id)) acc.remove(w.id); else acc.add(w.id);
        if (opts.onNotebookChange && opts.onNotebookChange()) return;
        paintNb();
      });
      row.appendChild(nb);

      if (c.ex && c.ex.length) {
        var d = el('details', 'examples');
        d.appendChild(el('summary', null, 'Ví dụ (' + c.ex.length + ')'));
        c.ex.forEach(function (x) {
          var b = el('div', 'fc-ex');
          var zr = el('div', 'ex-row');
          zr.appendChild(el('div', 'ex-zh', x.zh));
          zr.appendChild(window.HSKSpeak.button(x.zh));
          b.appendChild(zr);
          b.appendChild(el('div', 'ex-py', x.py));
          b.appendChild(el('div', 'ex-vi', x.vi));
          d.appendChild(b);
        });
        li.appendChild(d);
      }
      if (opts.notes) {
        var note = el('textarea', 'note-input');
        note.rows = 2;
        note.maxLength = 300;
        note.placeholder = 'Ghi chú của bạn về từ này…';
        note.setAttribute('aria-label', 'Ghi chú cho ' + w.hanzi);
        note.value = window.HSKAccount.noteOf(w.id);
        note.addEventListener('change', function () { window.HSKAccount.setNote(w.id, note.value); });
        li.appendChild(note);
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
