(function () {
  'use strict';

  // Sổ tay: danh sách các sổ (tạo / đổi tên / xóa) và bên trong mỗi sổ là các từ đã lưu.
  var words = window.HSK_WORDS || [];
  var byId = {};
  words.forEach(function (w) { byId[w.id] = w; });

  var acc = window.HSKAccount;
  var root = document.getElementById('nb-books');
  var mode = 'list';     // 'list' | 'detail'
  var openId = null;
  var query = '';
  var textTimer = null;
  var list = null;       // HSKList của sổ đang mở

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function strip(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateStr(ts) {
    var d = new Date(ts);
    return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear();
  }
  // Tuổi dạng ngắn: 5m, 3h, 2d, 6w, 4mo, 1y.
  function age(ts) {
    var s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return Math.floor(s / 60) + 'm';
    if (s < 86400) return Math.floor(s / 3600) + 'h';
    if (s < 86400 * 7) return Math.floor(s / 86400) + 'd';
    if (s < 86400 * 30) return Math.floor(s / (86400 * 7)) + 'w';
    if (s < 86400 * 365) return Math.floor(s / (86400 * 30)) + 'mo';
    return Math.floor(s / (86400 * 365)) + 'y';
  }
  function closeMenus() {
    Array.prototype.forEach.call(root.querySelectorAll('.note-menu'), function (m) { m.remove(); });
  }

  /* ---------- Danh sách sổ tay ---------- */
  function renderList() {
    mode = 'list';
    openId = null;
    list = null;
    root.textContent = '';

    var bar = el('div', 'note-bar');
    var search = el('input', 'note-search');
    search.type = 'search';
    search.placeholder = 'Tìm kiếm';
    search.setAttribute('aria-label', 'Tìm sổ tay');
    search.value = query;
    bar.appendChild(search);
    var add = el('button', 'btn primary', '+ Tạo sổ tay');
    add.type = 'button';
    bar.appendChild(add);
    root.appendChild(bar);

    var form = el('form', 'save-new');
    form.hidden = true;
    var input = el('input');
    input.type = 'text'; input.maxLength = 80; input.placeholder = 'Tên sổ tay (ví dụ: Dụng cụ, Tâm trạng - tính cách)';
    input.setAttribute('aria-label', 'Tên sổ tay mới');
    var ok = el('button', 'btn primary', 'Tạo');
    ok.type = 'submit';
    form.appendChild(input); form.appendChild(ok);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = input.value.trim();
      if (!name) { input.focus(); return; }
      var id = acc.addBook(name);
      if (id) openBook(id);
    });
    root.appendChild(form);
    add.addEventListener('click', function () { form.hidden = !form.hidden; if (!form.hidden) input.focus(); });

    var ul = el('ul', 'note-list');
    root.appendChild(ul);

    function fill() {
      ul.textContent = '';
      var q = strip(query.trim());
      var items = acc.books().filter(function (b) { return !q || strip(b.name).indexOf(q) !== -1; });
      if (!items.length) {
        ul.appendChild(el('li', 'panel muted', acc.books().length ? 'Không có sổ tay nào khớp.' : 'Chưa có sổ tay nào. Bấm “+ Tạo sổ tay” để bắt đầu, rồi lưu từ vựng vào đó.'));
        return;
      }
      items.forEach(function (b) { ul.appendChild(renderItem(b)); });
    }
    search.addEventListener('input', function () { query = search.value; fill(); });
    fill();
  }

  function renderItem(b) {
    var li = el('li', 'note-item');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    var top = el('div', 'note-top');
    top.appendChild(el('span', 'note-title', b.name));
    var more = el('button', 'note-more', '⋮');
    more.type = 'button';
    more.setAttribute('aria-label', 'Tùy chọn');
    more.addEventListener('click', function (e) {
      e.stopPropagation();
      var had = li.querySelector('.note-menu');
      closeMenus();
      if (had) return;
      var m = el('div', 'note-menu');
      var ren = el('button', null, 'Đổi tên');
      ren.type = 'button';
      ren.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var name = window.prompt('Tên sổ tay', b.name);
        if (name !== null && name.trim()) { acc.renameBook(b.id, name); renderList(); }
        else closeMenus();
      });
      var del = el('button', 'danger', 'Xóa');
      del.type = 'button';
      del.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (window.confirm('Xóa sổ tay “' + b.name + '” và các từ trong đó?')) { acc.removeBook(b.id); renderList(); }
      });
      m.appendChild(ren); m.appendChild(del);
      li.appendChild(m);
    });
    top.appendChild(more);
    li.appendChild(top);
    var meta = el('div', 'note-meta');
    meta.appendChild(el('span', null, b.count + ' từ · ' + age(b.u)));
    meta.appendChild(el('span', null, dateStr(b.u)));
    li.appendChild(meta);
    li.addEventListener('click', function () { openBook(b.id); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Enter') openBook(b.id); });
    return li;
  }

  /* ---------- Bên trong một sổ tay ---------- */
  function openBook(id) {
    var b = acc.book(id);
    if (!b) { renderList(); return; }
    mode = 'detail';
    openId = id;
    root.textContent = '';

    var head = el('div', 'topic-head');
    var back = el('button', 'btn', '← Tất cả sổ tay');
    back.type = 'button';
    back.addEventListener('click', function () { flushText(); renderList(); });
    head.appendChild(back);
    var ren = el('button', 'btn', 'Đổi tên');
    ren.type = 'button';
    ren.addEventListener('click', function () {
      var name = window.prompt('Tên sổ tay', acc.book(id).name);
      if (name !== null && name.trim()) { acc.renameBook(id, name); openBook(id); }
    });
    head.appendChild(ren);
    var del = el('button', 'btn bad', 'Xóa sổ tay');
    del.type = 'button';
    del.addEventListener('click', function () {
      if (window.confirm('Xóa sổ tay “' + acc.book(id).name + '” và các từ trong đó?')) { acc.removeBook(id); renderList(); }
    });
    head.appendChild(del);
    root.appendChild(head);

    root.appendChild(el('h2', 'section-title', b.name));

    // Ghi chú chung của sổ tay (viết tự do).
    var det = el('details', 'examples book-text');
    det.appendChild(el('summary', null, 'Ghi chú chung' + (b.text ? ' ✎' : '')));
    var ta = el('textarea', 'note-body');
    ta.rows = 6;
    ta.maxLength = 20000;
    ta.placeholder = 'Viết tự do: mẫu câu, ngữ pháp, điều cần nhớ…';
    ta.value = b.text;
    ta.addEventListener('input', function () {
      clearTimeout(textTimer);
      textTimer = setTimeout(function () { acc.setBookText(id, ta.value); }, 600);
    });
    det.appendChild(ta);
    root.appendChild(det);

    var summary = el('p', 'summary');
    summary.setAttribute('aria-live', 'polite');
    var ul = el('ul', 'word-list');
    var pager = el('nav', 'pager');
    pager.hidden = true;
    var empty = el('p', 'panel muted', 'Sổ tay chưa có từ nào. Ở tab Từ vựng, bấm “☆ Lưu” ở một từ rồi chọn sổ tay này.');
    root.appendChild(empty);
    root.appendChild(summary);
    root.appendChild(ul);
    root.appendChild(pager);

    list = window.HSKList.create({
      list: ul, summary: summary, pager: pager, bookId: id,
      onKnownChange: function () { return false; },
      onBookChange: function () { refreshWords(true); }
    });

    function refreshWords(keep) {
      var res = acc.bookWordIds(id).map(function (wid) { return byId[wid]; }).filter(Boolean);
      empty.hidden = res.length > 0;
      list.set(res, keep === true);
    }
    root.refreshWords = refreshWords;
    refreshWords();
    window.scrollTo(0, 0);
  }

  function flushText() {
    clearTimeout(textTimer);
    if (mode === 'detail' && openId) {
      var ta = root.querySelector('.book-text textarea');
      if (ta && acc.book(openId)) acc.setBookText(openId, ta.value);
    }
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.note-menu, .note-more')) closeMenus();
  });

  window.HSKBooks = {
    // Gọi khi vào tab hoặc dữ liệu thay đổi.
    render: function () {
      // Đang mở một sổ: chỉ nạp lại danh sách từ (không đụng tới ô ghi chú đang gõ).
      if (mode === 'detail' && acc.book(openId)) { if (root.refreshWords) root.refreshWords(true); return; }
      renderList();
    },
    flush: flushText
  };
})();
