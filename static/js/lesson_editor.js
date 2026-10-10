(function () {
  'use strict';
  const esc = window.Sanitize?.escapeHtml || (s => String(s));
  const md = window.MD;
  const original = window.LESSON_NAME;
  const isNew = !original || original === 'new';

  const $name = document.getElementById('lessonName');
  const $title = document.getElementById('lessonTitle');
  const $desc = document.getElementById('lessonDesc');
  const $quiz = document.getElementById('lessonQuiz');
  const $level = document.getElementById('lessonLevel');
  const $tagField = document.getElementById('tagField');
  const $tagInput = document.getElementById('tagInput');
  const $sections = document.getElementById('sectionsEditor');
  const $status = document.getElementById('statusText');
  const $saveBtn = document.getElementById('btnSave');
  const $saveBottom = document.getElementById('btnSaveBottom');
  const $btnAdd = document.getElementById('btnAddSection');

  let tags = [];
  let sections = [];

  // ── Tags ────────────────────────────────────────────────
  function renderTags() {
    $tagInput.querySelectorAll('.tag-chip').forEach(el => el.remove());
    tags.forEach((t, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${esc(t)} <button type="button" data-i="${i}">✕</button>`;
      chip.querySelector('button').addEventListener('click', () => {
        tags.splice(i, 1); renderTags();
      });
      $tagInput.insertBefore(chip, $tagField);
    });
  }

  $tagField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = $tagField.value.trim();
      if (v && !tags.includes(v)) { tags.push(v); renderTags(); }
      $tagField.value = '';
    }
  });

  // ── Sections ────────────────────────────────────────────
  function newSection() {
    return { id: '', title: '', content: '', question_ids: [] };
  }

  function renderSections() {
    $sections.innerHTML = '';
    if (!sections.length) {
      $sections.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:20px;">هنوز بخشی اضافه نشده.</p>';
      return;
    }
    sections.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'section-row';
      row.innerHTML = `
        <div class="row-head">
          <span class="drag-handle">⋮⋮</span>
          <input type="text" class="form-input" placeholder="عنوان بخش ${i + 1}" value="${esc(s.title)}">
          <div class="section-actions">
            <button class="btn btn-ghost btn-sm" data-act="up" title="بالا">↑</button>
            <button class="btn btn-ghost btn-sm" data-act="down" title="پایین">↓</button>
            <button class="btn btn-danger btn-sm" data-act="del" title="حذف">🗑️</button>
          </div>
        </div>
        <textarea class="form-textarea mono" placeholder="محتوای Markdown..." rows="6">${esc(s.content)}</textarea>
        <div style="margin-top:8px;">
          <label class="form-label">شناسه‌های سوال مرتبط (با کاما جدا کنید)</label>
          <input type="text" class="form-input mono" placeholder="q_1, q_2" value="${esc((s.question_ids || []).join(', '))}">
        </div>
      `;

      const titleInput = row.querySelector('.row-head input[type=text]');
      const contentInput = row.querySelector('textarea');
      const qidInput = row.querySelectorAll('input[type=text]')[1];

      titleInput.addEventListener('input', () => { sections[i].title = titleInput.value; });
      contentInput.addEventListener('input', () => { sections[i].content = contentInput.value; });
      qidInput.addEventListener('input', () => {
        sections[i].question_ids = qidInput.value.split(',').map(x => x.trim()).filter(Boolean);
      });

      row.querySelector('[data-act=up]').addEventListener('click', () => {
        if (i === 0) return;
        [sections[i - 1], sections[i]] = [sections[i], sections[i - 1]];
        renderSections();
      });
      row.querySelector('[data-act=down]').addEventListener('click', () => {
        if (i === sections.length - 1) return;
        [sections[i + 1], sections[i]] = [sections[i], sections[i + 1]];
        renderSections();
      });
      row.querySelector('[data-act=del]').addEventListener('click', () => {
        if (!confirm(`بخش «${s.title || i + 1}» حذف شود؟`)) return;
        sections.splice(i, 1);
        renderSections();
      });

      $sections.appendChild(row);
    });
  }

  $btnAdd.addEventListener('click', () => {
    sections.push(newSection());
    renderSections();
  });

  // ── Load ────────────────────────────────────────────────
  async function loadQuizzes() {
    try {
      const r = await fetch('/api/v1/quizzes').then(x => x.json());
      (r.quizzes || []).forEach(q => {
        const o = document.createElement('option');
        o.value = q.file;
        o.textContent = q.title || q.file;
        $quiz.appendChild(o);
      });
    } catch (_) {}
  }

  async function loadLesson() {
    if (isNew) {
      $name.value = '';
      $name.readOnly = false;
      document.getElementById('pageTitle').textContent = '➕ درسنامهٔ جدید';
      sections.push(newSection());
      renderSections();
      return;
    }
    try {
      const r = await window.API.getLesson(original);
      const l = r.lesson;
      $name.value = original;
      $name.readOnly = true;
      $title.value = l.title || '';
      $desc.value = l.description || '';
      $level.value = l.level || 1;
      if (l.quiz_name) $quiz.value = l.quiz_name;
      tags = (l.tags || []).slice();
      sections = (l.sections || []).map(s => ({
        id: s.id || '',
        title: s.title || '',
        content: s.content || '',
        question_ids: s.question_ids || [],
      }));
      if (!sections.length) sections.push(newSection());
      renderTags();
      renderSections();
      document.getElementById('pageTitle').textContent = `✏️ ${l.title}`;
      document.title = `ویرایش ${l.title}`;
    } catch (e) {
      alert('خطا در بارگذاری: ' + e.message);
      window.location.href = '/lessons';
    }
  }

  // ── Save ────────────────────────────────────────────────
  function collect() {
    const name = $name.value.trim().toLowerCase();
    if (!name) throw new Error('نام درسنامه الزامی است');
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name)) {
      throw new Error('نام فقط حروف کوچک انگلیسی، اعداد، - و _');
    }
    const clean = sections
      .map(s => ({
        id: s.id || '',
        title: s.title.trim(),
        content: s.content.trim(),
        question_ids: (s.question_ids || []).filter(Boolean),
      }))
      .filter(s => s.title || s.content);
    if (!clean.length) throw new Error('حداقل یک بخش با محتوا لازم است');

    return {
      name,
      payload: {
        title: $title.value.trim() || name,
        description: $desc.value.trim(),
        quiz_name: $quiz.value || '',
        level: parseInt($level.value) || 1,
        tags,
        sections: clean,
      },
    };
  }

  async function save() {
    try {
      const { name, payload } = collect();
      $status.textContent = '⏳ در حال ذخیره...';
      $saveBtn.disabled = true;
      $saveBottom.disabled = true;

      if (isNew || name !== original) {
        await window.API.saveLesson(name, payload);
      } else {
        await window.API.updateLesson(name, payload);
      }
      $status.textContent = '✅ ذخیره شد';
      if (isNew || name !== original) {
        setTimeout(() => { window.location.href = `/lessons/${encodeURIComponent(name)}`; }, 400);
      } else {
        setTimeout(() => { $status.textContent = ''; }, 1500);
      }
    } catch (e) {
      alert('خطا: ' + e.message);
      $status.textContent = '';
    } finally {
      $saveBtn.disabled = false;
      $saveBottom.disabled = false;
    }
  }

  $saveBtn.addEventListener('click', save);
  $saveBottom.addEventListener('click', save);

  // Ctrl+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  });

  // ── Preview ─────────────────────────────────────────────
  const $modal = document.getElementById('previewModal');
  const $body = document.getElementById('previewBody');
  document.getElementById('btnPreview').addEventListener('click', () => {
    const parts = [`<h1>${esc($title.value || 'درسنامه')}</h1>`];
    if ($desc.value) parts.push(`<p>${esc($desc.value)}</p>`);
    sections.forEach((s, i) => {
      parts.push(`<hr><h2>${esc(s.title || 'بخش ' + (i + 1))}</h2>`);
      parts.push(`<div class="lesson-content">${md.render(s.content || '')}</div>`);
    });
    $body.innerHTML = parts.join('\n');
    $modal.style.display = 'flex';
  });
  document.getElementById('previewClose').addEventListener('click', () => { $modal.style.display = 'none'; });
  $modal.addEventListener('click', (e) => { if (e.target === $modal) $modal.style.display = 'none'; });

  // ── AI Prompt Generator ─────────────────────────────────
  function buildLessonPrompt(sourceText, titleHint) {
    const title = titleHint || $title.value.trim() || 'درسنامه';
    const lines = [
      'You are an expert teacher creating a Persian (Farsi) lesson in Markdown format.',
      '',
      'TASK: Convert the following source text into a structured lesson.',
      '',
      'OUTPUT FORMAT — return ONLY valid JSON, no explanation, no markdown code fences:',
      '{',
      '  "title": "عنوان درسنامه",',
      '  "description": "توضیح کوتاه یک‌خطی",',
      '  "tags": ["برچسب۱", "برچسب۲"],',
      '  "sections": [',
      '    {',
      '      "id": "s1",',
      '      "title": "عنوان بخش اول",',
      '      "content": "## زیرعنوان\\n\\nمتن مارک‌داون..."',
      '    }',
      '  ]',
      '}',
      '',
      'RULES:',
      '1. Language: Persian (Farsi), RTL. Keep technical terms in English (e.g. command names).',
      '2. Split the content into 3-8 logical sections with clear descriptive titles.',
      '3. Each section "content" MUST be valid Markdown.',
      '4. Use headings (##, ###), bullet lists, **bold**, and `inline code`.',
      '5. For commands/code samples, use fenced blocks: start with three backticks + bash, end with three backticks.',
      '6. Use "> " blockquote for important warnings or tips.',
      '7. Do NOT invent facts. Only reformat / restructure the given text.',
      '8. Section "id" must be lowercase ascii like "s1", "s2", ...',
      '9. "tags" must be 2-5 short Persian keywords.',
      '10. If the source is messy, clean it up but keep all factual content.',
      '',
      'LESSON TITLE HINT: ' + title,
      '',
      'SOURCE TEXT:',
      '---',
      sourceText,
      '---',
      '',
      'Now output the JSON:'
    ];
    return lines.join('\n');
  }

  const aiSourceText = document.getElementById('aiSourceText');
  const aiLessonOutput = document.getElementById('aiLessonOutput');
  const lessonPromptPreview = document.getElementById('lessonPromptPreview');
  const aiImportStatus = document.getElementById('aiImportStatus');

  function refreshPromptPreview() {
    if (!lessonPromptPreview) return;
    lessonPromptPreview.textContent = buildLessonPrompt(
      aiSourceText?.value || '...', $title.value.trim()
    );
  }
  if (aiSourceText) {
    aiSourceText.addEventListener('input', refreshPromptPreview);
  }
  if ($title) {
    $title.addEventListener('input', refreshPromptPreview);
  }
  refreshPromptPreview();

  const $btnCopyPrompt = document.getElementById('btnCopyLessonPrompt');
  if ($btnCopyPrompt) {
    $btnCopyPrompt.addEventListener('click', async () => {
      const srcText = aiSourceText.value.trim();
      if (!srcText) {
        alert('ابتدا متن آموزشی را در کادر بالا وارد کنید');
        return;
      }
      const prompt = buildLessonPrompt(srcText, $title.value.trim());
      try {
        await navigator.clipboard.writeText(prompt);
        $status.style.color = '#22c55e';
        $status.textContent = '✅ پرامپت کپی شد — در ChatGPT/Claude/Gemini پیست کنید';
        setTimeout(() => { $status.textContent = ''; $status.style.color = ''; }, 4000);
      } catch (e) {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = prompt;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); $status.textContent = '✅ کپی شد'; }
        catch (_) { alert('کپی ناموفق — به‌صورت دستی از پیش‌نمایش بردارید'); }
        document.body.removeChild(ta);
      }
    });
  }

  const $btnPreviewPrompt = document.getElementById('btnPreviewLessonPrompt');
  if ($btnPreviewPrompt) {
    $btnPreviewPrompt.addEventListener('click', () => {
      refreshPromptPreview();
      const box = document.getElementById('promptPreviewBox');
      if (box) box.open = true;
      lessonPromptPreview?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const $btnImportAI = document.getElementById('btnImportAI');
  if ($btnImportAI) {
    $btnImportAI.addEventListener('click', () => {
      const raw = aiLessonOutput.value.trim();
      aiImportStatus.style.color = '';
      if (!raw) {
        aiImportStatus.style.color = '#f43f5e';
        aiImportStatus.textContent = '⚠️ کادر خروجی AI خالی است';
        return;
      }

      // strip ```json ... ``` fences if present
      let cleaned = raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      // tolerate trailing commas before } or ]
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

      let data;
      try {
        data = JSON.parse(cleaned);
      } catch (e) {
        // try to extract first {...} block
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) {
          try { data = JSON.parse(m[0].replace(/,\s*([}\]])/g, '$1')); }
          catch (e2) {
            aiImportStatus.style.color = '#f43f5e';
            aiImportStatus.textContent = '❌ JSON نامعتبر: ' + e2.message;
            return;
          }
        } else {
          aiImportStatus.style.color = '#f43f5e';
          aiImportStatus.textContent = '❌ JSON نامعتبر: ' + e.message;
          return;
        }
      }

      const incoming = data.sections || data.chapters || data.parts;
      if (!Array.isArray(incoming) || !incoming.length) {
        aiImportStatus.style.color = '#f43f5e';
        aiImportStatus.textContent = '❌ فیلد "sections" پیدا نشد یا خالی است';
        return;
      }

      // fill meta if empty
      if (data.title && !$title.value.trim()) $title.value = data.title;
      if (data.description && !$desc.value.trim()) $desc.value = data.description;
      if (Array.isArray(data.tags)) {
        data.tags.forEach(t => {
          const v = String(t).trim();
          if (v && !tags.includes(v)) tags.push(v);
        });
        renderTags();
      }

      // append sections
      incoming.forEach((s, i) => {
        if (typeof s === 'string') {
          sections.push({
            id: '', title: `بخش ${sections.length + 1}`,
            content: s, question_ids: []
          });
          return;
        }
        sections.push({
          id: s.id || '',
          title: s.title || `بخش ${sections.length + 1}`,
          content: s.content || s.body || s.text || '',
          question_ids: s.question_ids || s.related_question_ids || []
        });
      });
      renderSections();

      aiLessonOutput.value = '';
      aiImportStatus.style.color = '#22c55e';
      aiImportStatus.textContent = `✅ ${incoming.length} بخش اضافه شد (${sections.length} بخش کل)`;
      setTimeout(() => {
        if (aiImportStatus.style.color === 'rgb(34, 197, 94)') {
          aiImportStatus.textContent = '';
        }
      }, 4000);
    });
  }

  const $toggleAI = document.getElementById('toggleAIPrompt');
  const $aiBody = document.getElementById('aiPromptBody');
  if ($toggleAI && $aiBody) {
    $toggleAI.addEventListener('click', () => {
      const hidden = $aiBody.style.display === 'none';
      $aiBody.style.display = hidden ? '' : 'none';
      $toggleAI.textContent = hidden ? 'مخفی' : 'نمایش';
    });
  }

  // ── Boot ────────────────────────────────────────────────
  loadQuizzes();
  loadLesson();
})();
