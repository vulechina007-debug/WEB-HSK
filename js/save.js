(function () {
  'use strict';

  // Hộp chọn sổ tay khi lưu một từ: tick / bỏ tick để thêm / bỏ từ khỏi từng sổ, hoặc tạo sổ mới.
  var acc = window.HSKAccount;
  var dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  dlg.setAttribute('aria-label', 'Lưu vào sổ tay');
  document.body.appendChild(dlg);

  var current = null; // { w, onClose }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function close() {
    if (dlg.close) dlg.close(); else dlg.removeAttribute('open');
  }

  function render() {
    var w = current.w;
    dlg.textContent = '';

    var head = el('div', 'dlg-head');
    head.appendChild(el('h2', null, 'Lưu “' + String(w.hanzi).split('|')[0] + '” vào sổ tay'));
    var x = el('button', 'icon-btn', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Đóng');
    x.addEventListener('click', close);
    head.appendChild(x);
    dlg.appendChild(head);

    var books = acc.books();
    var inBooks = acc.booksOf(w.id);
    var list = el('div', 'save-list');
    if (!books.length) list.appendChild(el('p', 'muted', 'Bạn chưa có sổ tay nào. Tạo sổ tay đầu tiên ở dưới.'));
    books.forEach(function (b) {
      var lab = el('label', 'save-row');
      var cb = el('input');
      cb.type = 'checkbox';
      cb.checked = inBooks.indexOf(b.id) !== -1;
      cb.addEventListener('change', function () {
        if (cb.checked) acc.addWordTo(b.id, w.id); else acc.removeWordFrom(b.id, w.id);
      });
      lab.appendChild(cb);
      lab.appendChild(el('span', 'save-name', b.name));
      lab.appendChild(el('span', 'muted', b.count + ' từ'));
      list.appendChild(lab);
    });
    dlg.appendChild(list);

    var form = el('form', 'save-new');
    var input = el('input');
    input.type = 'text';
    input.maxLength = 80;
    input.placeholder = 'Tên sổ tay mới';
    input.setAttribute('aria-label', 'Tên sổ tay mới');
    var add = el('button', 'btn', 'Tạo & lưu');
    add.type = 'submit';
    form.appendChild(input);
    form.appendChild(add);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = input.value.trim();
      if (!name) { input.focus(); return; }
      var id = acc.addBook(name);
      if (id) { acc.addWordTo(id, w.id); render(); }
    });
    dlg.appendChild(form);

    var done = el('button', 'btn primary', 'Xong');
    done.type = 'button';
    done.addEventListener('click', close);
    dlg.appendChild(done);
  }

  dlg.addEventListener('close', function () {
    var cb = current && current.onClose;
    current = null;
    if (cb) cb();
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });

  window.HSKSave = {
    open: function (w, onClose) {
      if (!acc.loggedIn()) { window.HSKAuthUI.open(); return; }
      if (!acc.ready()) return;
      current = { w: w, onClose: onClose };
      render();
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    }
  };
})();
