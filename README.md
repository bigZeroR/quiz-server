<div align="center">

# 🧠 Quiz Server
> 🇮🇷 [نسخهٔ فارسی](README.fa.md)
### Build quizzes, organize lessons, and turn learning materials into interactive study experiences.

A Flask-based learning workspace combining **quiz management**, **AI-assisted question generation**, **Markdown lessons**, **audio recording**, and **local video-to-audio conversion**.

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Tests](https://img.shields.io/badge/tests-78%20passing-brightgreen?logo=pytest&logoColor=white)](#testing)
[![API](https://img.shields.io/badge/API-REST%20%2F%20v1-2E8B57)](#api-reference)

[Quick Start](#quick-start) · [Getting Started](#getting-started) · [Features](#features) · [API Reference](#api-reference) · [Architecture](#architecture) · [Contributing](#contributing)

</div>

---

## Overview

**Quiz Server** is a self-hostable study and content-management application. Instead of keeping quizzes, lesson notes, audio recordings, and video materials in separate tools, it provides one web interface backed by a Python/Flask server.

Create and edit question banks, search existing quizzes, write structured Markdown lessons, generate quiz drafts using an AI provider, record audio, or extract audio tracks from locally available videos. Learning content is stored as JSON files, making it straightforward to inspect, back up, and version alongside your other project data.

## Quick Start

If you just want to run the app and start using it — no development, no customization — follow these steps.

### 1. Install prerequisites

You need **Python 3.10+** and **FFmpeg**.

**Linux (Ubuntu / Debian):**

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv ffmpeg git
```

**macOS** (with [Homebrew](https://brew.sh/)):

```bash
brew install python ffmpeg git
```

**Windows:**

- Install **Python** from [python.org](https://www.python.org/downloads/) — download the latest **Python 3.x** installer, and on the first installer screen, check **"Add python.exe to PATH"**.
- Install **Git** from [git-scm.com](https://git-scm.com/download/win).
- Install **FFmpeg**:
  1. Download `ffmpeg-release-essentials.zip` from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/).
  2. Extract it and move the inner folder to `C:\ffmpeg` (so that `C:\ffmpeg\bin\ffmpeg.exe` exists).
  3. Press **Win**, type `Environment`, open **"Edit the system environment variables"** → **Environment Variables** → select **Path** under User variables → **Edit** → **New** → paste `C:\ffmpeg\bin` → OK.
  4. **Close and reopen** Command Prompt.

Verify everything works:

```bash
python --version       # or: python3 --version
ffmpeg -version
git --version
```

### 2. Get the project

```bash
git clone https://github.com/bigZeroR/quiz-server.git
cd quiz-server
```

### 3. Create a virtual environment and install dependencies

**Linux / macOS:**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Windows:**

```bat
py -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

After activation you should see `(.venv)` at the start of your prompt.

### 4. Run it

```bash
python server.py
```

### 5. Open the app

Visit **http://127.0.0.1:5000** in your browser.

That's it. You can now:

- Browse and take quizzes from the home page.
- Create a new quiz at `/create`.
- Write lessons at `/lessons`.
- Record or extract audio at `/audio` and `/video`.

> **First-time tip:** If you want to record system audio on Windows, enable **Stereo Mix** (Sound settings → Recording tab) or install [VB-Cable](https://vb-audio.com/Cable/), then pick that device in the `/audio` page.

### Stopping the server

Press `Ctrl+C` in the terminal where `python server.py` is running.

### Running it again later

Every time you want to use the app:

**Linux / macOS:**

```bash
cd quiz-server
source .venv/bin/activate
python server.py
```

**Windows:**

```bat
cd quiz-server
.venv\Scripts\activate.bat
python server.py
```

For the full setup guide, environment variables, and platform-specific notes, continue to [Getting Started](#getting-started).

## Features

| Area | Capabilities |
| --- | --- |
| **Quiz management** | Create, view, edit, and search quizzes; update or remove individual questions. |
| **AI-assisted authoring** | Create question drafts from source text through an OpenAI-compatible provider; validate generated drafts. |
| **Lessons** | Create and edit independent lessons with Markdown content, sections, tags, and related question IDs. |
| **Quiz–lesson linking** | Associate a lesson with a quiz and open its supporting learning material from the quiz interface. |
| **Audio workspace** | Discover audio devices, start and stop recording, use presets, and manage recorded files. |
| **Video → audio** | Scan local video files, inspect their metadata, and extract audio using FFmpeg. Batch selection and a processing queue are supported. |
| **Mobile-oriented page** | Open a dedicated mobile text-entry interface. |
| **HTTP API** | Access the quiz, lesson, AI, audio, and video functionality through `/api/v1` endpoints. |
| **Local-first storage** | Store quiz and lesson documents as JSON; use a dedicated `storage/` tree for generated files. |

### Who is it for?

- **Students** organizing revision material into quizzes and lessons.
- **Educators** building and maintaining reusable question collections.
- **Developers** exploring a layered Flask application with a JSON-backed repository and modular services.

## Tech Stack

| Component | Technology |
| --- | --- |
| Runtime | Python 3.10+ |
| Web server / routing | Flask 3.0 |
| Templates | Jinja2 |
| Frontend | Server-rendered HTML and JavaScript modules |
| Data persistence | JSON files |
| AI integration | OpenAI-compatible API configuration |
| Media processing | FFmpeg / FFprobe |
| Audio recording | [audio-recorder](https://github.com/bigZeroR/audio-recorder) (installed from git) |
| Testing | pytest |

The application does **not** require a relational database.

## Getting Started

This section covers the full setup with platform-specific details, configuration options, and notes for developers.

### Prerequisites

- Python **3.10 or newer**
- `pip` and Python virtual environment support
- Git (required — the audio-recorder dependency is installed from git)
- **FFmpeg** (including `ffprobe`) for media functionality

Choose the installation instructions for your operating system:

---

#### 🐧 Linux (Ubuntu / Debian)

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv ffmpeg git
```

**Fedora:**

```bash
sudo dnf install python3 python3-pip ffmpeg git
```

**Arch:**

```bash
sudo pacman -S python python-pip ffmpeg git
```

---

#### 🍎 macOS

Install [Homebrew](https://brew.sh/) if you don't have it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then install everything:

```bash
brew install python ffmpeg git
```

---

#### 🪟 Windows

**Step 1 — Install Python**

1. Go to [https://www.python.org/downloads/](https://www.python.org/downloads/)
2. Click the yellow **Download Python 3.x** button for the latest stable release.
3. Run the installer.
4. **Important:** On the first screen, check the box **"Add python.exe to PATH"** at the bottom.
5. Click **Install Now** and wait for it to finish.
6. Click **Close**.

Verify by opening **Command Prompt** (`Win` → type `cmd` → Enter) and running:

```bat
python --version
```

It should print `Python 3.x.x`.

**Step 2 — Install Git**

Download the installer from [https://git-scm.com/download/win](https://git-scm.com/download/win), run it with default options, and verify:

```bat
git --version
```

**Step 3 — Install FFmpeg**

1. Go to [https://www.gyan.dev/ffmpeg/builds/](https://www.gyan.dev/ffmpeg/builds/)
2. Under **release builds**, click **`ffmpeg-release-essentials.zip`**.
3. Extract the downloaded ZIP (right-click → **Extract All**).
4. Inside the extracted folder, you will find another folder like `ffmpeg-7.0-essentials_build`. Move that inner folder to:

   ```text
   C:\ffmpeg
   ```

   The final path should be `C:\ffmpeg\bin\ffmpeg.exe`.

5. Add `C:\ffmpeg\bin` to your **PATH**:
   - Press **Win**, type `Environment`, and open **"Edit the system environment variables"**.
   - Click **Environment Variables**.
   - Under **User variables**, select **Path** and click **Edit**.
   - Click **New** and paste:

     ```text
     C:\ffmpeg\bin
     ```

   - Click **OK** → **OK** → **OK**.

6. **Close and reopen** Command Prompt (important — environment changes only apply to new terminals).

Verify:

```bat
ffmpeg -version
ffprobe -version
```

Both should print version information.

---

### 1. Clone the repository

```bash
git clone https://github.com/bigZeroR/quiz-server.git
cd quiz-server
```

On Windows, you can also use PowerShell or Git Bash for these commands.

### 2. Set up a virtual environment

**Linux / macOS:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

**Windows — Command Prompt (`cmd.exe`):**

```bat
py -m venv .venv
.venv\Scripts\activate.bat
```

**Windows — PowerShell:**

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
```

> [!NOTE]
> If PowerShell blocks the activation script, run this once in the same window:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
>
> Then try activating again.

After activation, you should see `(.venv)` at the start of your terminal prompt.

### 3. Install Python dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

> [!NOTE]
> Installing `requirements.txt` pulls `audio-recorder` directly from GitHub via a git URL. **Git must be installed** and available on your `PATH`. If your network blocks GitHub, use a mirror or clone [audio-recorder](https://github.com/bigZeroR/audio-recorder) locally and install it with `pip install -e /path/to/audio-recorder`.

### 4. Configure the application

Copy the example environment file:

**Linux / macOS:**

```bash
cp .env.example .env
```

**Windows (Command Prompt):**

```bat
copy .env.example .env
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

The app loads `.env` automatically (via `python-dotenv`). You can edit `.env` to override any of the defaults listed in [Configuration](#configuration).

For a basic **local-only** run, the defaults are already safe — the server binds to `127.0.0.1` with debug disabled. If you want to change behavior, edit `.env` or export variables in your shell.

Generate a random secret if you want stable sessions across restarts:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Then put it in `.env` as `QUIZ_SECRET_KEY=...`.

An AI API key is optional for local operation; configure one if you want to use a remote compatible provider.

### 5. Start the server

```bash
python server.py
```

Open **http://127.0.0.1:5000** in your browser.

> **Network access:** The default `QUIZ_HOST` is `127.0.0.1`, meaning the server is only reachable from this machine. To allow other devices on your **trusted local network** to connect, set `QUIZ_HOST=0.0.0.0` in `.env`. Do not expose the Flask development server directly to the public internet.

## Configuration

The application reads configuration through the `Config` class in [`config.py`](config.py). Values are loaded from environment variables, with `.env` supported automatically.

| Variable | Default | Purpose |
| --- | --- | --- |
| `QUIZ_HOST` | `127.0.0.1` | Listen address (localhost-only by default) |
| `QUIZ_PORT` | `5000` | HTTP port |
| `QUIZ_DEBUG` | `0` | Flask debug mode (`1` to enable; never enable on shared networks) |
| `QUIZ_SECRET_KEY` | random per start | Flask session secret. Set a stable value in `.env` to persist sessions across restarts. |
| `QUIZ_DATA_DIR` | `./data` | Quiz JSON directory |
| `QUIZ_LESSON_DIR` | `data/lessons` | Lesson JSON directory |
| `QUIZ_STORAGE_DIR` | `./storage` | Generated file storage |
| `QUIZ_VIDEO_DIR` | `storage/videos` | Default folder for the video page |
| `QUIZ_VIDEO_ROOTS` | *(empty)* | Comma-separated list of extra directories the video API may read from. `storage/videos` is always allowed. |
| `QUIZ_MAX_UPLOAD_MB` | `64` | Maximum request upload size in MB |
| `QUIZ_MAX_AUDIO_SECONDS` | `600` | Audio duration setting |
| `QUIZ_TEXT_MAX_CHARS` | `200000` | Maximum text input length |
| `QUIZ_AI_PROVIDER` | `openai_compatible` | AI provider selection |
| `QUIZ_AI_BASE_URL` | `https://api.openai.com/v1` | AI-compatible API base URL |
| `QUIZ_AI_API_KEY` | *(empty)* | Provider API key |
| `QUIZ_AI_MODEL` | `gpt-4o-mini` | Configured AI model name |
| `QUIZ_AI_TIMEOUT` | `60` | AI timeout in seconds |

The default model string is a **configuration default**, not a guarantee of model availability or free access. Use a model supported by your selected provider.

### Example: enabling LAN access

Edit `.env`:

```ini
QUIZ_HOST=0.0.0.0
```

Then reach the app from another device using your LAN IP:

```text
http://192.168.1.10:5000
```

### Example: configuring an AI provider

**Linux / macOS:**

```bash
export QUIZ_AI_PROVIDER="openai_compatible"
export QUIZ_AI_BASE_URL="https://api.openai.com/v1"
export QUIZ_AI_MODEL="gpt-4o-mini"
export QUIZ_AI_API_KEY="YOUR_API_KEY"
```

**Windows (Command Prompt):**

```bat
set QUIZ_AI_PROVIDER=openai_compatible
set QUIZ_AI_BASE_URL=https://api.openai.com/v1
set QUIZ_AI_MODEL=gpt-4o-mini
set QUIZ_AI_API_KEY=YOUR_API_KEY
```

**Windows (PowerShell):**

```powershell
$env:QUIZ_AI_PROVIDER = "openai_compatible"
$env:QUIZ_AI_BASE_URL = "https://api.openai.com/v1"
$env:QUIZ_AI_MODEL = "gpt-4o-mini"
$env:QUIZ_AI_API_KEY = "YOUR_API_KEY"
```

Or add them to `.env` — they will be loaded automatically on the next start.

Never commit actual API keys, session secrets, or private learning materials to a public repository.

### Example: allowing additional video folders

By default, the video page can only read from `storage/videos/`. To scan other directories, list them in `.env`:

```ini
QUIZ_VIDEO_ROOTS=~/Videos,~/Downloads,/mnt/media
```

Paths outside these roots are rejected by the API.

## Using the Application

### Create and manage quizzes

1. Visit [`/create`](http://127.0.0.1:5000/create) to create a quiz using the available authoring options.
2. Open the home page (`/`) to browse quizzes.
3. Use `/quiz/<name>` to open an individual quiz.
4. Edit or delete questions through the UI or the corresponding API routes.

Quizzes are stored as JSON files inside the configured data directory.

### Write structured lessons

1. Open `/lessons/new/edit`.
2. Enter a title, description, tags, and sections.
3. Write lesson section bodies in Markdown.
4. Optionally link the lesson to an existing quiz.
5. Save it to the lesson JSON directory.

The interface also supports an **AI prompt workflow**: copy a prepared prompt, send it to an LLM, paste the JSON response into the editor, and review it before saving. This manual workflow is distinct from the configured API integration.

### Record and manage audio

Open `/audio` to access the audio workspace, recording controls, formats/presets, and stored recordings.

**On Windows**, the system audio is not exposed by default. To record what is playing through your speakers (for example, a video you are watching in a browser), you have two options:

1. **Stereo Mix** (if your sound card supports it):
   - Right-click the speaker icon in the taskbar → **Sounds**.
   - Open the **Recording** tab.
   - If `Stereo Mix` appears, right-click it and choose **Enable**.
   - In the audio page, select `Stereo Mix` as the recording device.
2. **VB-Cable** (if Stereo Mix is unavailable):
   - Install [VB-Cable](https://vb-audio.com/Cable/).
   - Restart the machine.
   - In the audio page, select `CABLE Output` as the recording device.

**On macOS**, use a virtual device such as [BlackHole](https://existential.audio/blackhole/) and select it as the input inside the application.

**On Linux**, select the device whose name begins with `Monitor of ...` (PulseAudio / PipeWire expose these automatically).

### Extract audio from a local video

1. Open `/video`.
2. Select a video file or scan a local directory.
3. Inspect available video metadata.
4. Choose an output name and supported audio format.
5. Extract the audio track with FFmpeg.

You can also **select multiple videos** and add them to a **processing queue**. The queue shows per-item status, a progress bar, elapsed time, and supports stopping after the current item completes.

By default, the video page can only read from `storage/videos/`. To use a different directory, add it to `QUIZ_VIDEO_ROOTS` in `.env`.

When entering paths on Windows, use backslashes or forward slashes, for example:

```text
C:\Users\YourName\Videos
C:/Users/YourName/Videos
```

**Supported input extensions:** `mp4`, `mkv`, `mov`, `avi`, `webm`, `flv`, `wmv`, `m4v`, `ts`, `mpg`, `mpeg`.

**Supported output formats:** `mp3`, `wav`, `flac`, `m4a`, `opus`, `aac`.

Outputs are stored under `storage/audio/` by default. Name collisions are resolved automatically with numeric suffixes, and video duration is checked against the configured audio duration setting.

### Mobile-oriented text entry

With the server reachable from another device on your **trusted local network**, visit:

```text
http://<your-server-lan-ip>:5000/mobile
```

To find your LAN IP:

**Linux:**

```bash
ip addr | grep "inet "
```

**macOS:**

```bash
ipconfig getifaddr en0
```

**Windows:**

```bat
ipconfig
```

Look for `IPv4 Address` under your active adapter (for example, `192.168.1.10`).

Access from other devices requires `QUIZ_HOST=0.0.0.0` (or another reachable interface) and local firewall configuration. Avoid exposing this development interface on an untrusted network.

## API Reference

The application exposes an HTTP API under `/api/v1`.

### Quizzes

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/quizzes` | List quizzes |
| `GET` | `/api/v1/quizzes/<name>` | Read a quiz |
| `POST` | `/api/v1/quizzes/<name>` | Save a quiz |
| `PUT` | `/api/v1/quizzes/<name>/questions/<id>` | Update a question |
| `DELETE` | `/api/v1/quizzes/<name>/questions/<id>` | Delete a question |
| `GET` | `/api/v1/search?q=<term>` | Search quizzes |

**Example: list quizzes**

```bash
curl http://127.0.0.1:5000/api/v1/quizzes
```

**Example: search quizzes**

```bash
curl --get \
  --data-urlencode "q=linux" \
  http://127.0.0.1:5000/api/v1/search
```

On Windows PowerShell, `curl` is an alias for `Invoke-WebRequest`. Use `curl.exe` explicitly to get the real curl behavior:

```powershell
curl.exe http://127.0.0.1:5000/api/v1/quizzes
```

### AI and text sessions

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/sessions` | Create a text session |
| `POST` | `/api/v1/ai/generate` | Generate an AI quiz draft |
| `POST` | `/api/v1/ai/validate` | Validate an AI draft |

Request body fields and response formats should be checked in [`routes/ai_routes.py`](routes/ai_routes.py) before integrating an external client.

### Lessons

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/lessons` | List lessons |
| `GET` | `/api/v1/lessons/<name>` | Read a lesson |
| `POST` | `/api/v1/lessons/<name>` | Create a lesson |
| `PUT` | `/api/v1/lessons/<name>` | Update a lesson |
| `DELETE` | `/api/v1/lessons/<name>` | Delete a lesson |
| `GET` | `/api/v1/lessons/by-quiz/<quiz>` | Get lesson associated with a quiz |
| `GET` | `/api/v1/lessons/search?q=<term>` | Search lessons |

### Audio

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/v1/audio/devices` | List recording devices |
| `POST` | `/api/v1/audio/record/start` | Start a recording |
| `POST` | `/api/v1/audio/record/stop` | Stop a recording |
| `GET` | `/api/v1/audio/presets` | Get presets and formats |
| `GET` | `/api/v1/audio/files` | List audio files |
| `GET` | `/api/v1/audio/files/<filename>` | Retrieve an audio file |
| `DELETE` | `/api/v1/audio/files/<filename>` | Delete an audio file |

### Video-to-audio

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/video/scan` | Scan a directory or video file |
| `POST` | `/api/v1/video/probe` | Inspect video metadata |
| `POST` | `/api/v1/video/extract` | Extract audio from video |
| `GET` | `/api/v1/video/formats` | List supported formats and default folder |

**Request body examples:**

```json
{"dir": "storage/videos"}
```

```json
{"path": "storage/videos/lesson.mp4"}
```

```json
{
  "path": "storage/videos/lesson.mp4",
  "name": "lesson-audio",
  "format": "mp3"
}
```

On Windows, forward slashes in paths are accepted, for example:

```json
{"path": "C:/Users/YourName/Videos/lesson.mp4"}
```

**Security note:** The video API only accepts paths under `QUIZ_VIDEO_DIR` or any directory listed in `QUIZ_VIDEO_ROOTS`. Paths outside these roots are rejected with a `ValidationError`. Files are read from the **server's** filesystem, not a remote browser's device.

### Legacy endpoints

`server.py` also registers routes retained for backward compatibility:

| Method | Endpoint |
| --- | --- |
| `POST` | `/api/save_quiz` |
| `POST` | `/api/save_quiz_with_name` |
| `POST` | `/api/edit_question` |
| `POST` | `/api/delete_question` |
| `GET` | `/api/search` |
| `GET` | `/api/reload` |

For new integrations, prefer the versioned API where possible.

## Data Models

### Example quiz JSON

```json
{
  "title": "Linux Essentials",
  "description": "Basic command-line concepts",
  "type": "linux",
  "level": 1,
  "questions": [
    {
      "id": "q_1",
      "text": "What does the ls command do?",
      "options": ["Lists files", "Deletes files", "Copies files", "Moves files"],
      "correct": 0,
      "category": "Commands",
      "level": 1,
      "explanation": "ls displays directory entries."
    }
  ]
}
```

`correct` is represented as a **zero-based option index**.

### Example lesson JSON

```json
{
  "title": "Introduction to Storage",
  "description": "Disk and partition basics",
  "quiz_name": "linux-essentials",
  "level": 1,
  "tags": ["storage", "partitions"],
  "sections": [
    {
      "id": "s1",
      "title": "Understanding partitions",
      "content": "## Partitions\nA partition is a logical region of a disk.",
      "question_ids": ["q_1"]
    }
  ]
}
```

These examples illustrate the data models; they are not a complete validation schema.

## Architecture

The server follows a modular structure that separates HTTP handling from content operations:

```text
Browser / API client
        │
        ▼
     Flask app
     server.py
        │
        ▼
 Route blueprints (routes/)
        │
        ▼
  Domain services (core/services/)
        │
        ├── Quiz and lesson operations ──► JSON repository ──► data/
        ├── AI operations ───────────────► Provider abstraction / API
        └── Audio / video operations ────► FFmpeg and storage/
```

Key responsibilities:

- **`server.py`** — Flask application setup, page routes, blueprint registration, error handlers, and legacy API routes.
- **`config.py`** — Centralized configuration, `.env` loading, and storage paths.
- **`routes/`** — HTTP endpoints organized by feature.
- **`core/services/`** — Business operations for quizzes, lessons, AI, audio, video, and text sessions.
- **`core/repository.py`** — JSON-backed persistence and caching with atomic writes and per-quiz locking.
- **`core/security.py`** — Name sanitization and path-traversal protection.
- **`core/ai/`** — Provider abstraction.
- **`templates/` and `static/`** — User interface.
- **`tests/`** — Test suite.

### Repository layout

```text
quiz-server/
├── server.py
├── config.py
├── requirements.txt
├── .env.example
├── core/
│   ├── errors.py
│   ├── security.py
│   ├── schema.py
│   ├── repository.py
│   ├── ai/
│   └── services/
├── routes/
│   ├── quiz_routes.py
│   ├── ai_routes.py
│   ├── audio_routes.py
│   ├── video_routes.py
│   └── lesson_routes.py
├── data/
│   └── lessons/
├── storage/
│   ├── audio/
│   ├── videos/
│   ├── tmp/
│   ├── uploads/
│   └── logs/
├── templates/
├── static/
└── tests/
```

The audio recording backend lives in a separate repository, [bigZeroR/audio-recorder](https://github.com/bigZeroR/audio-recorder), and is installed via `requirements.txt` as a git dependency.

## Web Pages

| Page | Route |
| --- | --- |
| Quiz library / home | `/` |
| View quiz | `/quiz/<name>` |
| Create quiz | `/create` |
| Dashboard | `/dashboard` |
| Audio workspace | `/audio` |
| Video-to-audio workspace | `/video` |
| Mobile text-entry page | `/mobile` |
| Lesson library | `/lessons` |
| View lesson | `/lessons/<name>` |
| Edit lesson | `/lessons/<name>/edit` |

## Testing

The project ships with a pytest-based test suite covering configuration, security, schema, repository, video path restrictions, and lesson service behavior.

```bash
python -m pytest tests/ -v
```

All 78 tests currently pass on Python 3.10.

The suite includes checks for:

- Config defaults (safe host, debug off, secret-key generation, `VIDEO_ROOTS` parsing)
- Name sanitization and path-traversal protection (including symlink escape)
- Schema normalization for questions, quizzes, and lessons
- Atomic JSON writes, per-quiz locking, and concurrent writes from 20 threads
- Video path restriction against `VIDEO_DIR` and `VIDEO_ROOTS`
- Lesson CRUD and quiz linking

## Security & Deployment Notes

Quiz Server is convenient for local development, but **development defaults are not production security settings**.

Safe defaults shipped with this project:

- The server binds to `127.0.0.1` and is not reachable from other machines unless you set `QUIZ_HOST=0.0.0.0`.
- Flask debug mode is **off** by default.
- `SECRET_KEY` is randomly generated per process if not provided.
- The video API restricts file access to `VIDEO_DIR` and any directory listed in `VIDEO_ROOTS`.
- `sanitize_quiz_name` rejects path separators before any normalization.

Before any public or shared deployment:

1. Set a strong, unique `QUIZ_SECRET_KEY` in `.env`.
2. Put the application behind a properly configured production WSGI server and, where appropriate, a reverse proxy with HTTPS.
3. Review access controls and authorization for endpoints that change quizzes, lessons, or local media files. This application does **not** ship with authentication.
4. Review server-side file path restrictions, input validation, upload limits, and exposed storage directories.
5. Keep API keys in environment variables or a secrets manager; never publish them.
6. Back up `data/` and any media you need to preserve in `storage/`.
7. Confirm OS-level recording permissions and FFmpeg availability.

> [!WARNING]
> Do **not** assume that the current application provides production-ready authentication, multi-user isolation, rate limiting, or public-internet protection without reviewing and testing those controls separately.

## Troubleshooting

<details>
<summary><strong>Dependency installation fails on audio-recorder</strong></summary>

`requirements.txt` installs `audio-recorder` from GitHub via a git URL. If installation fails:

- Confirm `git` is installed and on your `PATH`.
- Check that your network allows access to `github.com`.
- Try installing the dependency manually:

  ```bash
  pip install "git+https://github.com/bigZeroR/audio-recorder.git"
  ```

- As a workaround, clone the repository locally and install it editable:

  ```bash
  git clone https://github.com/bigZeroR/audio-recorder.git ../audio-recorder
  pip install -e ../audio-recorder
  ```

</details>

<details>
<summary><strong>FFmpeg or FFprobe cannot be found</strong></summary>

Install FFmpeg using your operating system package manager, then confirm that `ffmpeg -version` and `ffprobe -version` work in the same environment where the server runs.

**On Windows**, this usually means `C:\ffmpeg\bin` is not on your PATH. Add it through **Environment Variables** and then **close and reopen** Command Prompt before testing.

</details>

<details>
<summary><strong><code>python</code> is not recognized (Windows)</strong></summary>

Python is not on your PATH. Re-run the installer, choose **Modify**, and make sure **"Add Python to environment variables"** is enabled. Alternatively, use the `py` launcher instead of `python`:

```bat
py server.py
```

</details>

<details>
<summary><strong>PowerShell refuses to activate the virtual environment</strong></summary>

Run the following once, then try again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

</details>

<details>
<summary><strong>My AI requests are not working</strong></summary>

Check `QUIZ_AI_API_KEY`, `QUIZ_AI_BASE_URL`, `QUIZ_AI_MODEL`, and whether the selected provider supports the requested model. Confirm that these values are present in the running server process (either through `.env` or exported in the shell).

On Windows, environment variables set with `set` apply only to the current terminal session. Use `.env` instead for persistent configuration.

</details>

<details>
<summary><strong>I cannot reach the app from my phone</strong></summary>

The default `QUIZ_HOST` is `127.0.0.1`, which is only reachable from the same machine. To allow other devices:

1. Set `QUIZ_HOST=0.0.0.0` in `.env`.
2. Ensure both devices are on a trusted network.
3. Allow the port through your host firewall.
4. From the phone, use the server's LAN IP (not `127.0.0.1`).

On Windows, the first time the server listens on a public interface, Windows Firewall prompts for permission. Allow it **only** for the "Private networks" profile.

</details>

<details>
<summary><strong>Video extraction fails with "این مسیر مجاز نیست" (path not allowed)</strong></summary>

The video API only reads files under `QUIZ_VIDEO_DIR` (`storage/videos/` by default) or any directory listed in `QUIZ_VIDEO_ROOTS`. Add the folder you want to scan to `.env`:

```ini
QUIZ_VIDEO_ROOTS=~/Videos,~/Downloads
```

Then restart the server.

</details>

<details>
<summary><strong>Video extraction fails or produces empty output</strong></summary>

Confirm that the video file is not corrupted, the duration is within the configured limit, and FFmpeg has read access to the source path. Review the server logs under `storage/logs/` for the FFmpeg error output.

On Windows, avoid paths with unusual characters, and prefer `C:/Users/...` style forward slashes inside the web interface.

</details>

<details>
<summary><strong>Audio recording produces silence</strong></summary>

You are probably recording the default microphone instead of the system audio. On Windows, enable **Stereo Mix** or install **VB-Cable** as described in the audio section above, and select that device in the application.

</details>

## Contributing

Contributions, bug reports, and documentation improvements are welcome.

1. Fork this repository.
2. Create a feature branch.
3. Make a focused change with appropriate tests.
4. Run `python -m pytest tests/ -v` before opening a pull request.
5. Open a pull request explaining the change and how it was tested.

For bugs or proposals, use [GitHub Issues](https://github.com/bigZeroR/quiz-server/issues).

## Project Links

- **Repository:** https://github.com/bigZeroR/quiz-server
- **Issues:** https://github.com/bigZeroR/quiz-server/issues
- **Audio recorder backend:** https://github.com/bigZeroR/audio-recorder

---

<div align="center">

**Quiz Server** — One workspace for quizzes, lessons, AI-assisted authoring, and study media.

[⬆ Back to top](#-quiz-server)

</div>
