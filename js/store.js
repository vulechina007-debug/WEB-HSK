(function () {
  'use strict';

  // Tiến độ học lưu trong localStorage (chỉ trên trình duyệt này).
  // Cấu trúc: { v:1, cards:{ id:{box,due,seen,known} }, daily:{date,newCount}, settings:{levels,mode,newPerDay} }
  var KEY = 'hsk.progress.v1';
  var INTERVALS = [0, 1, 2, 4, 8, 16]; // số ngày ôn lại theo hộp 1..5 (hộp 0 không dùng)
  var KNOWN_BOX = 4;

  var data = load();

  function blank() {
    return { v: 1, cards: {}, daily: { date: '', newCount: 0 }, settings: { levels: [5], mode: 'mix', newPerDay: 20 } };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var d = JSON.parse(raw);
        if (d && d.v === 1) return Object.assign(blank(), d);
      }
    } catch (e) {}
    return blank();
  }

  var listeners = [];

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  // Đăng ký hàm được gọi mỗi khi tiến độ thay đổi (dùng để đồng bộ lên tài khoản).
  function onChange(fn) { listeners.push(fn); }

  // Gộp tiến độ lấy từ tài khoản vào dữ liệu hiện tại: thẻ nào cập nhật gần nhất (t) thì thắng.
  function mergeRemote(remote) {
    if (!remote || typeof remote !== 'object') return;
    var rc = remote.cards || {};
    Object.keys(rc).forEach(function (id) {
      var r = rc[id], l = data.cards[id];
      if (!r || typeof r.box !== 'number' || typeof r.due !== 'string') return;
      if (!l || (r.t || 0) > (l.t || 0)) data.cards[id] = r;
    });
    if (remote.settings) {
      var s = remote.settings;
      if (Array.isArray(s.levels) && s.levels.length) data.settings.levels = s.levels;
      if (['mix', 'zh-vi', 'vi-zh'].indexOf(s.mode) !== -1) data.settings.mode = s.mode;
      if (typeof s.topic === 'string') data.settings.topic = s.topic;
    }
    if (remote.daily && remote.daily.date === today() && data.daily.date === today()) {
      data.daily.newCount = Math.max(data.daily.newCount, remote.daily.newCount | 0);
    } else if (remote.daily && remote.daily.date === today() && data.daily.date !== today()) {
      data.daily = { date: remote.daily.date, newCount: remote.daily.newCount | 0 };
    }
    save();
  }

  function snapshot() {
    return { v: 1, cards: data.cards, daily: data.daily, settings: data.settings };
  }

  function dateStr(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function today() { return dateStr(new Date()); }
  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return dateStr(d); }

  function card(id) { return data.cards[id]; }
  function isKnown(id) { var c = data.cards[id]; return !!c && (c.known === true || c.box >= KNOWN_BOX); }

  // Trả lời một thẻ: nhớ → lên hộp, quên → về hộp 1 và ôn lại ngay trong phiên.
  function answer(id, ok) {
    var c = data.cards[id] || { box: 1, due: today(), seen: today(), known: false };
    if (!c.seen) c.seen = today();
    if (ok) {
      c.box = Math.min(5, (c.box || 1) + 1);
      c.due = addDays(INTERVALS[c.box]);
    } else {
      c.box = 1;
      c.due = today();
      c.known = false;
    }
    c.t = Date.now();
    data.cards[id] = c;
    save();
  }

  function markKnown(id, known) {
    var c = data.cards[id] || { box: 1, due: today(), seen: today(), known: false };
    c.known = known;
    if (known) { c.box = 5; c.due = addDays(INTERVALS[5]); }
    else { c.box = 1; c.due = today(); }
    c.t = Date.now();
    data.cards[id] = c;
    save();
  }

  function dueIds() {
    var t = today();
    return Object.keys(data.cards).filter(function (id) {
      return data.cards[id].due <= t;
    });
  }

  function newToday() {
    if (data.daily.date !== today()) { data.daily = { date: today(), newCount: 0 }; save(); }
    return data.daily.newCount;
  }
  function countNew() { newToday(); data.daily.newCount++; save(); }

  window.HSKStore = {
    onChange: onChange,
    mergeRemote: mergeRemote,
    snapshot: snapshot,
    data: function () { return data; },
    save: save,
    today: today,
    card: card,
    isKnown: isKnown,
    answer: answer,
    markKnown: markKnown,
    dueIds: dueIds,
    newToday: newToday,
    countNew: countNew,
    settings: function () { return data.settings; },
    knownCount: function () { return Object.keys(data.cards).filter(isKnown).length; },
    seenCount: function () { return Object.keys(data.cards).length; }
  };
})();
