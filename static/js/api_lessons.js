/* Extends window.API with lesson endpoints. Load AFTER api.js. */
(function () {
  'use strict';
  if (!window.API) {
    console.warn('api_lessons.js: window.API missing — lesson endpoints unavailable');
    return;
  }
  const BASE = '/api/v1/lessons';

  async function req(url, opts) {
    const res = await fetch(url, opts);
    let body = {};
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(body.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  const json = (method, data) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  Object.assign(window.API, {
    listLessons:  () => req(BASE),
    getLesson:    (name) => req(`${BASE}/${encodeURIComponent(name)}`),
    saveLesson:   (name, data) => req(`${BASE}/${encodeURIComponent(name)}`, json('POST', data)),
    updateLesson: (name, data) => req(`${BASE}/${encodeURIComponent(name)}`, json('PUT', data)),
    deleteLesson: (name) => req(`${BASE}/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    lessonForQuiz: (quizName) => req(`${BASE}/by-quiz/${encodeURIComponent(quizName)}`),
    searchLessons: (q) => req(`${BASE}/search?q=${encodeURIComponent(q)}`),
  });
})();
