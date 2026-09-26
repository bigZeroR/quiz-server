/* Create Quiz Page Controller */
(function () {
  'use strict';

  const escapeHtml = window.Sanitize.escapeHtml;
  const questions = [];
  let metadata = { title: '', description: '', type: 'general', level: 1 };

  const $ = (id) => document.getElementById(id);

  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  function renderQuestions() {
    $('qCount').textContent = questions.length;
    $('totalCount').textContent = questions.length + ' سوال';
    const list = $('questionsList');
    if (!questions.length) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);">هنوز سوالی اضافه نشده.</div>';
      return;
    }
    list.innerHTML = '';
    questions.forEach((q, i) => {
      const div = document.createElement('div');
      div.style.cssText = 'background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;gap:12px;align-items:center;';
      const info = document.createElement('div');
      info.innerHTML = `<div style="font-weight:600;">سوال ${i+1}: ${escapeHtml(q.text.slice(0, 80))}${q.text.length > 80 ? '...' : ''}</div>
        <div style="font-size:0.8rem;color:var(--text-tertiary);margin-top:4px;">📁 ${escapeHtml(q.category)} • L${q.level} • پاسخ: ${['A','B','C','D'][q.correct]}</div>`;
      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.className = 'btn btn-danger';
      del.onclick = () => { questions.splice(i, 1); renderQuestions(); };
      div.appendChild(info);
      div.appendChild(del);
      list.appendChild(div);
    });
  }

  $('btnPaste').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      $('rawText').value = text;
      toast('از کلیپ‌بورد خوانده شد', 'success');
    } catch (e) {
      toast('دسترسی به کلیپ‌بورد ممکن نیست', 'error');
    }
  });

  $('btnParse').addEventListener('click', () => {
    const raw = $('rawText').value.trim();
    if (!raw) { toast('JSON را وارد کنید', 'error'); return; }
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data.questions) || !data.questions.length) {
        toast('فیلد questions باید آرایه‌ای غیرخالی باشد', 'error');
        return;
      }
      metadata = {
        title: data.title || 'آزمون',
        description: data.description || '',
        type: data.type || 'general',
        level: data.level || 1,
      };
      data.questions.forEach((q) => {
        questions.push({
          text: q.text || '',
          options: q.options || [],
          correct: q.correct || 0,
          category: q.category || 'عمومی',
          level: q.level || 1,
          explanation: q.explanation || '',
          command: q.command,
          example: q.example,
        });
      });
      renderQuestions();
      $('rawText').value = '';
      toast(`✅ ${data.questions.length} سوال اضافه شد`, 'success');
    } catch (e) {
      toast('JSON نامعتبر: ' + e.message, 'error');
    }
  });

  $('btnPublish').addEventListener('click', async () => {
    const name = $('quizName').value.trim();
    if (!name) { toast('نام آزمون الزامی است', 'error'); return; }
    if (!questions.length) { toast('حداقل یک سوال اضافه کنید', 'error'); return; }

    const payload = {
      title: metadata.title || 'آزمون',
      description: metadata.description || '',
      type: metadata.type || 'general',
      level: metadata.level || 1,
      questions: questions.map((q, i) => ({ ...q, id: String(i + 1) })),
    };

    const btn = $('btnPublish');
    btn.disabled = true;
    btn.textContent = 'در حال ذخیره...';
    try {
      await window.API.saveQuiz(name, payload);
      toast('✅ ذخیره شد', 'success');
      setTimeout(() => { window.location.href = `/quiz/${name}`; }, 800);
    } catch (e) {
      toast('خطا: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 ذخیره و انتشار';
    }
  });

  renderQuestions();
})();
