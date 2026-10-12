(function () {
  'use strict';

  var store = window.HSKStore;
  var root = document.getElementById('view-backup');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  function button(label, cls, fn) {
    var b = el('button', cls || 'btn', label);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  function download() {
    var text = store.exportJSON();
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'hsk-tien-do-' + store.today() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    updateBanner();
  }

  function render(message) {
    root.textContent = '';
    var box = el('div', 'panel');
    box.appendChild(el('h2', null, 'Sao lưu tiến độ'));
    box.appendChild(el('p', 'muted',
      'Tiến độ học chỉ nằm trong trình duyệt này. Xóa dữ liệu trình duyệt hoặc đổi máy sẽ mất. ' +
      'Hãy tải file sao lưu thỉnh thoảng, rồi nạp lại khi cần.'));
    var last = store.lastBackup();
    box.appendChild(el('p', 'muted', 'Đã gặp ' + store.seenCount() + ' từ · đã thuộc ' + store.knownCount() + ' từ · ' +
      (last ? 'sao lưu gần nhất: ' + last : 'chưa sao lưu lần nào')));
    box.appendChild(button('Tải file sao lưu (.json)', 'btn primary', download));
    root.appendChild(box);

    var imp = el('div', 'panel');
    imp.appendChild(el('h3', null, 'Nạp từ file sao lưu'));
    imp.appendChild(el('p', 'muted', 'Nạp file sẽ thay thế toàn bộ tiến độ hiện tại.'));
    var input = el('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.setAttribute('aria-label', 'Chọn file sao lưu');
    var out = el('div', 'import-result');
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { preview(String(r.result), out); };
      r.onerror = function () { out.textContent = 'Không đọc được file.'; };
      r.readAsText(f);
    });
    imp.appendChild(input);
    imp.appendChild(out);
    root.appendChild(imp);

    if (message) root.appendChild(el('p', 'notice', message));
  }

  function preview(text, out) {
    out.textContent = '';
    var res = store.parseImport(text);
    if (!res.ok) { out.appendChild(el('p', 'error', res.error)); return; }
    out.appendChild(el('p', null, 'File hợp lệ: ' + res.stats.cards + ' thẻ' +
      (res.stats.skipped ? ' (bỏ qua ' + res.stats.skipped + ' thẻ lỗi)' : '') +
      (res.stats.exportedAt ? ' · xuất lúc ' + res.stats.exportedAt.slice(0, 10) : '') + '.'));
    out.appendChild(button('Thay thế tiến độ hiện tại', 'btn bad', function () {
      if (!window.confirm('Thay thế tiến độ hiện tại bằng file này? Không hoàn tác được.')) return;
      store.applyImport(res.data);
      updateBanner();
      render('Đã nạp ' + res.stats.cards + ' thẻ.');
    }));
  }

  // Nhắc sao lưu: hiện dải thông báo ở đầu trang khi lâu chưa sao lưu.
  function updateBanner() {
    var b = document.getElementById('backup-banner');
    if (!b) return;
    b.hidden = !store.backupDue();
  }

  function initBanner() {
    var b = document.getElementById('backup-banner');
    if (!b) return;
    b.textContent = '';
    b.appendChild(el('span', null, 'Bạn lâu chưa sao lưu tiến độ học. '));
    b.appendChild(button('Sao lưu ngay', 'link-btn inline', function () {
      var tab = document.querySelector('.tab[data-view=backup]');
      if (tab) tab.click();
    }));
    updateBanner();
  }

  window.HSKBackup = { show: render, updateBanner: updateBanner };
  initBanner();
})();
