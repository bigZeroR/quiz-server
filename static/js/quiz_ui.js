/* Quiz UI - rendering + DOM wiring. */
(function (global) {
  'use strict';
  const { escapeHtml, safeHtml } = global.Sanitize;

  function toast(msg, type = 'info', timeout = 3000) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, timeout);
  }

  function renderQuestion(engine, container) {
    const letters = global.QuizEngine.letters();
    const total = engine.total;
    const current = engine.current;

    if (!total) {
      container.innerHTML = '<div class="empty-state" style="display:block;padding:40px;text-align:center;color:#999;">سوالی یافت نشد.</div>';
      return;
    }

    container.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'question-card active';

    const header = document.createElement('div');
    header.className = 'q-header';
    header.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;">
        <span class="q-badge">${escapeHtml(current.category || 'عمومی')} • L${escapeHtml(current.level)}</span>
        <span class="q-badge">#${engine.index + 1} / ${total}</span>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="ai-explain-btn" title="توضیح با AI">🤖</button>
        <button class="bookmark-btn ${engine.bookmarks.has(current.id) ? 'active' : ''}" title="نشان">⭐</button>
      </div>
    `;
    header.querySelector('.bookmark-btn').addEventListener('click', (e) => {
      engine.toggleBookmark(current.id);
      e.currentTarget.classList.toggle('active');
      toast(engine.bookmarks.has(current.id) ? 'نشان شد' : 'حذف شد', 'info');
    });
    header.querySelector('.ai-explain-btn').addEventListener('click', () => copyAIPrompt(current));
    card.appendChild(header);

    const textEl = document.createElement('div');
    textEl.className = 'q-text';
    textEl.innerHTML = safeHtml(current.text);
    card.appendChild(textEl);

    if (current.command) {
      const cmd = document.createElement('div');
      cmd.className = 'command-block';
      cmd.innerHTML = `<span class="prompt">$</span> <code>${escapeHtml(current.command)}</code>`;
      card.appendChild(cmd);
    }

    const opts = document.createElement('div');
    opts.className = 'options';
    const userAnswer = engine.userAnswers[current.id];
    current.options.forEach((optText, i) => {
      const div = document.createElement('div');
      div.className = 'option';
      div.dataset.letter = letters[i];
      div.innerHTML = safeHtml(optText);
      if (userAnswer !== undefined) {
        div.classList.add('disabled');
        if (i === current.correct) div.classList.add('correct');
        if (i === userAnswer && i !== current.correct) div.classList.add('wrong');
      } else {
        div.addEventListener('click', () => {
          const r = engine.answer(current.id, i);
          if (r) {
            renderQuestion(engine, container);
            if (global.updateStats) global.updateStats();
          }
        });
      }
      opts.appendChild(div);
    });
    card.appendChild(opts);

    if (current.explanation && userAnswer !== undefined) {
      const exp = document.createElement('div');
      exp.className = 'explanation show';
      exp.innerHTML = `<strong>💡 توضیح:</strong> ${safeHtml(current.explanation)}`;
      card.appendChild(exp);
    }

    container.appendChild(card);
    if (global.updateProgress) global.updateProgress();
  }

  function copyAIPrompt(question) {
    const letters = ['A', 'B', 'C', 'D'];
    const prompt =
      `نقش: مدرس حرفه‌ای.\n\n` +
      `سوال: ${question.text}\n\n` +
      `گزینه‌ها:\n${question.options.map((o, i) => `${letters[i]}. ${o}`).join('\n')}\n\n` +
      `پاسخ صحیح: ${letters[question.correct]}\n\n` +
      `توضیح کامل و آموزشی بده:`;
    navigator.clipboard.writeText(prompt)
      .then(() => toast('پرامپت کپی شد', 'success'))
      .catch(() => toast('کپی ناموفق', 'error'));
  }

  global.QuizUI = { toast, renderQuestion, copyAIPrompt };
})(window);
