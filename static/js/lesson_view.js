(function () {
  'use strict';
  const esc = window.Sanitize?.escapeHtml || (s => String(s));
  const md = window.MD;
  const name = window.LESSON_NAME;
  const STORAGE_KEY = `lpic_lesson_${name}_read`;

  const $title = document.getElementById('lessonTitle');
  const $meta = document.getElementById('lessonMeta');
  const $sections = document.getElementById('sections');
  const $toc = document.getElementById('tocList');
  const $editLink = document.getElementById('editLink');
  const $quizLink = document.getElementById('quizLink');

  $editLink.href = `/lessons/${encodeURIComponent(name)}/edit`;

  let readSet = new Set();
  try { readSet = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch (_) {}

  function saveRead() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readSet]));
  }

  async function load() {
    let lesson;
    try {
      const r = await window.API.getLesson(name);
      lesson = r.lesson;
    } catch (e) {
      $sections.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary);">
        ❌ درسنامه یافت نشد.<br><a href="/lessons">بازگشت به لیست</a>
      </div>`;
      $title.textContent = 'خطا';
      return;
    }

    document.title = `${lesson.title} | درسنامه`;
    $title.textContent = lesson.title;

    const parts = [];
    if (lesson.description) parts.push(esc(lesson.description));
    parts.push(`📑 ${lesson.sections.length} بخش`);
    if (lesson.level) parts.push(`سطح ${lesson.level}`);
    if (lesson.tags?.length) parts.push(lesson.tags.map(t => `#${esc(t)}`).join(' '));
    $meta.innerHTML = parts.join(' • ');

    if (lesson.quiz_name) {
      $quizLink.href = `/quiz/${encodeURIComponent(lesson.quiz_name)}`;
      $quizLink.style.display = '';
      $quizLink.textContent = `📝 آزمون: ${lesson.quiz_name}`;
    }

    // TOC
    $toc.innerHTML = '';
    lesson.sections.forEach((s, i) => {
      const a = document.createElement('a');
      a.href = `#${s.id}`;
      a.textContent = s.title || `بخش ${i + 1}`;
      a.dataset.sid = s.id;
      $toc.appendChild(a);
    });

    // Sections
    $sections.innerHTML = '';
    lesson.sections.forEach((s, i) => {
      const wrap = document.createElement('section');
      wrap.className = 'lesson-section';
      wrap.id = s.id;

      const head = document.createElement('h2');
      head.textContent = s.title || `بخش ${i + 1}`;
      wrap.appendChild(head);

      const body = document.createElement('div');
      body.className = 'lesson-content';
      body.innerHTML = md.render(s.content);
      wrap.appendChild(body);

      const actions = document.createElement('div');
      actions.className = 'section-actions';

      const isRead = readSet.has(s.id);
      const btn = document.createElement('button');
      btn.className = 'section-done-btn' + (isRead ? ' done' : '');
      btn.textContent = isRead ? '✅ خوانده‌شده' : '⬜ علامت‌گذاری به‌عنوان خوانده‌شده';
      btn.addEventListener('click', () => {
        if (readSet.has(s.id)) readSet.delete(s.id);
        else readSet.add(s.id);
        saveRead();
        btn.classList.toggle('done');
        btn.textContent = readSet.has(s.id) ? '✅ خوانده‌شده' : '⬜ علامت‌گذاری به‌عنوان خوانده‌شده';
      });
      actions.appendChild(btn);

      if (s.question_ids?.length) {
        const qlink = document.createElement('a');
        qlink.href = `/quiz/${encodeURIComponent(lesson.quiz_name || '')}`;
        qlink.textContent = `🔗 ${s.question_ids.length} سوال مرتبط`;
        qlink.style.marginRight = 'auto';
        if (!lesson.quiz_name) qlink.style.display = 'none';
        actions.appendChild(qlink);
      }

      wrap.appendChild(actions);
      $sections.appendChild(wrap);
    });

    // Scroll spy
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          document.querySelectorAll('.lesson-toc a').forEach(a => a.classList.remove('active'));
          const a = document.querySelector(`.lesson-toc a[data-sid="${e.target.id}"]`);
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.lesson-section').forEach(el => observer.observe(el));
  }

  load();
})();
