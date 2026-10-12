(function () {
  'use strict';

  var store = window.HSKStore;
  var words = window.HSK_WORDS || [];
  var content = window.HSK_CONTENT || {};
  var byId = {};
  words.forEach(function (w) { byId[w.id] = w; });

  var root = document.getElementById('view-flash');
  var session = null; // { queue:[ids], done, total, flipped, dir, newIds:{} }

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
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN'; u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  function inTopic(id) {
    var t = store.settings().topic;
    return !t || ((content[id] || {}).t || []).indexOf(t) !== -1;
  }

  // Thẻ đến hạn ôn, giới hạn theo chủ đề đang chọn (nếu có).
  function dueList() { return store.dueIds().filter(inTopic); }

  // Từ mới chưa gặp, theo các cấp và chủ đề đã chọn, đúng thứ tự trong bộ từ.
  function pickNew(n) {
    var lv = store.settings().levels;
    var out = [];
    for (var i = 0; i < words.length && out.length < n; i++) {
      var w = words[i];
      if (lv.indexOf(w.level) !== -1 && !store.card(w.id) && content[w.id] && inTopic(w.id)) out.push(w.id);
    }
    return out;
  }

  function newLeft() {
    return Math.max(0, store.settings().newPerDay - store.newToday());
  }

  /* ---------- Màn hình chính của flashcard ---------- */
  function renderHome() {
    session = null;
    root.textContent = '';

    var due = dueList().length;
    var left = newLeft();
    var s = store.settings();
    var topicName = '';
    (window.HSK_TOPICS || []).forEach(function (t) { if (t.id === s.topic) topicName = t.name; });

    var box = el('div', 'panel');
    box.appendChild(el('h2', null, topicName ? 'Chủ đề: ' + topicName : 'Hôm nay'));
    box.appendChild(el('p', 'big', 'Cần ôn ' + due + ' thẻ'));
    var b1 = button('Ôn ' + due + ' thẻ', 'btn primary', function () { startSession(dueList(), []); });
    if (!due) b1.disabled = true;
    box.appendChild(b1);

    var n = Math.min(left, pickNew(left).length);
    box.appendChild(el('p', 'muted', 'Từ mới hôm nay: còn ' + n + ' / ' + s.newPerDay));
    var b2 = button('Bắt đầu học ' + n + ' từ mới', 'btn', function () {
      var ids = pickNew(left);
      startSession(dueList(), ids);
    });
    if (!n) b2.disabled = true;
    box.appendChild(b2);
    root.appendChild(box);

    // Chọn cấp lấy từ mới
    var cfg = el('div', 'panel');
    cfg.appendChild(el('h3', null, 'Lấy từ mới từ cấp'));
    var chips = el('div', 'chips');
    [1, 2, 3, 4, 5, 6].forEach(function (lv) {
      var c = el('button', 'chip', 'HSK ' + lv);
      c.type = 'button';
      c.setAttribute('aria-pressed', s.levels.indexOf(lv) !== -1 ? 'true' : 'false');
      c.addEventListener('click', function () {
        var i = s.levels.indexOf(lv);
        if (i === -1) s.levels.push(lv);
        else if (s.levels.length > 1) s.levels.splice(i, 1);
        store.save();
        renderHome();
      });
      chips.appendChild(c);
    });
    cfg.appendChild(chips);

    cfg.appendChild(el('h3', null, 'Học theo chủ đề'));
    var sel = el('select', 'select');
    sel.setAttribute('aria-label', 'Chủ đề');
    window.HSKTopics.fill(sel, s.topic || '', s.levels);
    sel.addEventListener('change', function () { s.topic = sel.value; store.save(); renderHome(); });
    cfg.appendChild(sel);

    cfg.appendChild(el('h3', null, 'Chiều học'));
    var modes = el('div', 'chips');
    [['mix', 'Trộn hai chiều'], ['zh-vi', 'Hán → Việt'], ['vi-zh', 'Việt → Hán']].forEach(function (m) {
      var c = el('button', 'chip', m[1]);
      c.type = 'button';
      c.setAttribute('aria-pressed', s.mode === m[0] ? 'true' : 'false');
      c.addEventListener('click', function () { s.mode = m[0]; store.save(); renderHome(); });
      modes.appendChild(c);
    });
    cfg.appendChild(modes);
    root.appendChild(cfg);

    root.appendChild(el('p', 'muted', 'Đã gặp ' + store.seenCount() + ' từ · đã thuộc ' + store.knownCount() + ' từ.'));
  }

  /* ---------- Phiên học ---------- */
  function startSession(dueIds, newIds) {
    var queue = shuffle(dueIds.slice());
    var fresh = {};
    newIds.forEach(function (id) { fresh[id] = true; });
    queue = newIds.concat(queue); // từ mới học trước
    if (!queue.length) { renderHome(); return; }
    session = { queue: queue, done: 0, total: queue.length, flipped: false, fresh: fresh, dir: 'zh-vi' };
    nextCard();
  }

  function pickDir() {
    var m = store.settings().mode;
    return m === 'mix' ? (Math.random() < 0.5 ? 'zh-vi' : 'vi-zh') : m;
  }

  function nextCard() {
    if (!session.queue.length) { renderFinish(); return; }
    session.flipped = false;
    session.dir = pickDir();
    renderCard();
  }

  function renderCard() {
    var id = session.queue[0];
    var w = byId[id], c = content[id] || {};
    root.textContent = '';

    var bar = el('div', 'progress');
    var fill = el('div', 'progress-fill');
    fill.style.width = Math.round(session.done / session.total * 100) + '%';
    bar.appendChild(fill);
    root.appendChild(bar);
    root.appendChild(el('p', 'muted center', session.done + ' / ' + session.total + (session.fresh[id] ? ' · từ mới' : '')));

    var card = el('div', 'fcard');
    card.setAttribute('tabindex', '0');
    var front = session.dir === 'zh-vi';

    if (!session.flipped) {
      if (front) {
        card.appendChild(el('div', 'fc-hanzi', w.hanzi));
      } else {
        card.appendChild(el('div', 'fc-vi', c.vi || '(chưa có nghĩa)'));
        card.appendChild(el('div', 'muted', 'HSK ' + w.level + (w.pos ? ' · ' + window.HSKPos.name(w.pos) : '')));
      }
      card.appendChild(el('div', 'muted', 'Chạm hoặc nhấn Space để lật'));
      card.addEventListener('click', flip);
    } else {
      card.appendChild(el('div', 'fc-hanzi', w.hanzi));
      card.appendChild(el('div', 'pinyin', w.pinyin));
      var senses = String(c.vi || '').split(/\s*[;；]\s*/).filter(Boolean);
      if (senses.length > 1) {
        var ol = el('ol', 'senses fc-senses');
        senses.forEach(function (s) { ol.appendChild(el('li', null, s)); });
        card.appendChild(ol);
      } else {
        card.appendChild(el('div', 'fc-vi', c.vi || ''));
      }
      card.appendChild(el('div', 'meta', 'HSK ' + w.level + (w.pos ? ' · ' + window.HSKPos.name(w.pos) : '') + (c.hv ? ' · ' + c.hv : '')));
      var sp = button('🔊', 'speak', function (e) { e.stopPropagation(); speak(w.hanzi); });
      sp.setAttribute('aria-label', 'Phát âm');
      card.appendChild(sp);
      (c.ex || []).forEach(function (x) {
        var d = el('div', 'fc-ex');
        var zr = el('div', 'ex-row');
        zr.appendChild(el('div', 'ex-zh', x.zh));
        zr.appendChild(window.HSKSpeak.button(x.zh));
        d.appendChild(zr);
        d.appendChild(el('div', 'ex-py', x.py));
        d.appendChild(el('div', 'ex-vi', x.vi));
        card.appendChild(d);
      });
      card.appendChild(el('span', 'badge', 'AI tạo'));
    }
    root.appendChild(card);

    var actions = el('div', 'actions');
    if (!session.flipped) {
      actions.appendChild(button('Lật thẻ', 'btn primary', flip));
    } else {
      actions.appendChild(button('Chưa nhớ (1)', 'btn bad', function () { grade(false); }));
      actions.appendChild(button('Nhớ rồi (2)', 'btn good', function () { grade(true); }));
      actions.appendChild(button('Đã thuộc, bỏ qua (3)', 'btn', function () { grade('known'); }));
    }
    root.appendChild(actions);
    root.appendChild(button('Dừng phiên', 'link-btn', renderHome));
  }

  function flip() {
    if (!session || session.flipped) return;
    session.flipped = true;
    renderCard();
  }

  function grade(res) {
    var id = session.queue.shift();
    if (session.fresh[id]) { store.countNew(); delete session.fresh[id]; }
    if (res === 'known') {
      store.markKnown(id, true);
      session.done++;
    } else if (res) {
      store.answer(id, true);
      session.done++;
    } else {
      store.answer(id, false);
      // quên: đưa lại cuối hàng đợi để gặp lại trong phiên
      var pos = Math.min(session.queue.length, 3 + Math.floor(Math.random() * 3));
      session.queue.splice(pos, 0, id);
    }
    nextCard();
  }

  function renderFinish() {
    var total = session.total;
    session = null;
    root.textContent = '';
    var box = el('div', 'panel center');
    box.appendChild(el('h2', null, 'Xong phiên học 🎉'));
    box.appendChild(el('p', null, 'Đã học/ôn ' + total + ' thẻ.'));
    box.appendChild(button('Về màn hình flashcard', 'btn primary', renderHome));
    root.appendChild(box);
  }

  // Phím tắt khi đang học
  document.addEventListener('keydown', function (e) {
    if (!session || root.hidden) return;
    if (e.key === ' ' || e.key === 'Enter') { if (!session.flipped) { e.preventDefault(); flip(); } }
    else if (session.flipped && e.key === '1') grade(false);
    else if (session.flipped && e.key === '2') grade(true);
    else if (session.flipped && e.key === '3') grade('known');
  });

  window.HSKFlash = { show: renderHome };
})();
