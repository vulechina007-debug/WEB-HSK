(function () {
  'use strict';

  // Tab Sổ tay: nhắc đăng nhập nếu cần, còn lại do HSKBooks (js/books.js) vẽ.
  var acc = window.HSKAccount;
  var msg = document.getElementById('notebook-msg');
  var wrap = document.getElementById('notebook-wrap');
  var active = false;

  function refresh() {
    msg.textContent = '';
    msg.hidden = false;
    if (!acc.configured()) {
      wrap.hidden = true;
      msg.appendChild(document.createTextNode('Tính năng tài khoản chưa được bật. Xem docs/huong-dan-firebase.md.'));
      return;
    }
    if (!acc.loggedIn()) {
      wrap.hidden = true;
      msg.appendChild(document.createTextNode('Đăng nhập để tạo sổ tay và lưu từ vựng vào đó. '));
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
    msg.hidden = true;
    wrap.hidden = false;
    window.HSKBooks.render();
  }

  acc.onChange(function () { if (active) refresh(); });

  window.HSKNotebook = {
    show: function () { active = true; refresh(); },
    hide: function () {
      if (active && window.HSKBooks) window.HSKBooks.flush();
      active = false;
    }
  };
})();
