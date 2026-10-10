/* Injects a floating "📖 درسنامه" button on the quiz page
   if the current quiz has an attached lesson. */
(function () {
  'use strict';
  if (!window.QUIZ_NAME) return;

  async function check() {
    try {
      const res = await fetch(`/api/v1/lessons/by-quiz/${encodeURIComponent(window.QUIZ_NAME)}`);
      if (!res.ok) return;
      const body = await res.json();
      if (!body.lesson) return;
      injectButton(body.lesson);
    } catch (_) {}
  }

  function injectButton(lesson) {
    const btn = document.createElement('a');
    btn.href = `/lessons/${encodeURIComponent(lesson.file)}`;
    btn.textContent = `📖 ${lesson.title || 'درسنامه'}`;
    btn.style.cssText = `
      position: fixed; bottom: 20px; left: 20px;
      background: var(--accent, #3b82f6); color: #fff;
      padding: 10px 18px; border-radius: 999px;
      text-decoration: none; font-weight: 700;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      z-index: 9999; font-size: 0.9rem;
      transition: transform .15s;
    `;
    btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; };
    btn.onmouseleave = () => { btn.style.transform = ''; };
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();
