(function () {
  'use strict';

  // Học theo ngữ cảnh: điền từ vào chỗ trống trong câu ví dụ (trắc nghiệm 4 đáp án).
  var words = window.HSK_WORDS || [];
  var content = window.HSK_CONTENT || {};
  var BLANK = '＿＿＿';
  var QUIZ_SIZE = 10;

  var root = document.getElementById('view-context');
  var cfg = { levels: [5], topic: '' };
  var quiz = null; // { qs:[...], i, score, answered }

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

  // Ví dụ dùng được cho bài điền: dạng chữ mục tiêu (f) phải nằm trong câu.
  function usableExamples(id) {
    var c = content[id];
    if (!c || !c.ex) return [];
    return c.ex.filter(function (x) { return x.f && x.zh.indexOf(x.f) !== -1; });
  }

  function pool() {
    return words.filter(function (w) {
      if (cfg.levels.indexOf(w.level) === -1) return false;
      var c = content[w.id];
      if (!c) return false;
      if (cfg.topic && (c.t || []).indexOf(cfg.topic) === -1) return false;
      return usableExamples(w.id).length > 0;
    });
  }

  // Đáp án nhiễu: cùng cấp, ưu tiên cùng loại từ và cùng độ dài; không xuất hiện sẵn trong câu.
  function distractors(w, sentence, surface) {
    var same = words.filter(function (o) {
      return o.id !== w.id && o.level === w.level && content[o.id] && sentence.indexOf(o.hanzi) === -1 && o.hanzi !== surface;
    });
    var best = same.filter(function (o) { return o.pos === w.pos && o.hanzi.length === w.hanzi.length; });
    var mid = same.filter(function (o) { return o.hanzi.length === w.hanzi.length; });
    var picked = [];
    [shuffle(best), shuffle(mid), shuffle(same.slice(0, 400))].forEach(function (list) {
      list.forEach(function (o) {
        if (picked.length < 3 && picked.indexOf(o) === -1) picked.push(o);
      });
    });
    return picked;
  }

  function buildQuestion(w) {
    var exs = usableExamples(w.id);
    var x = exs[Math.floor(Math.random() * exs.length)];
    var ds = distractors(w, x.zh, x.f);
    if (ds.length < 3) return null;
    // Đáp án đúng hiển thị dạng gốc của từ; dạng trong câu có thể biến thể (ví dụ 洗澡 / 打八折).
    var opts = shuffle([{ text: w.hanzi, ok: true }].concat(ds.map(function (o) { return { text: o.hanzi, ok: false }; })));
    return { w: w, x: x, opts: opts, sentence: x.zh.split(x.f).join(BLANK) };
  }

  /* ---------- Màn hình chọn ---------- */
  function renderHome() {
    quiz = null;
    root.textContent = '';
    var p = pool();

    var box = el('div', 'panel');
    box.appendChild(el('h2', null, 'Học theo ngữ cảnh'));
    box.appendChild(el('p', 'muted', 'Điền từ còn thiếu vào câu. Mỗi lượt ' + QUIZ_SIZE + ' câu.'));

    box.appendChild(el('h3', null, 'Cấp HSK'));
    var chips = el('div', 'chips');
    [1, 2, 3, 4, 5, 6].forEach(function (lv) {
      var c = el('button', 'chip', 'HSK ' + lv);
      c.type = 'button';
      c.setAttribute('aria-pressed', cfg.levels.indexOf(lv) !== -1 ? 'true' : 'false');
      c.addEventListener('click', function () {
        var i = cfg.levels.indexOf(lv);
        if (i === -1) cfg.levels.push(lv);
        else if (cfg.levels.length > 1) cfg.levels.splice(i, 1);
        renderHome();
      });
      chips.appendChild(c);
    });
    box.appendChild(chips);

    box.appendChild(el('h3', null, 'Chủ đề'));
    var sel = el('select', 'select');
    sel.setAttribute('aria-label', 'Chủ đề');
    window.HSKTopics.fill(sel, cfg.topic, cfg.levels);
    sel.addEventListener('change', function () { cfg.topic = sel.value; renderHome(); });
    box.appendChild(sel);

    box.appendChild(el('p', 'muted', 'Có ' + p.length + ' từ dùng được.'));
    var go = button('Bắt đầu', 'btn primary', startQuiz);
    if (p.length < 4) go.disabled = true;
    box.appendChild(go);
    root.appendChild(box);
  }

  /* ---------- Bài trắc nghiệm ---------- */
  function startQuiz() {
    var picked = shuffle(pool()).slice(0, QUIZ_SIZE * 2);
    var qs = [];
    picked.forEach(function (w) {
      if (qs.length >= QUIZ_SIZE) return;
      var q = buildQuestion(w);
      if (q) qs.push(q);
    });
    if (!qs.length) { renderHome(); return; }
    quiz = { qs: qs, i: 0, score: 0, answered: false };
    renderQuestion();
  }

  function renderQuestion() {
    var q = quiz.qs[quiz.i];
    root.textContent = '';

    var bar = el('div', 'progress');
    var fill = el('div', 'progress-fill');
    fill.style.width = Math.round(quiz.i / quiz.qs.length * 100) + '%';
    bar.appendChild(fill);
    root.appendChild(bar);
    root.appendChild(el('p', 'muted center', 'Câu ' + (quiz.i + 1) + ' / ' + quiz.qs.length + ' · HSK ' + q.w.level));

    var card = el('div', 'fcard ctx-card');
    card.appendChild(el('div', 'ctx-sentence', q.sentence));
    card.appendChild(el('div', 'ex-vi', q.x.vi));
    root.appendChild(card);

    var opts = el('div', 'actions options');
    q.opts.forEach(function (o) {
      var b = button(o.text, 'btn opt', function () { answer(b, o, opts, card, q); });
      opts.appendChild(b);
    });
    root.appendChild(opts);
    root.appendChild(button('Dừng', 'link-btn', renderHome));
  }

  function answer(btn, o, opts, card, q) {
    if (quiz.answered) return;
    quiz.answered = true;
    if (o.ok) quiz.score++;
    Array.prototype.forEach.call(opts.children, function (b, i) {
      if (q.opts[i].ok) b.classList.add('good');
      else if (b === btn) b.classList.add('bad');
      b.disabled = true;
    });
    // Hiện câu đầy đủ, pinyin, nghĩa của từ
    card.textContent = '';
    var c = content[q.w.id] || {};
    var sent = el('div', 'ctx-sentence');
    var parts = q.x.zh.split(q.x.f);
    parts.forEach(function (part, i) {
      sent.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) sent.appendChild(el('mark', null, q.x.f));
    });
    card.appendChild(sent);
    card.appendChild(el('div', 'ex-py', q.x.py));
    card.appendChild(el('div', 'ex-vi', q.x.vi));
    card.appendChild(el('div', 'meta', q.w.hanzi + ' · ' + q.w.pinyin + ' · ' + (c.vi || '') + (c.hv ? ' · ' + c.hv : '')));

    var last = quiz.i === quiz.qs.length - 1;
    root.insertBefore(button(last ? 'Xem kết quả' : 'Câu tiếp', 'btn primary', function () {
      quiz.i++;
      quiz.answered = false;
      if (quiz.i >= quiz.qs.length) renderResult(); else renderQuestion();
    }), root.querySelector('.link-btn'));
  }

  function renderResult() {
    var s = quiz.score, n = quiz.qs.length;
    root.textContent = '';
    var box = el('div', 'panel center');
    box.appendChild(el('h2', null, 'Kết quả: ' + s + ' / ' + n));
    box.appendChild(button('Làm lượt mới', 'btn primary', startQuiz));
    box.appendChild(button('Về màn hình chọn', 'btn', renderHome));
    root.appendChild(box);
  }

  window.HSKContext = { show: renderHome, usableExamples: usableExamples };
})();
