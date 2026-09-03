// جمع‌آوری تمام داده‌ها از localStorage
function aggregateUserData() {
    let totalQuizzes = new Set();
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalAnswered = 0;
    let totalBookmarks = 0;
    
    let quizStats = [];
    let categoryWrongCounts = {};

    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        
        // استخراج آمار هر آزمون
        if (key.startsWith('lpic_') && key.endsWith('_stats')) {
            let quizName = key.replace('lpic_', '').replace('_stats', '');
            totalQuizzes.add(quizName);
            
            let stats = JSON.parse(localStorage.getItem(key));
            totalCorrect += stats.correct;
            totalWrong += stats.wrong;
            totalAnswered += stats.totalAnswered;
            
            quizStats.push({
                name: quizName,
                correct: stats.correct,
                wrong: stats.wrong,
                total: stats.totalAnswered,
                accuracy: stats.totalAnswered > 0 ? Math.round((stats.correct / stats.totalAnswered) * 100) : 0
            });
        }
        
        // استخراج بوک‌مارک‌ها
        if (key.startsWith('lpic_') && key.endsWith('_bookmarks')) {
            let bookmarks = JSON.parse(localStorage.getItem(key));
            totalBookmarks += bookmarks.length;
        }

        // استخراج پاسخ‌ها برای تحلیل نقاط ضعف
        if (key.startsWith('lpic_') && key.endsWith('_answers')) {
            let quizName = key.replace('lpic_', '').replace('_answers', '');
            let answers = JSON.parse(localStorage.getItem(key));
            
            // برای پیدا کردن نام دسته‌بندی، نیاز به داده‌های آزمون داریم
            // اینجا یک تقریب می‌زنیم یا از کوئری API استفاده می‌کنیم
        }
    }

    return {
        totalQuizzes: totalQuizzes.size,
        totalCorrect,
        totalWrong,
        totalAnswered,
        totalBookmarks,
        overallAccuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
        quizStats: quizStats.sort((a, b) => b.total - a.total) // مرتب‌سازی بر اساس بیشترین فعالیت
    };
}

// رندر کردن داشبورد
function renderDashboard() {
    const data = aggregateUserData();

    // به‌روزرسانی کارت‌های آمار
    document.getElementById('totalQuizzesTaken').innerText = data.totalQuizzes;
    document.getElementById('totalQuestionsAnswered').innerText = data.totalAnswered;
    document.getElementById('overallAccuracy').innerText = data.overallAccuracy + '%';
    document.getElementById('totalBookmarks').innerText = data.totalBookmarks;

    // رندر فعالیت‌های اخیر
    const activityContainer = document.getElementById('recentActivity');
    if (data.quizStats.length === 0) {
        activityContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-tertiary);">هنوز در هیچ آزمونی شرکت نکرده‌اید.</div>';
    } else {
        activityContainer.innerHTML = data.quizStats.slice(0, 5).map(quiz => {
            let scoreClass = quiz.accuracy >= 70 ? 'score-high' : (quiz.accuracy >= 40 ? 'score-mid' : 'score-low');
            return `
                <div class="activity-item">
                    <div class="activity-info">
                        <h4>آزمون: ${quiz.name.replace(/_/g, ' ')}</h4>
                        <span>${quiz.correct} صحیح | ${quiz.wrong} غلط | مجموع: ${quiz.total} سوال</span>
                    </div>
                    <div class="activity-score ${scoreClass}">
                        ${quiz.accuracy}%
                    </div>
                </div>
            `;
        }).join('');
    }

    // تحلیل نقاط ضعف (شبیه‌سازی بر اساس داده‌های موجود)
    // در یک پیاده‌سازی پیشرفته‌تر، می‌توانیم دسته‌بندی‌هایی که بیشترین غلط را داشته‌اند استخراج کنیم
    const weakContainer = document.getElementById('weakAreas');
    if (data.totalWrong === 0) {
        weakContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--success);">🎉 عالی! هیچ پاسخ غلطی ثبت نشده است.</div>';
    } else {
        // نمایش یک پیام کلی از آنجایی که تحلیل دقیق دسته‌بندی نیاز به بارگذاری تمام JSONها دارد
        weakContainer.innerHTML = `
            <div class="weak-item">
                <span>مجموع پاسخ‌های غلط</span>
                <span style="color: var(--error); font-weight: bold;">${data.totalWrong} مورد</span>
            </div>
            <div class="weak-bar">
                <div class="weak-bar-fill" style="width: ${Math.min((data.totalWrong / data.totalAnswered) * 100, 100)}%"></div>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 12px;">
                💡 پیشنهاد: از دکمه "مرور غلط‌ها" در هر آزمون استفاده کنید تا نقاط ضعف خود را برطرف نمایید.
            </p>
        `;
    }
}

// توابع کمکی
function resetAllData() {
    if (confirm('⚠️ آیا مطمئنید؟ تمام پیشرفت‌ها، بوک‌مارک‌ها و آمار شما برای همیشه پاک خواهد شد.')) {
        let keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith('lpic_')) {
                keysToDelete.push(localStorage.key(i));
            }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
        alert('✅ تمام داده‌ها با موفقیت پاک شدند.');
        window.location.reload();
    }
}

function exportData() {
    let exportObj = {};
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith('lpic_')) {
            exportObj[key] = JSON.parse(localStorage.getItem(key));
        }
    }
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    let downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "lpic_quiz_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// اجرا هنگام لود صفحه
document.addEventListener('DOMContentLoaded', renderDashboard);
