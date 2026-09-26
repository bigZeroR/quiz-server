/* Dashboard Page Controller */
(function () {
  'use strict';

  const escapeHtml = window.Sanitize.escapeHtml;

  function aggregate() {
    let totalQuizzes = 0, answered = 0, bookmarks = 0;
    const quizStats = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('lpic_')) continue;

      if (key.endsWith('_answers')) {
        const quizName = key.replace('lpic_', '').replace('_answers', '');
        const answers = JSON.parse(localStorage.getItem(key)) || {};
        const count = Object.keys(answers).length;
        if (count > 0) {
          totalQuizzes++;
          answered += count;
          quizStats.push({ name: quizName, total: count });
        }
      }
      if (key.endsWith('_bookmarks')) {
        const list = JSON.parse(localStorage.getItem(key)) || [];
        bookmarks += list.length;
      }
    }

    return { totalQuizzes, answered, bookmarks, quizStats };
  }

  function render() {
    const data = aggregate();
    document.getElementById('totalQuizzesTaken').textContent = data.totalQuizzes;
    document.getElementById('totalQuestionsAnswered').textContent = data.answered;
    document.getElementById('overallAccuracy').textContent = '—';
    document.getElementById('totalBookmarks').textContent = data.bookmarks;

    const activity = document.getElementById('recentActivity');
    if (!data.quizStats.length) {
      activity.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);">هنوز آزمونی شرکت نکرده‌اید.</div>';
    } else {
      activity.innerHTML = data.quizStats.map(q => `
        <div class="activity-item">
          <div class="activity-info">
            <h4>${escapeHtml(q.name.replace(/_/g, ' '))}</h4>
            <span>${q.total} سوال پاسخ‌داده‌شده</span>
          </div>
        </div>`).join('');
    }

    const weak = document.getElementById('weakAreas');
    weak.innerHTML = '<div style="padding:20px;color:var(--text-tertiary);text-align:center;">تحلیل دقیق پس از حل سوالات نمایش داده می‌شود.</div>';
  }

  document.getElementById('btnExport').addEventListener('click', (e) => {
    e.preventDefault();
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('lpic_')) out[k] = JSON.parse(localStorage.getItem(k));
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'quiz_backup.json'; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btnResetAll').addEventListener('click', () => {
    if (!confirm('تمام پیشرفت پاک شود؟')) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('lpic_')) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
    location.reload();
  });

  render();
})();
