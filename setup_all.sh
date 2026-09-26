#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  setup_all.sh — Force-write ALL frontend files.
#  Run from the project root (where server.py lives).
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

if [ ! -f "server.py" ]; then
    echo "❌ server.py یافت نشد. از ریشه پروژه اجرا کنید."
    exit 1
fi

echo "▶ Writing all frontend files..."

mkdir -p templates static/js

# ═══════════════════════════════════════════════════════════════
# templates/index.html
# ═══════════════════════════════════════════════════════════════
cat > templates/index.html <<'FILE_EOF'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% if quiz %}{{ quiz.title }}{% else %}سامانه آزمون{% endif %}</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>

{% if quiz %}
<!-- ═══════════════ QUIZ PAGE ═══════════════ -->
<div class="progress-bar" id="progressBar"></div>

<div class="stats-bar">
    <div class="stat-item" id="aiTimerStat" style="display:none;">
        <span class="stat-icon">⏱️</span>
        <span class="stat-label">زمان</span>
        <span class="stat-value" id="aiTimer">0s</span>
    </div>
    <div class="stat-item" id="aiLevelStat" style="display:none;">
        <span class="stat-icon">📊</span>
        <span class="stat-label">سطح</span>
        <span class="stat-value" id="aiCurrentLevel">-</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
        <span class="stat-icon">📝</span>
        <span class="stat-label">سوال</span>
        <span class="stat-value"><span id="currentQ">1</span>/<span id="totalQ">0</span></span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
        <span class="stat-icon">✅</span>
        <span class="stat-label">صحیح</span>
        <span class="stat-value stat-correct" id="correctCount">0</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
        <span class="stat-icon">❌</span>
        <span class="stat-label">غلط</span>
        <span class="stat-value stat-wrong" id="wrongCount">0</span>
    </div>
    <div class="stat-divider"></div>
    <div class="stat-item">
        <span class="stat-icon">📊</span>
        <span class="stat-label">پیشرفت</span>
        <span class="stat-value stat-progress" id="progressPercent">0%</span>
    </div>
</div>

<header class="quiz-header">
    <a href="/" class="back-btn" title="بازگشت">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </a>
    <div class="quiz-header-content">
        <h1>{{ quiz.title }}</h1>
        <p class="subtitle">{{ quiz.description }}</p>
    </div>
    <div class="header-spacer"></div>
</header>

<div class="search-bar">
    <input type="text" id="searchInput" class="search-input" placeholder="🔍 جستجو در سوالات...">
</div>

<div class="category-filter" id="categoryFilter"></div>

<div class="questions-wrapper">
    <div id="questionsContainer"></div>
</div>

<nav class="nav-controls">
    <button class="btn btn-nav" id="btnPrev">← قبلی</button>
    <button class="btn btn-nav btn-primary" id="btnRandom">🎲 تصادفی</button>
    <button class="btn btn-nav" id="btnNext">بعدی →</button>
</nav>

<div class="action-controls">
    <button class="btn btn-info" id="btnBookmarks">⭐ نشان‌شده‌ها</button>
    <button class="btn btn-warning" id="btnWrong">❌ مرور غلط‌ها</button>
    <button class="btn btn-danger" id="btnReset">↺ ریست کامل</button>
    <a href="/" class="btn btn-ghost">⌂ خانه</a>
</div>

<!-- Edit Modal -->
<div id="editModal" class="modal-overlay" style="display:none;">
    <div class="modal-container" style="max-width:700px;">
        <div class="modal-header">
            <div class="modal-header-left">
                <span class="modal-icon">✏️</span>
                <div><h2>ویرایش سوال</h2></div>
            </div>
            <button class="modal-close" id="editModalClose" type="button">✕</button>
        </div>
        <div class="modal-body">
            <form id="editForm">
                <input type="hidden" id="editQuestionId">
                <div class="form-group">
                    <label class="form-label">متن سوال</label>
                    <textarea id="editText" class="form-textarea" rows="3" required></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">دسته‌بندی</label>
                    <input type="text" id="editCategory" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">سطح</label>
                    <select id="editLevel" class="form-select">
                        <option value="1">1</option><option value="2">2</option>
                        <option value="3">3</option><option value="4">4</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">گزینه‌ها</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                        <input type="text" id="editOpt0" class="form-input" placeholder="A">
                        <input type="text" id="editOpt1" class="form-input" placeholder="B">
                        <input type="text" id="editOpt2" class="form-input" placeholder="C">
                        <input type="text" id="editOpt3" class="form-input" placeholder="D">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">پاسخ صحیح</label>
                    <div style="display:flex;gap:16px;">
                        <label><input type="radio" name="editCorrect" value="0"> A</label>
                        <label><input type="radio" name="editCorrect" value="1"> B</label>
                        <label><input type="radio" name="editCorrect" value="2"> C</label>
                        <label><input type="radio" name="editCorrect" value="3"> D</label>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">توضیح</label>
                    <textarea id="editExplanation" class="form-textarea" rows="3"></textarea>
                </div>
                <div style="display:flex;gap:12px;margin-top:16px;">
                    <button type="submit" class="btn btn-primary" style="flex:1;">💾 ذخیره</button>
                    <button type="button" class="btn btn-ghost" id="editCancel">انصراف</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
window.QUIZ_DATA  = {{ quiz | tojson }};
window.QUIZ_NAME  = {{ quiz_name | tojson }};
window.QUIZ_TYPE  = {{ quiz_type | tojson }};
window.URL_PARAMS = Object.fromEntries(new URLSearchParams(location.search));
</script>
<script src="/static/js/sanitize.js"></script>
<script src="/static/js/api.js"></script>
<script src="/static/js/quiz_engine.js"></script>
<script src="/static/js/quiz_ui.js"></script>
<script src="/static/js/quiz_page.js"></script>

{% else %}
<!-- ═══════════════ HOME PAGE ═══════════════ -->
<div class="home-bg-glow"></div>

<header class="home-header">
    <div class="home-logo">
        <span class="logo-icon">🐧</span>
        <h1 class="home-title">سامانه آزمون</h1>
    </div>
    <p class="home-subtitle">مجموعه‌ای از آزمون‌های تستی</p>

    <div class="home-actions">
        <a href="/dashboard" class="btn btn-info">📊 پنل کاربری</a>
        <a href="/create" class="btn btn-create">➕ ساخت آزمون جدید</a>
        <a href="/mobile" class="btn btn-ai-mode">📱 ورود متن با AI</a>
        <a href="/audio" class="btn btn-ghost">🎧 ضبط صدا</a>
    </div>
</header>

<main class="home-container">
    {% set groups = quizzes | groupby('type') %}
    {% for group in groups %}
    <section class="quiz-section">
        <div class="section-header">
            <span class="section-icon">📚</span>
            <h2 class="section-title">
                {% if group.grouper == 'general' %}عمومی{% else %}{{ group.grouper | title }}{% endif %}
            </h2>
            <span class="section-count">{{ group.list | length }} آزمون</span>
        </div>
        <div class="quiz-grid">
            {% for q in group.list %}
            <a href="/quiz/{{ q.file }}" class="quiz-card">
                <div class="card-top">
                    <span class="card-type-badge">{{ q.type }}</span>
                    <span class="card-level">سطح {{ q.level }}</span>
                </div>
                <h3 class="quiz-card-title">{{ q.title }}</h3>
                <p class="quiz-card-desc">{{ q.description }}</p>
                <div class="card-footer">
                    <span class="quiz-card-count">📝 {{ q.count }} سوال</span>
                    <span class="card-arrow">←</span>
                </div>
            </a>
            {% endfor %}
        </div>
    </section>
    {% endfor %}

    {% if not quizzes %}
    <div class="empty-home">
        <div class="empty-icon">📂</div>
        <h3>هنوز آزمونی اضافه نشده است!</h3>
        <p>از دکمه بالا آزمون جدید بسازید.</p>
    </div>
    {% endif %}
</main>

<footer class="home-footer">
    <p>ساخته شده با ❤️</p>
</footer>
{% endif %}

</body>
</html>
FILE_EOF
echo "  ✓ templates/index.html"

# ═══════════════════════════════════════════════════════════════
# templates/create.html
# ═══════════════════════════════════════════════════════════════
cat > templates/create.html <<'FILE_EOF'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ساخت آزمون جدید</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
<div class="creator-container" style="max-width:900px;margin:40px auto;padding:0 16px;">
    <header class="creator-header" style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
        <a href="/" class="back-btn">←</a>
        <h1 style="margin:0;">🛠️ ساخت آزمون جدید</h1>
    </header>

    <section class="form-section" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--accent);margin-bottom:16px;">📛 نام آزمون</div>
        <input type="text" id="quizName" class="form-input"
               placeholder="linux-basics"
               style="width:100%;padding:10px 14px;border:1px solid var(--border-subtle);border-radius:8px;direction:ltr;text-align:left;font-family:monospace;background:var(--bg-elevated);color:var(--text-primary);box-sizing:border-box;">
        <div style="font-size:0.75rem;color:var(--text-tertiary);margin-top:6px;">فقط حروف انگلیسی، اعداد، خط تیره و زیرخط</div>
    </section>

    <section class="form-section" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--accent);margin-bottom:16px;">📥 ورود JSON</div>

        <button class="btn btn-primary" id="btnPaste" style="margin-bottom:12px;">📋 چسباندن از کلیپ‌بورد</button>
        <textarea id="rawText" class="form-textarea"
                  placeholder='{"title":"...","description":"...","type":"general","level":1,"questions":[...]}'
                  style="width:100%;min-height:200px;padding:12px;border:1px solid var(--border-subtle);border-radius:8px;font-family:monospace;direction:ltr;text-align:left;background:var(--bg-elevated);color:var(--text-primary);box-sizing:border-box;"></textarea>
        <button class="btn btn-primary" id="btnParse" style="margin-top:12px;width:100%;">⚙️ پردازش و افزودن</button>
    </section>

    <section class="form-section" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--accent);margin-bottom:16px;">
            📋 سوالات (<span id="qCount">0</span>)
        </div>
        <div id="questionsList"></div>
    </section>

    <div style="position:sticky;bottom:20px;background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:12px;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
        <span style="color:var(--text-secondary);" id="totalCount">0 سوال</span>
        <button class="btn btn-primary" id="btnPublish" style="padding:12px 32px;font-weight:800;">💾 ذخیره و انتشار</button>
    </div>
</div>

<script src="/static/js/sanitize.js"></script>
<script src="/static/js/api.js"></script>
<script src="/static/js/create_page.js"></script>
</body>
</html>
FILE_EOF
echo "  ✓ templates/create.html"

# ═══════════════════════════════════════════════════════════════
# templates/dashboard.html
# ═══════════════════════════════════════════════════════════════
cat > templates/dashboard.html <<'FILE_EOF'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پنل کاربری</title>
    <link rel="stylesheet" href="/static/style.css">
    <link rel="stylesheet" href="/static/dashboard.css">
</head>
<body>
<div class="dashboard-layout">
    <aside class="sidebar">
        <div class="sidebar-header">
            <span class="logo-icon">🐧</span>
            <h2>Dashboard</h2>
        </div>
        <nav class="sidebar-nav">
            <a href="/dashboard" class="nav-item active">📊 نمای کلی</a>
            <a href="/" class="nav-item">📚 لیست آزمون‌ها</a>
            <a href="/create" class="nav-item">🛠️ ساخت آزمون</a>
            <a href="#" class="nav-item" id="btnExport">💾 خروجی داده‌ها</a>
        </nav>
        <div class="sidebar-footer">
            <button class="btn btn-danger btn-sm" id="btnResetAll">🗑️ پاک کردن همه</button>
        </div>
    </aside>

    <main class="main-content">
        <header class="dashboard-header">
            <div>
                <h1>خوش آمدید 👋</h1>
                <p class="subtitle">خلاصه عملکرد شما در آزمون‌ها</p>
            </div>
            <a href="/" class="btn btn-primary">شروع آزمون →</a>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(59,130,246,0.15);color:#3b82f6;">📝</div>
                <div class="stat-info">
                    <span class="stat-value" id="totalQuizzesTaken">0</span>
                    <span class="stat-label">آزمون شرکت‌شده</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(34,197,94,0.15);color:#22c55e;">✅</div>
                <div class="stat-info">
                    <span class="stat-value" id="totalQuestionsAnswered">0</span>
                    <span class="stat-label">پاسخ داده‌شده</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(245,158,11,0.15);color:#f59e0b;">🎯</div>
                <div class="stat-info">
                    <span class="stat-value" id="overallAccuracy">—</span>
                    <span class="stat-label">میانگین دقت</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background:rgba(244,63,94,0.15);color:#f43f5e;">⭐</div>
                <div class="stat-info">
                    <span class="stat-value" id="totalBookmarks">0</span>
                    <span class="stat-label">نشان‌شده‌ها</span>
                </div>
            </div>
        </div>

        <div class="dashboard-grid">
            <div class="panel-card">
                <div class="panel-header"><h3>📈 پیشرفت در آزمون‌ها</h3></div>
                <div id="recentActivity" class="activity-list"></div>
            </div>
            <div class="panel-card">
                <div class="panel-header"><h3>⚠️ نیاز به مرور</h3></div>
                <div id="weakAreas" class="weak-areas-list"></div>
            </div>
        </div>
    </main>
</div>

<script src="/static/js/sanitize.js"></script>
<script src="/static/js/dashboard_page.js"></script>
</body>
</html>
FILE_EOF
echo "  ✓ templates/dashboard.html"

# ═══════════════════════════════════════════════════════════════
# static/js/quiz_page.js
# ═══════════════════════════════════════════════════════════════
cat > static/js/quiz_page.js <<'FILE_EOF'
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
FILE_EOF
echo "  ✓ static/js/quiz_page.js"

# ═══════════════════════════════════════════════════════════════
# static/js/create_page.js
# ═══════════════════════════════════════════════════════════════
cat > static/js/create_page.js <<'FILE_EOF'
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
FILE_EOF
echo "  ✓ static/js/create_page.js"

# ═══════════════════════════════════════════════════════════════
# static/js/dashboard_page.js
# ═══════════════════════════════════════════════════════════════
cat > static/js/dashboard_page.js <<'FILE_EOF'
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
FILE_EOF
echo "  ✓ static/js/dashboard_page.js"

# ═══════════════════════════════════════════════════════════════
# Verify
# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════"
echo " ✅ All files written successfully!"
echo "═══════════════════════════════════════════════════"
echo ""
echo " Now run:"
echo "   bash run.sh"
echo ""
echo " Or manually:"
echo "   python3 -m venv venv && source venv/bin/activate"
echo "   pip install -r requirements.txt"
echo "   python server.py"
echo ""
