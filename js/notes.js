(function () {
  'use strict';

  // Ghi chú tự do trong Sổ tay: danh sách (tìm kiếm, tạo mới, sửa / xóa) và trình soạn.
  var acc = window.HSKAccount;
  var root = document.getElementById('nb-notes');
  var mode = 'list';      // 'list' | 'edit'
  var editing = null;     // id ghi chú đang sửa
  var query = '';
  var saveTimer = null;

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
  // Tuổi ghi chú dạng ngắn: 5m, 3h, 2d, 6w, 4mo, 1y.
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

  /* ---------- Danh sách ---------- */
  function renderList() {
    mode = 'list';
    editing = null;
    root.textContent = '';

    var bar = el('div', 'note-bar');
    var search = el('input', 'note-search');
    search.type = 'search';
    search.placeholder = 'Tìm kiếm';
    search.setAttribute('aria-label', 'Tìm ghi chú');
    search.value = query;
    bar.appendChild(search);
    var add = el('button', 'btn primary', '+ Tạo sổ tay');
    add.type = 'button';
    add.addEventListener('click', function () {
      var id = acc.addNote();
      if (id) openEditor(id);
    });
    bar.appendChild(add);
    root.appendChild(bar);

    var ul = el('ul', 'note-list');
    root.appendChild(ul);

    function fill() {
      ul.textContent = '';
      var q = strip(query.trim());
      var items = acc.notes().filter(function (n) { return !q || strip(n.t + ' ' + n.c).indexOf(q) !== -1; });
      if (!items.length) {
        ul.appendChild(el('li', 'panel muted', acc.notes().length ? 'Không có ghi chú nào khớp.' : 'Chưa có sổ tay nào. Bấm “+ Tạo sổ tay” để viết ghi chú đầu tiên.'));
        return;
      }
      items.forEach(function (n) { ul.appendChild(renderItem(n)); });
    }
    search.addEventListener('input', function () { query = search.value; fill(); });
    fill();
  }

  function renderItem(n) {
    var li = el('li', 'note-item');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    var top = el('div', 'note-top');
    top.appendChild(el('span', 'note-title', n.t || '(Chưa có tiêu đề)'));
    var more = el('button', 'note-more', '⋮');
    more.type = 'button';
    more.setAttribute('aria-label', 'Tùy chọn');
    more.addEventListener('click', function (e) {
      e.stopPropagation();
      var had = li.querySelector('.note-menu');
      closeMenus();
      if (had) return;
      var m = el('div', 'note-menu');
      var ed = el('button', null, 'Sửa');
      ed.type = 'button';
      ed.addEventListener('click', function (ev) { ev.stopPropagation(); openEditor(n.id); });
      var del = el('button', 'danger', 'Xóa');
      del.type = 'button';
      del.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (window.confirm('Xóa ghi chú này?')) { acc.removeNote(n.id); renderList(); }
      });
      m.appendChild(ed); m.appendChild(del);
      li.appendChild(m);
    });
    top.appendChild(more);
    li.appendChild(top);
    if (n.c) li.appendChild(el('div', 'note-preview', n.c.replace(/\s+/g, ' ').slice(0, 120)));
    var meta = el('div', 'note-meta');
    meta.appendChild(el('span', null, age(n.u)));
    meta.appendChild(el('span', null, dateStr(n.u)));
    li.appendChild(meta);
    li.addEventListener('click', function () { openEditor(n.id); });
    li.addEventListener('keydown', function (e) { if (e.key === 'Enter') openEditor(n.id); });
    return li;
  }

  /* ---------- Trình soạn ---------- */
  function openEditor(id) {
    var n = acc.note(id);
    if (!n) { renderList(); return; }
    mode = 'edit';
    editing = id;
    root.textContent = '';

    var head = el('div', 'note-bar');
    var back = el('button', 'btn', '← Danh sách');
    back.type = 'button';
    back.addEventListener('click', leaveEditor);
    head.appendChild(back);
    var status = el('span', 'muted', 'Đã lưu');
    status.setAttribute('aria-live', 'polite');
    head.appendChild(status);
    var del = el('button', 'btn bad', 'Xóa');
    del.type = 'button';
    del.addEventListener('click', function () {
      if (window.confirm('Xóa ghi chú này?')) { acc.removeNote(id); renderList(); }
    });
    head.appendChild(del);
    root.appendChild(head);

    var title = el('input', 'note-title-input');
    title.type = 'text';
    title.maxLength = 120;
    title.placeholder = 'Tiêu đề';
    title.value = n.t || '';
    var body = el('textarea', 'note-body');
    body.rows = 16;
    body.maxLength = 20000;
    body.placeholder = 'Nội dung ghi chú: từ mới, mẫu câu, ngữ pháp, điều cần nhớ…';
    body.value = n.c || '';

    function save() {
      acc.updateNote(id, title.value, body.value);
      status.textContent = 'Đã lưu';
    }
    function changed() {
      status.textContent = 'Đang lưu…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(save, 600);
    }
    title.addEventListener('input', changed);
    body.addEventListener('input', changed);
    root.appendChild(title);
    root.appendChild(body);
    (n.t ? body : title).focus();
  }

  function leaveEditor() {
    clearTimeout(saveTimer);
    var id = editing;
    if (id) {
      var t = root.querySelector('.note-title-input'), b = root.querySelector('.note-body');
      if (t && b) {
        if (!t.value.trim() && !b.value.trim()) acc.removeNote(id); // bỏ ghi chú trống
        else acc.updateNote(id, t.value, b.value);
      }
    }
    renderList();
  }

  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.note-menu, .note-more')) closeMenus(); });

  window.HSKNotes = {
    // Gọi khi vào tab hoặc dữ liệu thay đổi; không vẽ lại khi đang soạn.
    render: function () { if (mode === 'edit' && acc.note(editing)) return; renderList(); },
    flush: function () { if (mode === 'edit') leaveEditor(); }
  };
})();
