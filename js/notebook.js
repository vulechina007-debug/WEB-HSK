(function () {
  'use strict';

  // Tab Sổ tay: hai phần "Ghi chú" (viết tự do) và "Từ đã lưu" (từ vựng, có ghi chú riêng).
  var words = window.HSK_WORDS || [];
  var byId = {};
  words.forEach(function (w) { byId[w.id] = w; });

  var acc = window.HSKAccount;
  var msg = document.getElementById('notebook-msg');
  var wrap = document.getElementById('notebook-wrap');
  var subs = document.getElementById('nb-sub');
  var paneNotes = document.getElementById('nb-notes');
  var paneWords = document.getElementById('nb-words');
  var active = false;
  var sub = 'notes';

  var list = window.HSKList.create({
    list: document.getElementById('notebook-word-list'),
    summary: document.getElementById('notebook-summary'),
    pager: document.getElementById('notebook-pager'),
    notes: true,
    onKnownChange: function () { return false; },
    // Bỏ lưu một từ: nạp lại danh sách, giữ trang hiện tại.
    onNotebookChange: function () { refresh(true); return true; }
  });

  function showSub(s) {
    sub = s;
    Array.prototype.forEach.call(subs.children, function (c) {
      c.setAttribute('aria-pressed', c.dataset.sub === s ? 'true' : 'false');
    });
    paneNotes.hidden = s !== 'notes';
    paneWords.hidden = s !== 'words';
    if (s === 'notes') window.HSKNotes.render();
    else window.HSKNotebook.refreshWords();
  }

  Array.prototype.forEach.call(subs.children, function (c) {
    c.addEventListener('click', function () {
      if (sub === 'notes' && c.dataset.sub !== 'notes') window.HSKNotes.flush();
      showSub(c.dataset.sub);
    });
  });

  function refreshWords(keepPage) {
    var res = acc.ids().map(function (id) { return byId[id]; }).filter(Boolean);
    document.getElementById('notebook-empty').hidden = res.length > 0;
    list.set(res, keepPage === true);
  }

  function refresh(keepPage) {
    msg.textContent = '';
    msg.hidden = false;
    if (!acc.configured()) {
      wrap.hidden = true;
      msg.appendChild(document.createTextNode('Tính năng tài khoản chưa được bật. Xem docs/huong-dan-firebase.md.'));
      return;
    }
    if (!acc.loggedIn()) {
      wrap.hidden = true;
      msg.appendChild(document.createTextNode('Đăng nhập để dùng sổ tay cá nhân: viết ghi chú và lưu từ vựng. '));
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
    if (sub === 'notes') window.HSKNotes.render();
    else refreshWords(keepPage);
  }

  acc.onChange(function () { if (active) refresh(true); });

  window.HSKNotebook = {
    refreshWords: refreshWords,
    show: function () { active = true; refresh(); },
    hide: function () {
      if (active && sub === 'notes' && window.HSKNotes) window.HSKNotes.flush();
      active = false;
    }
  };
})();
