/* API client - all fetches go through here. */
(function (global) {
  'use strict';

  const BASE = '/api/v1';

  async function request(path, opts = {}) {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts,
    });
    let body = null;
    try { body = await res.json(); } catch (_) { /* ignore */ }
    if (!res.ok) {
      const msg = (body && body.error) || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.code = body && body.code;
      throw err;
    }
    return body;
  }

  const API = {
    listQuizzes: (reload) => request(`${BASE}/quizzes${reload ? '?reload=1' : ''}`),
    getQuiz: (name) => request(`${BASE}/quizzes/${encodeURIComponent(name)}`),
    categories: (name) => request(`${BASE}/quizzes/${encodeURIComponent(name)}/categories`),
    saveQuiz: (name, data) => request(`${BASE}/quizzes/${encodeURIComponent(name)}`, {
      method: 'POST', body: JSON.stringify(data),
    }),
    updateQuestion: (name, id, data) => request(
      `${BASE}/quizzes/${encodeURIComponent(name)}/questions/${encodeURIComponent(id)}`,
      { method: 'PUT', body: JSON.stringify(data) }
    ),
    deleteQuestion: (name, id) => request(
      `${BASE}/quizzes/${encodeURIComponent(name)}/questions/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    ),
    search: (q) => request(`${BASE}/search?q=${encodeURIComponent(q)}`),
    createSession: (text, title) => request(`${BASE}/sessions`, {
      method: 'POST', body: JSON.stringify({ text, title }),
    }),
    getSession: (sid) => request(`${BASE}/sessions/${sid}`),
    aiGenerate: (sid, targetCount, existingCategories) => request(`${BASE}/ai/generate`, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sid,
        target_count: targetCount || 10,
        existing_categories: existingCategories || [],
      }),
    }),
    aiValidate: (quiz) => request(`${BASE}/ai/validate`, {
      method: 'POST', body: JSON.stringify({ quiz }),
    }),
    listDevices: () => request(`${BASE}/audio/devices`),
    startRecording: (name, deviceId, preset, format) => request(`${BASE}/audio/record/start`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        device_id: deviceId || '',
        preset: preset || 'general',
        format: format || 'mp3',
      }),
    }),
    stopRecording: () => request(`${BASE}/audio/record/stop`, { method: 'POST' }),
    listAudioFiles: () => request(`${BASE}/audio/files`),
    deleteAudio: (filename) => request(`${BASE}/audio/files/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    }),
  };

  global.API = API;
})(window);
