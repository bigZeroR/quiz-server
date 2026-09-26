/* Quiz Page Controller - wires QuizEngine + QuizUI to the DOM. */
(function () {
  'use strict';

  if (!window.QUIZ_DATA) return;

  const { QuizEngine } = window;
  const { QuizUI } = window;
  const { toast, renderQuestion } = QuizUI;

  const quizName = window.QUIZ_NAME;
  const isAdaptive = window.URL_PARAMS.mode === 'adaptive';

  const engine = new QuizEngine(window.QUIZ_DATA, {
    storagePrefix: `lpic_${quizName}_`,
    adaptive: isAdaptive,
  });

  const container = document.getElementById('questionsContainer');
  const currentQEl = document.getElementById('currentQ');
  const totalQEl = document.getElementById('totalQ');
  const correctEl = document.getElementById('correctCount');
  const wrongEl = document.getElementById('wrongCount');
  const progressEl = document.getElementById('progressPercent');
  const progressBar = document.getElementById('progressBar');

  function renderCategories() {
    const el = document.getElementById('categoryFilter');
    if (!el) return;
    const cats = ['all', ...new Set(engine.quiz.questions.map(q => q.category || 'عمومی'))];
    el.innerHTML = '';
    cats.forEach((cat, i) => {
      const btn = document.createElement('button');
      btn.className = 'category-btn' + (i === 0 ? ' active' : '');
      btn.textContent = cat === 'all' ? '📋 همه' : cat;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        engine.filterByCategory(cat);
        refresh();
      });
      el.appendChild(btn);
    });
  }

  function updateStats() {
    const s = engine.stats();
    correctEl.textContent = s.correct;
    wrongEl.textContent = s.wrong;
    currentQEl.textContent = engine.index + 1;
    totalQEl.textContent = engine.total;
    const p = s.total > 0 ? Math.round(s.answered / s.total * 100) : 0;
    progressEl.textContent = p + '%';
  }

  function updateProgress() {
    const p = engine.total > 0 ? (engine.index + 1) / engine.total * 100 : 0;
    if (progressBar) progressBar.style.width = p + '%';
  }

  function refresh() {
    renderQuestion(engine, container);
    updateStats();
    updateProgress();
  }

  window.updateStats = updateStats;
  window.updateProgress = updateProgress;

  document.getElementById('btnNext').addEventListener('click', () => { engine.next(); refresh(); });
  document.getElementById('btnPrev').addEventListener('click', () => { engine.prev(); refresh(); });
  document.getElementById('btnRandom').addEventListener('click', () => { engine.random(); refresh(); });

  let searchTimer = null;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        engine.search(searchInput.value);
        refresh();
      }, 250);
    });
  }

  document.getElementById('btnBookmarks').addEventListener('click', () => {
    const b = engine.bookmarkedQuestions();
    if (!b.length) { toast('هیچ سوالی نشان نشده', 'info'); return; }
    engine.filtered = b; engine.index = 0; refresh();
    toast(`${b.length} سوال نشان‌شده`, 'success');
  });

  document.getElementById('btnWrong').addEventListener('click', () => {
    const w = engine.wrongQuestions();
    if (!w.length) { toast('هیچ پاسخ غلطی ندارید!', 'success'); return; }
    engine.filtered = w; engine.index = 0; refresh();
    toast(`${w.length} سوال غلط`, 'warning');
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    if (!confirm('آیا مطمئنید؟ تمام پیشرفت پاک می‌شود.')) return;
    engine.resetAll();
    location.href = '/';
  });

  // Edit modal
  const editModal = document.getElementById('editModal');
  const closeModal = () => { editModal.style.display = 'none'; };
  document.getElementById('editModalClose').addEventListener('click', closeModal);
  document.getElementById('editCancel').addEventListener('click', closeModal);
  editModal.addEventListener('click', (e) => { if (e.target === editModal) closeModal(); });

  window.openEditModal = function (qId) {
    const q = engine.quiz.questions.find(item => item.id === qId);
    if (!q) return;
    document.getElementById('editQuestionId').value = qId;
    document.getElementById('editText').value = q.text || '';
    document.getElementById('editCategory').value = q.category || '';
    document.getElementById('editLevel').value = q.level || 1;
    for (let i = 0; i < 4; i++) {
      document.getElementById(`editOpt${i}`).value = (q.options && q.options[i]) || '';
    }
    document.querySelectorAll('input[name="editCorrect"]').forEach(r => {
      r.checked = parseInt(r.value) === q.correct;
    });
    document.getElementById('editExplanation').value = q.explanation || '';
    editModal.style.display = 'flex';
  };

  window.deleteQuestionById = async function (qId) {
    if (!confirm('این سوال حذف شود؟')) return;
    try {
      await window.API.deleteQuestion(quizName, qId);
      toast('✅ حذف شد', 'success');
      engine.quiz.questions = engine.quiz.questions.filter(q => q.id !== qId);
      engine.filtered = engine.filtered.filter(q => q.id !== qId);
      delete engine.userAnswers[qId];
      localStorage.setItem(`lpic_${quizName}_answers`, JSON.stringify(engine.userAnswers));
      if (engine.index >= engine.total) engine.index = Math.max(0, engine.total - 1);
      refresh();
    } catch (e) {
      toast('خطا: ' + e.message, 'error');
    }
  };

  document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const qId = document.getElementById('editQuestionId').value;
    const payload = {
      text: document.getElementById('editText').value.trim(),
      category: document.getElementById('editCategory').value.trim() || 'عمومی',
      level: parseInt(document.getElementById('editLevel').value) || 1,
      options: [0, 1, 2, 3]
        .map(i => document.getElementById(`editOpt${i}`).value.trim())
        .filter(o => o.length > 0),
      correct: parseInt(document.querySelector('input[name="editCorrect"]:checked')?.value ?? 0),
      explanation: document.getElementById('editExplanation').value.trim(),
    };
    try {
      await window.API.updateQuestion(quizName, qId, payload);
      toast('✅ ویرایش شد', 'success');
      closeModal();
      const idx = engine.quiz.questions.findIndex(q => q.id === qId);
      if (idx >= 0) engine.quiz.questions[idx] = { ...engine.quiz.questions[idx], ...payload, id: qId };
      const fidx = engine.filtered.findIndex(q => q.id === qId);
      if (fidx >= 0) engine.filtered[fidx] = { ...engine.filtered[fidx], ...payload, id: qId };
      refresh();
    } catch (err) {
      toast('خطا: ' + err.message, 'error');
    }
  });

  renderCategories();
  refresh();
})();
