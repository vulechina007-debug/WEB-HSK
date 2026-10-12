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

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
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
    data.cards[id] = c;
    save();
  }

  function markKnown(id, known) {
    var c = data.cards[id] || { box: 1, due: today(), seen: today(), known: false };
    c.known = known;
    if (known) { c.box = 5; c.due = addDays(INTERVALS[5]); }
    else { c.box = 1; c.due = today(); }
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

  /* ---------- Xuất / nhập ---------- */
  var BACKUP_DAYS = 14;

  function exportJSON() {
    data.lastBackup = today();
    save();
    return JSON.stringify({ app: 'hsk-learn', v: data.v, exportedAt: new Date().toISOString(), data: data }, null, 1);
  }

  // Kiểm tra file nhập; trả về { ok, error, data, stats }.
  function parseImport(text) {
    var o;
    try { o = JSON.parse(text); } catch (e) { return { ok: false, error: 'File không phải JSON hợp lệ.' }; }
    if (!o || o.app !== 'hsk-learn') return { ok: false, error: 'Đây không phải file sao lưu của web này.' };
    if (o.v !== 1) return { ok: false, error: 'Phiên bản file (' + o.v + ') chưa được hỗ trợ.' };
    var d = o.data;
    if (!d || typeof d.cards !== 'object') return { ok: false, error: 'File thiếu dữ liệu thẻ.' };
    var clean = blank(), n = 0, bad = 0;
    Object.keys(d.cards).forEach(function (id) {
      var c = d.cards[id];
      if (c && typeof c.box === 'number' && c.box >= 1 && c.box <= 5 && typeof c.due === 'string') {
        clean.cards[id] = { box: c.box, due: c.due, seen: c.seen || c.due, known: c.known === true };
        n++;
      } else { bad++; }
    });
    if (d.settings && typeof d.settings === 'object') {
      var s = d.settings;
      if (Array.isArray(s.levels) && s.levels.length) clean.settings.levels = s.levels.filter(function (x) { return x >= 1 && x <= 6; });
      if (['mix', 'zh-vi', 'vi-zh'].indexOf(s.mode) !== -1) clean.settings.mode = s.mode;
      if (typeof s.topic === 'string') clean.settings.topic = s.topic;
    }
    if (d.daily && d.daily.date) clean.daily = { date: d.daily.date, newCount: d.daily.newCount | 0 };
    clean.lastBackup = today();
    return { ok: true, data: clean, stats: { cards: n, skipped: bad, exportedAt: o.exportedAt || '' } };
  }

  function applyImport(clean) {
    data = clean;
    save();
  }

  function backupDue() {
    if (!Object.keys(data.cards).length) return false;
    if (!data.lastBackup) return true;
    var days = (new Date(today()) - new Date(data.lastBackup)) / 86400000;
    return days >= BACKUP_DAYS;
  }

  window.HSKStore = {
    exportJSON: exportJSON,
    parseImport: parseImport,
    applyImport: applyImport,
    backupDue: backupDue,
    lastBackup: function () { return data.lastBackup || ''; },
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
