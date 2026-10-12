(function () {
  'use strict';

  // Tab Sổ tay: các từ đã lưu của tài khoản, mới lưu hiện trước, có ghi chú riêng.
  var words = window.HSK_WORDS || [];
  var byId = {};
  words.forEach(function (w) { byId[w.id] = w; });

  var acc = window.HSKAccount;
  var msg = document.getElementById('notebook-msg');
  var wrap = document.getElementById('notebook-wrap');
  var active = false;

  var list = window.HSKList.create({
    list: document.getElementById('notebook-word-list'),
    summary: document.getElementById('notebook-summary'),
    pager: document.getElementById('notebook-pager'),
    notes: true,
    onKnownChange: function () { return false; },
    // Bỏ lưu một từ: nạp lại danh sách, giữ trang hiện tại.
    onNotebookChange: function () { refresh(true); return true; }
  });

  function refresh(keepPage) {
    msg.textContent = '';
    if (!acc.configured()) {
      wrap.hidden = true;
      msg.appendChild(document.createTextNode('Tính năng tài khoản chưa được bật. Xem docs/huong-dan-firebase.md.'));
      return;
    }
    if (!acc.loggedIn()) {
      wrap.hidden = true;
      msg.appendChild(document.createTextNode('Đăng nhập để lưu từ vào sổ tay cá nhân. '));
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn primary'; b.textContent = 'Đăng nhập / Đăng ký';
      b.addEventListener('click', function () { window.HSKAuthUI.open(); });
      msg.appendChild(b);
      return;
    }
    if (!acc.ready()) {
      wrap.hidden = true;
      msg.appendChild(document.createTextNode(acc.status() || 'Đang tải sổ tay…'));
      return;
    }
    wrap.hidden = false;
    var res = acc.ids().map(function (id) { return byId[id]; }).filter(Boolean);
    document.getElementById('notebook-empty').hidden = res.length > 0;
    list.set(res, keepPage === true);
  }

  acc.onChange(function () { if (active) refresh(true); });

  window.HSKNotebook = {
    show: function () { active = true; refresh(); },
    hide: function () { active = false; }
  };
})();
