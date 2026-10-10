(function () {
  'use strict';
  const esc = window.Sanitize?.escapeHtml || (s => String(s));
  const grid = document.getElementById('lessonsGrid');
  const searchInput = document.getElementById('searchInput');
  let all = [];

  async function load() {
    try {
      const r = await window.API.listLessons();
      all = r.lessons || [];
      render(all);
    } catch (e) {
      grid.innerHTML = `<div class="empty-lessons" style="grid-column:1/-1;">خطا: ${esc(e.message)}</div>`;
    }
  }

  function render(items) {
    if (!items.length) {
      grid.innerHTML = `<div class="empty-lessons" style="grid-column:1/-1;">
        <div class="icon">📚</div>
        <h3>هنوز درسنامه‌ای ساخته نشده</h3>
        <p>از دکمهٔ «درسنامه جدید» شروع کنید.</p>
      </div>`;
      return;
    }
    grid.innerHTML = '';
    items.forEach(l => {
      const card = document.createElement('a');
      card.href = `/lessons/${encodeURIComponent(l.file)}`;
      card.className = 'lesson-card';

      const tags = (l.tags || []).slice(0, 4).map(t =>
        `<span class="lesson-tag">${esc(t)}</span>`).join('');

      card.innerHTML = `
        <h3>${esc(l.title)}</h3>
        <div class="desc">${esc(l.description || '—')}</div>
        ${tags ? `<div style="margin-top:10px;">${tags}</div>` : ''}
        <div class="meta">
          <span>📑 ${l.sections_count || 0} بخش</span>
          ${l.quiz_name ? `<span>📝 ${esc(l.quiz_name)}</span>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  let timer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) { render(all); return; }
      try {
        const r = await window.API.searchLessons(q);
        render(r.lessons || []);
      } catch (_) { /* ignore */ }
    }, 250);
  });

  load();
})();
