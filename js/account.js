(function () {
  'use strict';

  // Tài khoản (Firebase Auth) + lưu tiến độ và các sổ tay lên Firestore.
  // Chưa điền js/firebase-config.js thì web vẫn chạy bình thường, chỉ không có đăng nhập.
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var SCRIPTS = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];

  var store = window.HSKStore;
  var cfg = window.FIREBASE_CONFIG || {};
  var configured = !!cfg.apiKey && cfg.apiKey.indexOf('YOUR_') !== 0;

  var user = null;
  var ready = false;        // đã tải xong dữ liệu từ đám mây của người dùng này
  // Các sổ tay: { bookId: { name, text, a: tạo lúc, u: sửa lúc, words: { wordId: { a: thêm lúc, n: ghi chú } } } }
  var books = {};
  var listeners = [];
  var auth = null, db = null, syncTimer = null, status = '';

  function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function onChange(fn) { listeners.push(fn); }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Không tải được ' + src)); };
      document.head.appendChild(s);
    });
  }

  function init() {
    if (!configured) { notify(); return; }
    SCRIPTS.reduce(function (p, f) { return p.then(function () { return loadScript(SDK + f); }); }, Promise.resolve())
      .then(function () {
        firebase.initializeApp(cfg);
        auth = firebase.auth();
        db = firebase.firestore();
        auth.onAuthStateChanged(onUser);
      })
      .catch(function () { status = 'Không kết nối được dịch vụ tài khoản (kiểm tra mạng).'; notify(); });
  }

  function docRef() { return db.collection('users').doc(user.uid); }

  function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // Dữ liệu cũ (trước khi có nhiều sổ tay): danh sách từ phẳng + ghi chú rời → đổi thành sổ tay.
  function migrate(d) {
    var out = d.books || {};
    var now = Date.now();
    var oldWords = d.notebook || {};
    if (Object.keys(oldWords).length) {
      var id = newId('b');
      out[id] = { name: 'Từ đã lưu', text: '', a: now, u: now, words: oldWords };
    }
    var oldNotes = d.notes || {};
    Object.keys(oldNotes).forEach(function (k) {
      var n = oldNotes[k] || {};
      out[newId('b')] = { name: n.t || 'Ghi chú', text: n.c || '', a: n.a || now, u: n.u || now, words: {} };
    });
    return out;
  }

  function onUser(u) {
    user = u;
    ready = false;
    books = {};
    notify();
    if (!u) return;
    docRef().get().then(function (snap) {
      var d = snap.exists ? snap.data() : {};
      books = migrate(d);
      store.mergeRemote(d.progress);
      ready = true;
      push();
      notify();
    }).catch(function () {
      status = 'Không đọc được dữ liệu tài khoản. Kiểm tra Security Rules của Firestore.';
      notify();
    });
  }

  function clean(o) { return JSON.parse(JSON.stringify(o)); }

  function push() {
    if (!user || !ready) return;
    // set() ghi đè cả tài liệu: các trường cũ (notebook, notes) được bỏ đi sau khi đã chuyển sang books.
    docRef().set({ progress: clean(store.snapshot()), books: clean(books), updated: Date.now() })
      .then(function () { if (status) { status = ''; notify(); } })
      .catch(function () { status = 'Lưu lên tài khoản thất bại, sẽ thử lại lần sau.'; notify(); });
  }

  function schedulePush() {
    if (!user || !ready) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(push, 1500);
  }

  store.onChange(schedulePush);

  /* ---------- Sổ tay (nhiều sổ, mỗi sổ chứa các từ) ---------- */
  function ok() { return !!user && ready; }
  function touch(b) { b.u = Date.now(); }

  // Danh sách sổ tay, sửa gần nhất lên đầu.
  function bookList() {
    return Object.keys(books).map(function (id) {
      var b = books[id];
      return { id: id, name: b.name || '', text: b.text || '', count: Object.keys(b.words || {}).length, a: b.a || 0, u: b.u || 0 };
    }).sort(function (x, y) { return y.u - x.u; });
  }
  function getBook(id) { return books[id] ? bookList().filter(function (b) { return b.id === id; })[0] : null; }

  function addBook(name) {
    if (!ok()) return null;
    var id = newId('b'), now = Date.now();
    books[id] = { name: String(name || '').trim().slice(0, 80) || 'Sổ tay mới', text: '', a: now, u: now, words: {} };
    schedulePush(); notify();
    return id;
  }
  function renameBook(id, name) {
    if (!ok() || !books[id]) return;
    books[id].name = String(name || '').trim().slice(0, 80) || 'Sổ tay';
    touch(books[id]); schedulePush(); notify();
  }
  // Nội dung ghi chú chung của sổ tay: không notify() để khỏi vẽ lại khi đang gõ.
  function setBookText(id, text) {
    if (!ok() || !books[id]) return;
    books[id].text = String(text || '').slice(0, 20000);
    touch(books[id]); schedulePush();
  }
  function removeBook(id) {
    if (!ok() || !books[id]) return;
    delete books[id];
    schedulePush(); notify();
  }

  function addWordTo(bookId, wordId) {
    if (!ok() || !books[bookId]) return;
    if (!books[bookId].words) books[bookId].words = {};
    if (books[bookId].words[wordId]) return;
    books[bookId].words[wordId] = { a: Date.now(), n: '' };
    touch(books[bookId]); schedulePush(); notify();
  }
  function removeWordFrom(bookId, wordId) {
    if (!ok() || !books[bookId] || !books[bookId].words) return;
    delete books[bookId].words[wordId];
    touch(books[bookId]); schedulePush(); notify();
  }
  // Các sổ tay đang chứa một từ.
  function booksOf(wordId) {
    return Object.keys(books).filter(function (id) { return books[id].words && books[id].words[wordId]; });
  }
  function bookWordIds(bookId) {
    var w = (books[bookId] && books[bookId].words) || {};
    return Object.keys(w).sort(function (a, b) { return (w[b].a || 0) - (w[a].a || 0); });
  }
  function wordNote(bookId, wordId) {
    var w = books[bookId] && books[bookId].words && books[bookId].words[wordId];
    return w ? w.n || '' : '';
  }
  function setWordNote(bookId, wordId, text) {
    var w = books[bookId] && books[bookId].words && books[bookId].words[wordId];
    if (!ok() || !w) return;
    w.n = String(text || '').slice(0, 300);
    schedulePush();
  }

  /* ---------- Đăng nhập / đăng ký ---------- */
  var ERRORS = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/missing-password': 'Hãy nhập mật khẩu.',
    'auth/weak-password': 'Mật khẩu quá yếu (tối thiểu 6 ký tự).',
    'auth/email-already-in-use': 'Email này đã được đăng ký.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/wrong-password': 'Email hoặc mật khẩu không đúng.',
    'auth/user-not-found': 'Email hoặc mật khẩu không đúng.',
    'auth/too-many-requests': 'Thử quá nhiều lần, hãy đợi một lúc rồi thử lại.',
    'auth/network-request-failed': 'Lỗi mạng, hãy thử lại.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/unauthorized-domain': 'Tên miền này chưa được cho phép trong Firebase (xem hướng dẫn).',
    'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trong Firebase.'
  };
  function errMsg(e) { return ERRORS[e && e.code] || 'Có lỗi xảy ra, hãy thử lại.'; }

  function register(email, pw) { return auth.createUserWithEmailAndPassword(email, pw); }
  function login(email, pw) { return auth.signInWithEmailAndPassword(email, pw); }
  function google() { return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
  function logout() { push(); return auth.signOut(); }
  function reset(email) { return auth.sendPasswordResetEmail(email); }

  window.HSKAccount = {
    init: init,
    onChange: onChange,
    configured: function () { return configured; },
    user: function () { return user; },
    loggedIn: function () { return !!user; },
    ready: function () { return ready; },
    status: function () { return status; },
    books: bookList, book: getBook, addBook: addBook, renameBook: renameBook, setBookText: setBookText, removeBook: removeBook,
    addWordTo: addWordTo, removeWordFrom: removeWordFrom, booksOf: booksOf, bookWordIds: bookWordIds,
    wordNote: wordNote, setWordNote: setWordNote,
    register: register, login: login, google: google, logout: logout, reset: reset, errMsg: errMsg
  };
})();
