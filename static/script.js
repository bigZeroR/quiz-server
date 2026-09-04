let currentQuestionIndex = 0;
let filteredQuestions = [...QUIZ_DATA.questions];
const STORAGE_PREFIX = `lpic_${QUIZ_NAME}_`;
let userAnswers = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'answers')) || {};
let bookmarks = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'bookmarks')) || [];
let stats = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'stats')) || { correct: 0, wrong: 0, totalAnswered: 0 };

// ═══════════════════════════════════════════
// AI ADAPTIVE MODE VARIABLES
// ═══════════════════════════════════════════
let isAdaptiveMode = typeof IS_ADAPTIVE_MODE !== 'undefined' ? IS_ADAPTIVE_MODE : false;
let adaptiveLevel = 2;
let questionStartTime = 0;
let timerInterval = null;
let adaptiveHistory = [];
let usedQuestionIds = new Set();

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function init() {
    if (typeof SEARCH_QUERY !== 'undefined' && SEARCH_QUERY) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = SEARCH_QUERY;
            searchQuestions();
        }
        const hash = window.location.hash;
        if (hash.startsWith('#q-')) {
            const qId = parseInt(hash.replace('#q-', ''));
            setTimeout(() => {
                const index = filteredQuestions.findIndex(q => q.id === qId);
                if (index !== -1) {
                    showQuestion(index);
                }
            }, 500);
        }
    }

    if (isAdaptiveMode) {
        setupAdaptiveMode();
    } else {
        renderCategories();
        renderQuestions();
        updateStats();
        showQuestion(0);
    }
}

// ═══════════════════════════════════════════
// ADAPTIVE MODE LOGIC
// ═══════════════════════════════════════════
function setupAdaptiveMode() {
    const timerStat = document.getElementById('aiTimerStat');
    const levelStat = document.getElementById('aiLevelStat');
    const aiBadge = document.getElementById('aiBadge');
    if (timerStat) timerStat.style.display = 'flex';
    if (levelStat) levelStat.style.display = 'flex';
    if (aiBadge) aiBadge.style.display = 'inline-block';
    
    const answeredIds = new Set(Object.keys(userAnswers).map(Number));
    answeredIds.forEach(id => usedQuestionIds.add(id));
    
    const availableQuestions = QUIZ_DATA.questions.filter(q => !answeredIds.has(q.id));
    
    if (availableQuestions.length === 0) {
        showToast('🎉 شما به تمام سوالات این آزمون پاسخ داده‌اید!', 'success');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }
    
    const initialQuestions = [];
    for (let lvl = 1; lvl <= 4; lvl++) {
        const pool = availableQuestions.filter(q => q.level == lvl && !usedQuestionIds.has(q.id));
        if (pool.length > 0) {
            const randomQ = pool[Math.floor(Math.random() * pool.length)];
            initialQuestions.push(randomQ);
            usedQuestionIds.add(randomQ.id);
        }
    }
    
    const remaining = availableQuestions.filter(q => !usedQuestionIds.has(q.id));
    filteredQuestions = [...initialQuestions, ...remaining];
    
    if (filteredQuestions.length === 0) {
        showToast('⚠️ هیچ سوال جدیدی برای نمایش وجود ندارد.', 'warning');
        setTimeout(() => window.location.href = '/', 2000);
        return;
    }
    
    renderQuestions();
    updateStats();
    updateRemainingCount();
    showQuestion(0);
}

function updateRemainingCount() {
    const remaining = filteredQuestions.filter(q => !usedQuestionIds.has(q.id)).length;
    const el = document.getElementById('remainingCount');
    const parent = document.getElementById('remainingStat');
    if (el) el.innerText = remaining;
    if (parent) parent.style.display = 'flex';
}

function startTimer() {
    questionStartTime = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
        const timerEl = document.getElementById('aiTimer');
        if (timerEl) timerEl.innerText = `${elapsed}s`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    return Math.floor((Date.now() - questionStartTime) / 1000);
}

function calculateNextAdaptiveLevel(isCorrect, timeTaken) {
    let scoreChange = 0;
    
    if (isCorrect) {
        if (timeTaken <= 10) scoreChange = 2;
        else if (timeTaken <= 20) scoreChange = 1;
        else scoreChange = 0;
    } else {
        scoreChange = -1;
    }

    let feedback = "";
    let feedbackClass = "";

    if (scoreChange >= 1) {
        adaptiveLevel = Math.min(4, adaptiveLevel + 1);
        feedback = "🚀 عملکرد عالی! سطح دشواری افزایش یافت.";
        feedbackClass = "up";
    } else if (scoreChange <= -1) {
        adaptiveLevel = Math.max(1, adaptiveLevel - 1);
        feedback = "📉 سطح دشواری برای تثبیت یادگیری کاهش یافت.";
        feedbackClass = "down";
    } else {
        feedback = "⚖️ سطح دشواری حفظ شد.";
        feedbackClass = "same";
    }

    adaptiveHistory.push({ level: adaptiveLevel, correct: isCorrect, time: timeTaken });
    
    const expDiv = document.getElementById(`exp-${currentQuestionIndex}`);
    if (expDiv) {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = `ai-feedback ${feedbackClass}`;
        feedbackDiv.innerText = `${feedback} (زمان: ${timeTaken}s | سطح بعدی: ${adaptiveLevel})`;
        expDiv.appendChild(feedbackDiv);
    }

    const levelEl = document.getElementById('aiCurrentLevel');
    if (levelEl) levelEl.innerText = `Level ${adaptiveLevel}`;
    
    findNextAdaptiveQuestion();
}

function findNextAdaptiveQuestion() {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= filteredQuestions.length) return;

    let foundIndex = -1;
    for (let i = nextIndex; i < filteredQuestions.length; i++) {
        if (filteredQuestions[i].level == adaptiveLevel && !usedQuestionIds.has(filteredQuestions[i].id)) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex === -1) {
        for (let i = nextIndex; i < filteredQuestions.length; i++) {
            if (!usedQuestionIds.has(filteredQuestions[i].id)) {
                foundIndex = i;
                adaptiveLevel = filteredQuestions[i].level;
                const levelEl = document.getElementById('aiCurrentLevel');
                if (levelEl) levelEl.innerText = `Level ${adaptiveLevel} (Fallback)`;
                break;
            }
        }
    }

    if (foundIndex !== -1) {
        const temp = filteredQuestions[nextIndex];
        filteredQuestions[nextIndex] = filteredQuestions[foundIndex];
        filteredQuestions[foundIndex] = temp;
        usedQuestionIds.add(filteredQuestions[nextIndex].id);
        updateRemainingCount();
    } else {
        showToast('🎉 شما به تمام سوالات پاسخ داده‌اید!', 'success');
        setTimeout(() => window.location.href = '/', 2000);
    }
}

// ═══════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════
function renderCategories() {
    if (isAdaptiveMode) return;
    const categories = ["all", ...new Set(QUIZ_DATA.questions.map(q => q.category))];
    const container = document.getElementById('categoryFilter');
    if (!container) return;
    container.innerHTML = categories.map((cat, i) =>
        `<button class="category-btn ${i === 0 ? 'active' : ''}" onclick="filterCategory('${cat}', this)">${cat === 'all' ? '📋 همه' : cat}</button>`
    ).join('');
}

function filterCategory(category, btn) {
    if (isAdaptiveMode) return;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filteredQuestions = category === "all" ? [...QUIZ_DATA.questions] : QUIZ_DATA.questions.filter(q => q.category === category);
    currentQuestionIndex = 0;
    renderQuestions();
    showQuestion(0);
}

function searchQuestions() {
    if (isAdaptiveMode) return;
    const query = document.getElementById('searchInput').value.toLowerCase();
    if (!query) {
        filteredQuestions = [...QUIZ_DATA.questions];
    } else {
        filteredQuestions = QUIZ_DATA.questions.filter(q => 
            q.text.toLowerCase().includes(query) || 
            q.category.toLowerCase().includes(query) ||
            (q.explanation && q.explanation.toLowerCase().includes(query))
        );
    }
    currentQuestionIndex = 0;
    renderQuestions();
    showQuestion(0);
}

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    const totalQEl = document.getElementById('totalQ');
    if (totalQEl) totalQEl.innerText = filteredQuestions.length;

    if (filteredQuestions.length === 0) {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) emptyState.style.display = 'block';
        if (container) container.innerHTML = '';
        return;
    }
    
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';

    const letters = ['A', 'B', 'C', 'D'];
    if (!container) return;
    
    container.innerHTML = filteredQuestions.map((q, index) => {
        let commandHtml = (QUIZ_TYPE === 'command' && q.command) ? `<div class="command-block"><span class="prompt">$</span> <code>${escapeHtml(q.command)}</code></div>` : '';
        let exampleHtml = (QUIZ_TYPE === 'command' && q.example) ? `<div class="example-block"><strong>مثال</strong> <code>${escapeHtml(q.example)}</code></div>` : '';
        const isBookmarked = bookmarks.includes(q.id);
        
        let aiIndicator = isAdaptiveMode ? `<div class="ai-difficulty-indicator level-${q.level}">Level ${q.level}</div>` : '';
        
        // نمایش دکمه‌های ویرایش و حذف فقط پس از پاسخ دادن
        const editDeleteButtons = userAnswers[q.id] !== undefined ? `
            <button class="edit-btn" onclick="openEditModal(${q.id})" title="ویرایش سوال" style="background:transparent; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer; transition:all var(--transition-fast); padding:0 4px; line-height:1;">✏️</button>
            <button class="delete-btn" onclick="deleteQuestion(${q.id})" title="حذف این سوال" style="background:transparent; border:none; color:var(--text-muted); font-size:1.2rem; cursor:pointer; transition:all var(--transition-fast); padding:0 4px; line-height:1;">🗑️</button>
        ` : '';

        return `
        <div class="question-card ${index === currentQuestionIndex ? 'active' : ''}" id="q-card-${index}">
            ${aiIndicator}
            <div class="q-header">
                <div style="display:flex; gap:8px; align-items:center;">
                    <span class="q-badge">${q.category} • L${q.level}</span>
                    <span class="q-badge">#${index + 1} / ${filteredQuestions.length}</span>
                </div>
                <div style="display:flex; gap:4px; align-items:center;">
                    <button class="ai-explain-btn" onclick="askAIExplanation(${q.id}, this)" title="دریافت توضیح هوشمند با AI">🤖</button>
                    <button class="bookmark-btn ${isBookmarked ? 'active' : ''}" onclick="toggleBookmark(${q.id}, this)" title="نشان کردن">⭐</button>
                    ${editDeleteButtons}
                </div>
            </div>
            <div class="q-text">${q.text}</div>
            ${commandHtml}
            ${exampleHtml}
            <div class="options">
                ${q.options.map((opt, optIndex) => `
                    <div class="option ${getUserOptionClass(index, optIndex, q.correct)}" 
                         data-letter="${letters[optIndex]}"
                         onclick="selectOption(${index}, ${optIndex}, ${q.correct})"
                         id="opt-${index}-${optIndex}">
                        ${opt}
                    </div>
                `).join('')}
            </div>
            <div class="explanation ${userAnswers[q.id] !== undefined ? 'show' : ''}" id="exp-${index}">
                <strong>💡 توضیح:</strong> ${q.explanation}
            </div>
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function toggleBookmark(qId, btn) {
    const index = bookmarks.indexOf(qId);
    if (index > -1) {
        bookmarks.splice(index, 1);
        btn.classList.remove('active');
        showToast('از نشان‌ها حذف شد', 'info');
    } else {
        bookmarks.push(qId);
        btn.classList.add('active');
        showToast('به نشان‌ها اضافه شد', 'success');
    }
    localStorage.setItem(STORAGE_PREFIX + 'bookmarks', JSON.stringify(bookmarks));
}

function getUserOptionClass(qIndex, optIndex, correctIndex) {
    const qId = filteredQuestions[qIndex].id;
    if (userAnswers[qId] === undefined) return '';
    if (optIndex === correctIndex) return 'correct disabled';
    if (userAnswers[qId] === optIndex && optIndex !== correctIndex) return 'wrong disabled';
    return 'disabled';
}

function selectOption(qIndex, optIndex, correctIndex) {
    const qId = filteredQuestions[qIndex].id;
    if (userAnswers[qId] !== undefined) return;

    userAnswers[qId] = optIndex;
    localStorage.setItem(STORAGE_PREFIX + 'answers', JSON.stringify(userAnswers));

    const isCorrect = (optIndex === correctIndex);
    const timeTaken = isAdaptiveMode ? stopTimer() : 0;

    const options = document.querySelectorAll(`#q-card-${qIndex} .option`);
    options.forEach((opt, idx) => {
        opt.classList.add('disabled');
        if (idx === correctIndex) opt.classList.add('correct');
        if (idx === optIndex && idx !== correctIndex) {
            opt.classList.add('wrong');
            const card = document.getElementById(`q-card-${qIndex}`);
            if (card) {
                card.classList.add('shake');
                setTimeout(() => card.classList.remove('shake'), 500);
            }
        }
    });

    if (isCorrect) stats.correct++;
    else stats.wrong++;
    stats.totalAnswered++;
    localStorage.setItem(STORAGE_PREFIX + 'stats', JSON.stringify(stats));

    const expDiv = document.getElementById(`exp-${qIndex}`);
    if (expDiv) expDiv.classList.add('show');
    
    updateStats();

    if (isAdaptiveMode && adaptiveHistory.length >= 4) {
        calculateNextAdaptiveLevel(isCorrect, timeTaken);
    }
    
    // Re-render current question to show edit/delete buttons
    renderQuestions();
    showQuestion(currentQuestionIndex);
}

function showQuestion(index) {
    if (index < 0 || index >= filteredQuestions.length) return;
    currentQuestionIndex = index;
    document.querySelectorAll('.question-card').forEach((card, idx) => card.classList.toggle('active', idx === index));
    
    const currentQEl = document.getElementById('currentQ');
    if (currentQEl) currentQEl.innerText = index + 1;
    
    updateProgressBar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (isAdaptiveMode && userAnswers[filteredQuestions[index].id] === undefined) {
        startTimer();
    }
}

function nextQuestion() { if (currentQuestionIndex < filteredQuestions.length - 1) showQuestion(currentQuestionIndex + 1); }
function prevQuestion() { if (currentQuestionIndex > 0) showQuestion(currentQuestionIndex - 1); }
function showRandomQuestion() { showQuestion(Math.floor(Math.random() * filteredQuestions.length)); }

function showWrongOnes() {
    if (isAdaptiveMode) {
        showToast("مرور غلط‌ها در حالت هوشمند غیرفعال است.", "warning");
        return;
    }
    const wrongQuestions = QUIZ_DATA.questions.filter(q => userAnswers[q.id] !== undefined && userAnswers[q.id] !== q.correct);
    if (wrongQuestions.length === 0) { showToast("🎉 هیچ پاسخ غلطی ندارید! آفرین!", "success"); return; }
    filteredQuestions = wrongQuestions;
    currentQuestionIndex = 0;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    renderQuestions();
    showQuestion(0);
    showToast(`${wrongQuestions.length} سوال غلط پیدا شد`, 'warning');
}

function showBookmarks() {
    if (bookmarks.length === 0) { showToast("هنوز سوالی را نشان نکرده‌اید", "info"); return; }
    filteredQuestions = QUIZ_DATA.questions.filter(q => bookmarks.includes(q.id));
    currentQuestionIndex = 0;
    document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
    renderQuestions();
    showQuestion(0);
    showToast(`نمایش ${bookmarks.length} سوال نشان‌شده`, 'success');
}

function resetAll() {
    if (!confirm("آیا مطمئنید؟ تمام پیشرفت شما پاک خواهد شد.")) return;
    localStorage.removeItem(STORAGE_PREFIX + 'answers');
    localStorage.removeItem(STORAGE_PREFIX + 'stats');
    localStorage.removeItem(STORAGE_PREFIX + 'bookmarks');
    userAnswers = {}; bookmarks = []; stats = { correct: 0, wrong: 0, totalAnswered: 0 };
    
    adaptiveLevel = 2;
    adaptiveHistory = [];
    usedQuestionIds.clear();
    isAdaptiveMode = false;
    window.location.href = '/';
}

function updateStats() {
    const correctEl = document.getElementById('correctCount');
    const wrongEl = document.getElementById('wrongCount');
    const progressEl = document.getElementById('progressPercent');
    
    if (correctEl) correctEl.innerText = stats.correct;
    if (wrongEl) wrongEl.innerText = stats.wrong;
    
    const total = QUIZ_DATA.questions.length;
    const percent = total > 0 ? Math.round((stats.totalAnswered / total) * 100) : 0;
    if (progressEl) progressEl.innerText = percent + "%";
    
    updateProgressBar();
}

function updateProgressBar() {
    const len = filteredQuestions.length;
    const percent = len > 0 ? ((currentQuestionIndex + 1) / len) * 100 : 0;
    const bar = document.getElementById('progressBar');
    if (bar) bar.style.width = percent + "%";
}

// ═══════════════════════════════════════════
// AI EXPLANATION
// ═══════════════════════════════════════════
function askAIExplanation(qId, btn) {
    const question = QUIZ_DATA.questions.find(q => q.id === qId);
    if (!question) {
        showToast('سوال پیدا نشد!', 'error');
        return;
    }
    
    const prompt = `(نقش: تو یک مدرس حرفه‌ای لینوکس و شبکه هستی. لطفاً سوال زیر را به طور کامل و دقیق توضیح بده، چرا گزینه صحیح درست است و چرا گزینه‌های دیگر غلط هستند. پاسخ را به فارسی بنویس و از مثال‌های عملی استفاده کن.)

سوال:
${question.text}

گزینه‌ها:
${question.options.map((opt, i) => `${['A','B','C','D'][i]}. ${opt}`).join('\n')}

پاسخ صحیح: ${['A','B','C','D'][question.correct]}

توضیح جامع و آموزنده:`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(prompt).then(() => {
            const originalText = btn.innerText;
            btn.innerText = '✅ کپی!';
            btn.style.color = 'var(--success)';
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.color = '';
            }, 2500);
            showToast('پرامپت توضیح با AI در کلیپ‌بورد کپی شد. حالا در ChatGPT/Claude پیست کنید.', 'success');
        }).catch(() => {
            fallbackCopy(prompt, btn);
        });
    } else {
        fallbackCopy(prompt, btn);
    }
}

function fallbackCopy(text, btn) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        const originalText = btn.innerText;
        btn.innerText = '✅ کپی!';
        btn.style.color = 'var(--success)';
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.color = '';
        }, 2500);
        showToast('پرامپت توضیح با AI کپی شد (روش جایگزین).', 'success');
    } catch (e) {
        showToast('خطا در کپی کردن. لطفاً دستی کپی کنید.', 'error');
    }
    document.body.removeChild(textarea);
}

// ═══════════════════════════════════════════
// EDIT & DELETE FUNCTIONS
// ═══════════════════════════════════════════

function openEditModal(qId) {
    const question = QUIZ_DATA.questions.find(q => q.id === qId);
    if (!question) {
        showToast('سوال پیدا نشد!', 'error');
        return;
    }
    
    document.getElementById('editQuestionId').value = qId;
    document.getElementById('editQuizName').value = QUIZ_NAME;
    document.getElementById('editText').value = question.text;
    document.getElementById('editCategory').value = question.category || '';
    document.getElementById('editLevel').value = question.level || 1;
    document.getElementById('editOpt0').value = question.options[0] || '';
    document.getElementById('editOpt1').value = question.options[1] || '';
    document.getElementById('editOpt2').value = question.options[2] || '';
    document.getElementById('editOpt3').value = question.options[3] || '';
    document.getElementById('editExplanation').value = question.explanation || '';
    
    const radios = document.querySelectorAll('input[name="editCorrect"]');
    radios.forEach(r => r.checked = false);
    if (radios[question.correct]) radios[question.correct].checked = true;
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

function saveEditedQuestion(event) {
    event.preventDefault();
    
    const qId = parseInt(document.getElementById('editQuestionId').value);
    const quizName = document.getElementById('editQuizName').value;
    const text = document.getElementById('editText').value.trim();
    const category = document.getElementById('editCategory').value.trim() || 'عمومی';
    const level = parseInt(document.getElementById('editLevel').value) || 1;
    const options = [
        document.getElementById('editOpt0').value.trim(),
        document.getElementById('editOpt1').value.trim(),
        document.getElementById('editOpt2').value.trim(),
        document.getElementById('editOpt3').value.trim()
    ].filter(opt => opt.length > 0);
    const correct = parseInt(document.querySelector('input[name="editCorrect"]:checked')?.value ?? 0);
    const explanation = document.getElementById('editExplanation').value.trim() || 'توضیحی ثبت نشده است.';
    
    if (!text || options.length < 2) {
        showToast('متن سوال و حداقل دو گزینه الزامی است.', 'error');
        return;
    }
    
    const updatedQuestion = {
        id: qId,
        category: category,
        level: level,
        text: text,
        options: options,
        correct: correct >= options.length ? 0 : correct,
        explanation: explanation
    };
    
    fetch('/api/edit_question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quiz_name: quizName,
            question_id: qId,
            question: updatedQuestion
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('✅ سوال با موفقیت ویرایش شد!', 'success');
            closeEditModal();
            
            const index = QUIZ_DATA.questions.findIndex(q => q.id === qId);
            if (index !== -1) QUIZ_DATA.questions[index] = updatedQuestion;
            
            const fIndex = filteredQuestions.findIndex(q => q.id === qId);
            if (fIndex !== -1) filteredQuestions[fIndex] = updatedQuestion;
            
            renderQuestions();
            updateStats();
            
            if (userAnswers[qId] !== undefined) {
                const optionsEl = document.querySelectorAll(`#q-card-${currentQuestionIndex} .option`);
                optionsEl.forEach((opt, idx) => {
                    opt.classList.remove('correct', 'wrong', 'disabled');
                    if (idx === updatedQuestion.correct) {
                        opt.classList.add('correct', 'disabled');
                    }
                    if (userAnswers[qId] === idx && idx !== updatedQuestion.correct) {
                        opt.classList.add('wrong', 'disabled');
                    }
                    if (userAnswers[qId] !== idx && idx !== updatedQuestion.correct) {
                        opt.classList.add('disabled');
                    }
                });
            }
        } else {
            showToast('❌ خطا: ' + data.error, 'error');
        }
    })
    .catch(() => showToast('❌ خطا در ارتباط با سرور', 'error'));
}

function deleteQuestion(qId) {
    if (!confirm('⚠️ آیا مطمئنید که می‌خواهید این سوال را حذف کنید؟\nاین عمل غیرقابل بازگشت است.')) return;
    
    fetch('/api/delete_question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quiz_name: QUIZ_NAME,
            question_id: qId
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast('✅ سوال با موفقیت حذف شد!', 'success');
            
            const index = QUIZ_DATA.questions.findIndex(q => q.id === qId);
            if (index !== -1) {
                QUIZ_DATA.questions.splice(index, 1);
                QUIZ_DATA.questions.forEach((q, i) => q.id = i + 1);
            }
            
            const fIndex = filteredQuestions.findIndex(q => q.id === qId);
            if (fIndex !== -1) {
                filteredQuestions.splice(fIndex, 1);
                filteredQuestions.forEach((q, i) => q.id = i + 1);
            }
            
            delete userAnswers[qId];
            localStorage.setItem(STORAGE_PREFIX + 'answers', JSON.stringify(userAnswers));
            
            renderQuestions();
            updateStats();
            
            if (currentQuestionIndex >= filteredQuestions.length) {
                currentQuestionIndex = filteredQuestions.length - 1;
            }
            if (currentQuestionIndex >= 0) {
                showQuestion(currentQuestionIndex);
            } else {
                window.location.reload();
            }
        } else {
            showToast('❌ خطا: ' + data.error, 'error');
        }
    })
    .catch(() => showToast('❌ خطا در ارتباط با سرور', 'error'));
}

document.addEventListener('click', function(e) {
    const modal = document.getElementById('editModal');
    if (e.target === modal) closeEditModal();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeEditModal();
});

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') nextQuestion();
    if (e.key === 'ArrowRight') prevQuestion();
    if (e.key === 'r' && e.ctrlKey) { e.preventDefault(); showRandomQuestion(); }
});

let touchStartX = 0;
document.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
document.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(diff) > 60) {
        if (diff > 0) nextQuestion();
        else prevQuestion();
    }
}, { passive: true });

if (typeof QUIZ_DATA !== 'undefined') {
    init();
}
