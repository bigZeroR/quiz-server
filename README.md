<div align="center">

# 🧠 Quiz Server

**Build quizzes, organize lessons, and turn learning material into interactive study experiences.**

A self-hostable Flask learning workspace: quiz management, AI-assisted question generation,
Markdown lessons, audio recording, and local video-to-audio conversion — in one web UI.

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Tests](https://img.shields.io/badge/tests-111%20passing-brightgreen?logo=pytest&logoColor=white)](#testing)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[English](README.md) · [فارسی](README.fa.md)

[Quick Start](#quick-start) · [Features](#features) · [Configuration](#configuration) · [API](#api-reference) · [Testing](#testing) · [Contributing](#contributing)

</div>

---

## Why this exists

Study material usually ends up scattered: questions in one file, notes in another,
recordings somewhere else. Quiz Server puts all of it behind a single local web app
and keeps the data as plain JSON — inspectable, backup-friendly, and versionable.

## Features

- **Quiz management** — create, edit, search, delete quizzes and individual questions.
- **AI-assisted drafting** — generate quiz drafts through any OpenAI-compatible endpoint.
- **Markdown lessons** — structured, section-based lesson documents linked to quizzes.
- **Audio recording** — record, post-process, and manage audio files (via `audio-recorder`).
- **Video → audio** — extract audio tracks from local video files with `ffmpeg`.
- **Persian-first UI** — RTL layout, Vazirmatn font, Persian numerals.
- **Accessible** — WCAG AA contrast, visible focus states, 44 px touch targets.
- **Cross-platform** — Linux, macOS, and Windows launchers included.

## Quick Start

Pick your platform. Each launcher creates a virtual environment, installs
dependencies, seeds `.env` from `.env.example` if missing, and starts the server.

### Linux / macOS

```bash
./scripts/run.sh
```

### Windows (PowerShell)

```powershell
.\scripts\run.ps1
```

### Windows (double-click)

```bat
scripts\run.bat
```

Open <http://127.0.0.1:5000>.

### Manual install

**Prerequisites:** Python 3.10+, `git`, and `ffmpeg` (only for the video feature).

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python server.py
```

## Usage

### Create a quiz in the UI

1. Open `/create`.
2. Fill in the title, then add questions (text, at least two options, correct index).
3. Save — the quiz is written to `data/<slug>.json` and appears on the home page.

### The smallest API example

List every quiz:

```bash
curl http://127.0.0.1:5000/api/v1/quizzes
```

Create one:

```bash
curl -X POST http://127.0.0.1:5000/api/v1/quizzes/my-quiz \
  -H 'Content-Type: application/json' \
  -d '{
        "title": "My Quiz",
        "questions": [
          {"text": "2 + 2?", "options": ["3", "4"], "correct": 1}
        ]
      }'
```

### Extract audio from a local video

```bash
curl -X POST http://127.0.0.1:5000/api/v1/video/extract \
  -H 'Content-Type: application/json' \
  -d '{"path": "/absolute/path/lecture.mp4", "name": "lecture", "format": "mp3"}'
```

The source path must live under `storage/videos` or a directory listed in
`QUIZ_VIDEO_ROOTS`.

## Configuration

All settings are environment variables, read once at startup. Put them in `.env`
(never commit that file). Every key below is also documented in `.env.example`.

| Variable | Type | Default | Required | Description |
|---|---|---|---|---|
| `QUIZ_HOST` | str | `127.0.0.1` | no | Bind address. Use `0.0.0.0` only on a trusted network. |
| `QUIZ_PORT` | int | `5000` | no | HTTP port. |
| `QUIZ_DEBUG` | bool | `0` | no | Werkzeug debugger. **Never enable on a shared network.** |
| `QUIZ_SECRET_KEY` | str | random | no | Session key. Set a stable value to survive restarts. |
| `QUIZ_DATA_DIR` | path | `data` | no | Where quiz JSON files live. |
| `QUIZ_LESSON_DIR` | path | `data/lessons` | no | Where lesson JSON files live. |
| `QUIZ_STORAGE_DIR` | path | `storage` | no | Root for audio, video, uploads, logs. |
| `QUIZ_VIDEO_DIR` | path | `storage/videos` | no | Default directory for the video API. |
| `QUIZ_VIDEO_ROOTS` | csv paths | *(empty)* | no | Extra directories `/api/v1/video/*` may read from. |
| `QUIZ_AUDIO_IMPORT_ROOTS` | csv paths | *(empty)* | no | Directories the audio-import endpoint may copy from. System dirs are always blocked. |
| `QUIZ_MAX_UPLOAD_MB` | int | `64` | no | Maximum request body size. |
| `QUIZ_MAX_AUDIO_SECONDS` | int | `600` | no | Recording length cap. |
| `QUIZ_TEXT_MAX_CHARS` | int | `200000` | no | Cap for AI/session text input. |
| `QUIZ_RATE_LIMIT_PER_MIN` | int | `120` | no | Mutating API requests per minute per IP. `0` disables. |
| `QUIZ_AI_PROVIDER` | str | `openai_compatible` | no | AI backend selector. |
| `QUIZ_AI_BASE_URL` | url | `https://api.openai.com/v1` | no | Any OpenAI-compatible base URL. |
| `QUIZ_AI_API_KEY` | str | *(empty)* | no | Required only if you use the AI endpoints. |
| `QUIZ_AI_MODEL` | str | `gpt-4o-mini` | no | Model name passed to the provider. |
| `QUIZ_AI_TIMEOUT` | int | `60` | no | AI request timeout, seconds. |

**Secrets:** `QUIZ_SECRET_KEY` and `QUIZ_AI_API_KEY` must never be committed.
Generate a key with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## API Reference

Base URL: `http://127.0.0.1:5000`. All endpoints return JSON with a `success`
boolean. Errors carry a `code` and a human-readable `error`.

### Quizzes — `/api/v1`

| Method | Path | Purpose |
|---|---|---|
| GET | `/quizzes` | List quizzes (metadata only). |
| GET | `/quizzes/<name>` | Fetch one quiz with questions. |
| POST | `/quizzes/<name>` | Create or replace a quiz. |
| DELETE | `/quizzes/<name>` | Delete a quiz. |
| GET | `/quizzes/<name>/categories` | Distinct categories in a quiz. |
| POST | `/quizzes/<name>/questions` | Append questions. |
| PUT | `/quizzes/<name>/questions/<question_id>` | Update one question. |
| DELETE | `/quizzes/<name>/questions/<question_id>` | Delete one question. |
| GET | `/search?q=` | Full-text search across quizzes. |
| GET | `/reload` | Invalidate the in-memory cache. |

### Lessons — `/api/v1/lessons`

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List lessons. |
| GET | `/<name>` | Fetch one lesson. |
| POST | `/<name>` | Create or replace a lesson. |
| PUT | `/<name>` | Update a lesson. |
| DELETE | `/<name>` | Delete a lesson. |
| GET | `/by-quiz/<quiz_name>` | Lessons linked to a quiz. |
| GET | `/search?q=` | Search lessons. |

### Audio — `/api/v1/audio`

| Method | Path | Purpose |
|---|---|---|
| GET | `/devices` | List audio input devices. |
| POST | `/record/start` | Start a recording. |
| POST | `/record/stop` | Stop and post-process. |
| GET | `/presets` | Available presets and output formats. |
| GET | `/files` | List recorded files. |
| GET | `/files/<filename>` | Download a file. |
| DELETE | `/files/<filename>` | Delete a file. |
| POST | `/files/import` | Copy an external audio file in. |

### Video — `/api/v1/video`

| Method | Path | Purpose |
|---|---|---|
| POST | `/scan` | List videos in a directory. |
| POST | `/probe` | Metadata for one video file. |
| POST | `/extract` | Extract audio from a video. |
| GET | `/formats` | Supported video and audio formats. |

### AI — `/api/v1`

| Method | Path | Purpose |
|---|---|---|
| POST | `/ai/generate` | Generate a quiz draft from text. |
| POST | `/ai/validate` | Validate a quiz payload without saving. |
| POST | `/sessions` | Create a text-analysis session. |
| GET | `/sessions/<sid>` | Read a session. |
| DELETE | `/sessions/<sid>` | Delete a session. |

### Health

| Method | Path | Purpose |
|---|---|---|
| GET | `/healthz` | Liveness probe. Always `200` when the app is up. |

### Error format

```json
{
  "success": false,
  "code": "validation_error",
  "error": "متن سوال الزامی است",
  "details": {}
}
```

Status codes used: `404` not found, `409` conflict, `422` validation,
`429` rate limited (with `Retry-After`), `500` internal error.

## Architecture

```
server.py            Flask app factory, HTML routes, legacy API aliases
config.py            All tunables, env-overridable
core/
  repository.py      Only module that touches JSON files (atomic writes)
  schema.py          Question / quiz / lesson normalization
  security.py        Name sanitization and path-traversal guards
  rate_limit.py      In-memory sliding-window limiter
  logging_setup.py   Logging with home-path redaction
  services/          quiz, lesson, audio, video, AI, text-session logic
routes/              One Flask blueprint per feature area
static/              Design system (style.css, dashboard.css) and JS
  js/                Per-page controllers, Persian digits, sanitizer
templates/           Jinja2 pages (RTL, Persian)
tests/               111 tests: config, schema, security, repo, migration,
                     rate limiting, contrast, env guards
scripts/             Cross-platform launchers
```

Data flow: browser → Flask blueprint → service → repository → `data/*.json`.
Writes are atomic (temp file + `os.replace`) and guarded by a per-quiz lock.

## Testing

```bash
python -m pytest -q
```

Expected: **111 passed**. Test coverage spans configuration defaults, path
traversal, schema normalization, atomic writes and concurrency, rate limiting,
migration of legacy files, WCAG AA contrast, and `.env.example` hygiene.

## Security notes

- Default bind is `127.0.0.1` and debug is off. Change both deliberately.
- All quiz and lesson names are sanitized; `../` is rejected, not stripped.
- Audio import and video APIs resolve paths and enforce directory allowlists.
- System directories (`/etc`, `/proc`, `/sys`, `/dev`, `/boot`, `/root`) are
  always blocked for audio import, even when no allowlist is configured.
- Logs redact `/home/<user>` and `/Users/<user>` paths.
- Mutating API calls are rate limited; `429` responses include `Retry-After`.
- HTML output is escaped in the client via `static/js/sanitize.js`.

## Docker

```bash
docker build -t quiz-server .
docker run --rm -p 5000:5000 \
  -v "$PWD/data:/app/data" \
  -v "$PWD/storage:/app/storage" \
  quiz-server
```

The image bundles `ffmpeg` and `git` (needed for the `audio-recorder` dependency)
and exposes a `HEALTHCHECK` against `/healthz`.

## Contributing

1. Fork the repository and create a branch: `git checkout -b fix/short-name`.
2. Make the change and add a regression test under `tests/`.
3. Run `python -m pytest -q` — the suite must stay green.
4. Keep changes focused; do not reformat unrelated files.
5. Open a pull request describing the problem and the fix.

## License

Released under the **MIT License**. See [LICENSE](LICENSE) for the full text.

In short: you may use, copy, modify, merge, publish, distribute, sublicense,
and sell copies of this software, provided the copyright notice and this
permission notice are included. The software is provided "as is", without
warranty of any kind.

## Acknowledgements

- [Flask](https://flask.palletsprojects.com/)
- [Vazirmatn](https://github.com/rastikerdar/vazirmatn) typeface
- [audio-recorder](https://github.com/bigZeroR/audio-recorder) backend
- [ffmpeg](https://ffmpeg.org/)
