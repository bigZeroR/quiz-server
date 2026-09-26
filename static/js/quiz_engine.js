/* Quiz Engine - core quiz runtime state and logic. */
(function (global) {
  'use strict';

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  class QuizEngine {
    constructor(quizData, { storagePrefix, adaptive = false }) {
      this.quiz = quizData;
      this.storagePrefix = storagePrefix;
      this.adaptive = adaptive;

      this.userAnswers = JSON.parse(localStorage.getItem(storagePrefix + 'answers')) || {};
      this.bookmarks = new Set(JSON.parse(localStorage.getItem(storagePrefix + 'bookmarks')) || []);
      this.adaptiveHistory = [];
      this.usedIds = new Set(Object.keys(this.userAnswers).map(String));

      this.filtered = [...this.quiz.questions];
      this.index = 0;
      this.adaptiveLevel = 2;
      this.questionStartTime = 0;
    }

    filterByCategory(cat) {
      this.filtered = cat && cat !== 'all'
        ? this.quiz.questions.filter(q => (q.category || 'عمومی') === cat)
        : [...this.quiz.questions];
      this.index = 0;
    }

    search(query) {
      const q = (query || '').toLowerCase();
      this.filtered = !q ? [...this.quiz.questions] : this.quiz.questions.filter(item => {
        const blob = [item.text, item.category, item.explanation, (item.options || []).join(' ')]
          .join(' ').toLowerCase();
        return blob.includes(q);
      });
      this.index = 0;
    }

    wrongQuestions() {
      return this.quiz.questions.filter(q =>
        this.userAnswers[q.id] !== undefined && this.userAnswers[q.id] !== q.correct);
    }

    bookmarkedQuestions() {
      return this.quiz.questions.filter(q => this.bookmarks.has(q.id));
    }

    get current() { return this.filtered[this.index]; }
    get total() { return this.filtered.length; }

    next() { if (this.index < this.total - 1) this.index++; return this.current; }
    prev() { if (this.index > 0) this.index--; return this.current; }
    goTo(i) { if (i >= 0 && i < this.total) this.index = i; return this.current; }
    random() { this.index = Math.floor(Math.random() * this.total); return this.current; }

    answer(qId, optIndex) {
      if (this.userAnswers[qId] !== undefined) return null;
      this.userAnswers[qId] = optIndex;
      localStorage.setItem(this.storagePrefix + 'answers', JSON.stringify(this.userAnswers));
      const q = this.quiz.questions.find(item => item.id === qId);
      const isCorrect = optIndex === q.correct;
      return { isCorrect, correct: q.correct };
    }

    toggleBookmark(qId) {
      if (this.bookmarks.has(qId)) this.bookmarks.delete(qId);
      else this.bookmarks.add(qId);
      localStorage.setItem(this.storagePrefix + 'bookmarks', JSON.stringify([...this.bookmarks]));
      return this.bookmarks.has(qId);
    }

    stats() {
      let correct = 0, wrong = 0;
      for (const q of this.quiz.questions) {
        const a = this.userAnswers[q.id];
        if (a === undefined) continue;
        if (a === q.correct) correct++;
        else wrong++;
      }
      return { correct, wrong, answered: correct + wrong, total: this.quiz.questions.length };
    }

    startAdaptiveTimer() { this.questionStartTime = Date.now(); }
    stopAdaptiveTimer() { return Math.round((Date.now() - this.questionStartTime) / 1000); }

    adaptiveAdjust(isCorrect, timeSeconds) {
      let delta = isCorrect ? (timeSeconds <= 10 ? 2 : timeSeconds <= 20 ? 1 : 0) : -1;
      let feedback;
      if (delta >= 1) { this.adaptiveLevel = Math.min(4, this.adaptiveLevel + 1); feedback = 'up'; }
      else if (delta <= -1) { this.adaptiveLevel = Math.max(1, this.adaptiveLevel - 1); feedback = 'down'; }
      else feedback = 'same';
      this.adaptiveHistory.push({ level: this.adaptiveLevel, correct: isCorrect, time: timeSeconds });
      return { feedback, level: this.adaptiveLevel };
    }

    resetAll() {
      localStorage.removeItem(this.storagePrefix + 'answers');
      localStorage.removeItem(this.storagePrefix + 'bookmarks');
      this.userAnswers = {};
      this.bookmarks.clear();
    }

    static letters() { return letters; }
  }

  global.QuizEngine = QuizEngine;
})(window);
