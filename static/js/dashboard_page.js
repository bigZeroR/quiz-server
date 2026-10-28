/* Dashboard Page Controller — v3
 * Reads localStorage stats, renders stat cards, activity list with
 * progress bars, and a weak-areas panel. Domain-safe: no API calls,
 * storage keys and semantics unchanged.
 */
(function () {
  'use strict';

  const escapeHtml = (window.Sanitize && window.Sanitize.escapeHtml) ||
    function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    };

  const faNum = window.faDigits || function (s) { return String(s); };

  function safeParse(raw, fallback) {
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }

  function quizTotals() {
    // Map quiz -> total questions available, from cached quiz payloads if any.
    const totals = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('lpic_') && key.endsWith('_meta')) {
        const meta = safeParse(localStorage.getItem(key), null);
        if (meta && typeof meta.total === 'number') {
          totals[key.replace('lpic_', '').replace('_meta', '')] = meta.total;
        }
      }
    }
    return totals;
  }

  function aggregate() {
    let totalQuizzes = 0, answered = 0, bookmarks = 0, correct = 0, wrong = 0;
    const quizStats = [];
    const categoryWrong = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('lpic_')) continue;

      if (key.endsWith('_answers')) {
        const quizName = key.replace('lpic_', '').replace('_answers', '');
        const answers = safeParse(localStorage.getItem(key), {}) || {};
        const entries = Object.entries(answers);
        const count = entries.length;

        if (count > 0) {
          totalQuizzes++;
          answered += count;

          entries.forEach(([qid, ans]) => {
            if (!ans || typeof ans !== 'object') return;
            const isCorrect = ans.correct === true || ans.isCorrect === true ||
                              ans.selected === ans.answer;
            if (isCorrect) correct++;
            else {
              wrong++;
              const cat = ans.category || 'عمومی';
              categoryWrong[cat] = (categoryWrong[cat] || 0) + 1;
            }
          });

          quizStats.push({ name: quizName, total: count });
        }
      }

      if (key.endsWith('_bookmarks')) {
        const list = safeParse(localStorage.getItem(key), []) || [];
        if (Array.isArray(list)) bookmarks += list.length;
      }
    }

    return { totalQuizzes, answered, bookmarks, correct, wrong, quizStats, categoryWrong };
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderActivity(data) {
    const activity = document.getElementById('recentActivity');
    if (!activity) return;

    if (!data.quizStats.length) {
      activity.innerHTML =
        '<div class="empty-mini"><span class="empty-mini-ico" aria-hidden="true">🧭</span>' +
        'هنوز آزمونی شرکت نکرده‌اید.</div>';
      return;
    }

    const maxTotal = Math.max.apply(null, data.quizStats.map(q => q.total).concat([1]));

    activity.innerHTML = data.quizStats
      .sort((a, b) => b.total - a.total)
      .map(function (q) {
        const pct = Math.max(4, Math.round((q.total / maxTotal) * 100));
        return (
          '<div class="activity-item">' +
            '<div class="activity-info">' +
              '<h4>' + escapeHtml(q.name.replace(/_/g, ' ')) + '</h4>' +
              '<span>' + faNum(q.total) + ' پاسخ ثبت‌شده</span>' +
            '</div>' +
            '<div class="activity-progress" aria-hidden="true">' +
              '<span style="width:' + pct + '%"></span>' +
            '</div>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderWeakAreas(data) {
    const weak = document.getElementById('weakAreas');
    if (!weak) return;

    const items = Object.entries(data.categoryWrong)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    if (!items.length) {
      weak.innerHTML =
        '<div class="empty-mini"><span class="empty-mini-ico" aria-hidden="true">✨</span>' +
        'تحلیل دقیق پس از حل سوالات نمایش داده می‌شود.</div>';
      return;
    }

    const max = Math.max.apply(null, items.map(i => i[1]));

    weak.innerHTML = items.map(function (entry) {
      const name = entry[0];
      const count = entry[1];
      const pct = Math.max(6, Math.round((count / max) * 100));
      return (
        '<div class="weak-area">' +
          '<div class="weak-area-head">' +
            '<span class="weak-area-name">' + escapeHtml(name) + '</span>' +
            '<span class="weak-area-count">' + faNum(count) + ' خطا</span>' +
          '</div>' +
          '<div class="weak-area-bar" aria-hidden="true">' +
            '<span style="width:' + pct + '%"></span>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function render() {
    const data = aggregate();

    setText('totalQuizzesTaken', faNum(data.totalQuizzes));
    setText('totalQuestionsAnswered', faNum(data.answered));
    setText('totalBookmarks', faNum(data.bookmarks));

    const totalJudged = data.correct + data.wrong;
    if (totalJudged > 0) {
      const pct = Math.round((data.correct / totalJudged) * 100);
      setText('overallAccuracy', faNum(pct) + '٪');
    } else {
      setText('overallAccuracy', '—');
    }

    renderActivity(data);
    renderWeakAreas(data);
  }

  const exportBtn = document.getElementById('btnExport');
  if (exportBtn) {
    exportBtn.addEventListener('click', function (e) {
      e.preventDefault();
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('lpic_')) {
          out[k] = safeParse(localStorage.getItem(k), null);
        }
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quiz_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  const resetBtn = document.getElementById('btnResetAll');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      if (!confirm('تمام پیشرفت پاک شود؟')) return;
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('lpic_')) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
      location.reload();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
