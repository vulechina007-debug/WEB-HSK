(function () {
  'use strict';

  // Tài khoản (Firebase Auth) + lưu tiến độ và sổ tay lên Firestore.
  // Chưa điền js/firebase-config.js thì web vẫn chạy bình thường, chỉ không có đăng nhập.
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var SCRIPTS = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];

  var store = window.HSKStore;
  var cfg = window.FIREBASE_CONFIG || {};
  var configured = !!cfg.apiKey && cfg.apiKey.indexOf('YOUR_') !== 0;

  var user = null;
  var ready = false;        // đã tải xong dữ liệu từ đám mây của người dùng này
  var notebook = {};        // { wordId: { a: thời điểm thêm, n: ghi chú } }
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

  function onUser(u) {
    user = u;
    ready = false;
    notebook = {};
    notify();
    if (!u) return;
    docRef().get().then(function (snap) {
      var d = snap.exists ? snap.data() : {};
      notebook = d.notebook || {};
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
    docRef().set({ progress: clean(store.snapshot()), notebook: clean(notebook), updated: Date.now() })
      .then(function () { if (status) { status = ''; notify(); } })
      .catch(function () { status = 'Lưu lên tài khoản thất bại, sẽ thử lại lần sau.'; notify(); });
  }

  function schedulePush() {
    if (!user || !ready) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(push, 1500);
  }

  store.onChange(schedulePush);

  /* ---------- Sổ tay ---------- */
  function hasWord(id) { return !!notebook[id]; }
  function addWord(id) {
    if (!user || !ready || notebook[id]) return;
    notebook[id] = { a: Date.now(), n: '' };
    schedulePush(); notify();
  }
  function removeWord(id) {
    if (!user || !ready) return;
    delete notebook[id];
    schedulePush(); notify();
  }
  function setNote(id, text) {
    if (!user || !ready || !notebook[id]) return;
    notebook[id].n = String(text || '').slice(0, 300);
    schedulePush();
  }
  function noteOf(id) { return notebook[id] ? notebook[id].n || '' : ''; }
  // Danh sách id, từ mới thêm lên đầu.
  function ids() {
    return Object.keys(notebook).sort(function (a, b) { return (notebook[b].a || 0) - (notebook[a].a || 0); });
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
    has: hasWord, add: addWord, remove: removeWord, setNote: setNote, noteOf: noteOf, ids: ids,
    count: function () { return Object.keys(notebook).length; },
    register: register, login: login, google: google, logout: logout, reset: reset, errMsg: errMsg
  };
})();
