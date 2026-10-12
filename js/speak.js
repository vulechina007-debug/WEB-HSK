(function () {
  'use strict';

  // Đọc tiếng Trung bằng giọng của trình duyệt (Web Speech API).
  function say(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  // Nút loa nhỏ: bấm để đọc cả câu.
  function button(text, label) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'ex-speak';
    b.textContent = '🔊';
    b.setAttribute('aria-label', label || 'Đọc câu này');
    b.title = 'Nghe cả câu';
    b.addEventListener('click', function (e) { e.stopPropagation(); say(text); });
    return b;
  }

  window.HSKSpeak = { say: say, button: button };
})();
