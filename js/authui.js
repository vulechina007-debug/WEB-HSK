(function () {
  'use strict';

  var acc = window.HSKAccount;
  var btn = document.getElementById('account-btn');
  var dlg = document.getElementById('auth-dialog');
  var body = document.getElementById('auth-body');
  var mode = 'login'; // 'login' | 'register'

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function updateButton() {
    var u = acc.user();
    btn.textContent = u ? (u.email || 'Tài khoản').split('@')[0] : 'Đăng nhập';
    btn.title = u ? u.email || '' : '';
  }

  function open() {
    render();
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  }
  function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

  function render(message) {
    body.textContent = '';
    var head = el('div', 'dlg-head');
    head.appendChild(el('h2', null, acc.loggedIn() ? 'Tài khoản' : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký')));
    var x = el('button', 'icon-btn', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Đóng');
    x.addEventListener('click', close);
    head.appendChild(x);
    body.appendChild(head);

    if (!acc.configured()) {
      body.appendChild(el('p', 'muted', 'Tính năng tài khoản chưa được cấu hình. Xem docs/huong-dan-firebase.md để bật.'));
      return;
    }

    if (acc.loggedIn()) {
      body.appendChild(el('p', null, acc.user().email || ''));
      body.appendChild(el('p', 'muted', 'Tiến độ học và sổ tay được lưu theo tài khoản này, mở ở máy nào cũng thấy.'));
      var out = el('button', 'btn bad', 'Đăng xuất');
      out.type = 'button';
      out.addEventListener('click', function () { acc.logout().then(close); });
      body.appendChild(out);
      return;
    }

    var form = el('form', 'auth-form');
    var email = el('input'); email.type = 'email'; email.required = true; email.placeholder = 'Email'; email.autocomplete = 'email';
    var pw = el('input'); pw.type = 'password'; pw.required = true; pw.placeholder = 'Mật khẩu (tối thiểu 6 ký tự)';
    pw.autocomplete = mode === 'login' ? 'current-password' : 'new-password'; pw.minLength = 6;
    var msg = el('p', 'error');
    msg.setAttribute('role', 'alert');
    if (message) msg.textContent = message;
    var go = el('button', 'btn primary', mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản');
    go.type = 'submit';
    form.appendChild(email); form.appendChild(pw); form.appendChild(msg); form.appendChild(go);

    function run(promise) {
      go.disabled = true;
      msg.textContent = '';
      promise.then(close).catch(function (e) { msg.textContent = acc.errMsg(e); }).then(function () { go.disabled = false; });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      run(mode === 'login' ? acc.login(email.value.trim(), pw.value) : acc.register(email.value.trim(), pw.value));
    });
    body.appendChild(form);

    var g = el('button', 'btn', 'Đăng nhập bằng Google');
    g.type = 'button';
    g.addEventListener('click', function () { run(acc.google()); });
    body.appendChild(g);

    var row = el('div', 'auth-links');
    var sw = el('button', 'link-btn inline', mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập');
    sw.type = 'button';
    sw.addEventListener('click', function () { mode = mode === 'login' ? 'register' : 'login'; render(); });
    row.appendChild(sw);
    if (mode === 'login') {
      var fg = el('button', 'link-btn inline', 'Quên mật khẩu?');
      fg.type = 'button';
      fg.addEventListener('click', function () {
        if (!email.value.trim()) { msg.textContent = 'Nhập email rồi bấm lại.'; return; }
        acc.reset(email.value.trim())
          .then(function () { msg.textContent = ''; render('Đã gửi email đặt lại mật khẩu (kiểm tra cả thư rác).'); })
          .catch(function (e) { msg.textContent = acc.errMsg(e); });
      });
      row.appendChild(fg);
    }
    body.appendChild(row);
  }

  btn.addEventListener('click', open);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  acc.onChange(function () {
    updateButton();
    if (dlg.open && acc.loggedIn() && !body.querySelector('.btn.bad')) render();
  });
  updateButton();

  window.HSKAuthUI = { open: open };
})();
