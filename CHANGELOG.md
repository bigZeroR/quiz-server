# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-28

### Added
- `/healthz` liveness endpoint (additive; no existing routes changed).
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) running `pytest` on Python 3.10.
- `pytest.ini` scoping collection to `tests/` and excluding `vendor/`, `venv/`, etc.
- `QUIZ_AUDIO_IMPORT_ROOTS` config to restrict the audio-import API to allowed directories.
- Log path redaction: `/home/<user>` and `/Users/<user>` are masked in stdout and file logs.
- `tests/test_env_guard.py` regression guards (no personal paths/emails/secrets in `.env.example`).
- CHANGELOG.md.

### Changed
- `requirements.txt`: `audio-recorder` pinned to commit `0e1a152` instead of `@main`.
- `config.py`: loads `.env` (was `.env.example`).
- `.env.example`: added `QUIZ_AUDIO_IMPORT_ROOTS`; no machine-specific paths.

### Security
- `import_audio_from_path` now blocks system directories (`/etc`, `/proc`, `/sys`, `/dev`, `/boot`, `/root`) and enforces configured roots.
- Git history rewritten to remove a personal name/email from all commits and tags.

### Fixed
- `pytest` from the repository root no longer collides on `tests/conftest.py` vs `vendor/audio-recorder/tests/conftest.py`.
- `test_video_roots_empty_by_default` now passes with a clean `.env.example`.

## [1.1.0] - 2026-10-28

### Added
- `core/rate_limit.py`: in-memory sliding-window limiter for mutating API calls
  (POST/PUT/PATCH/DELETE under `/api/v1/` and `/api/`). GET requests and HTML pages
  are never throttled. Returns `429` with `Retry-After` and `code: rate_limited`.
- `QUIZ_RATE_LIMIT_PER_MIN` config (default 120; `0` disables).
- `schema_version` field in quiz/lesson payloads (missing = 1; forward-compatible).
- One-time `.bak` backup before the first rewrite of a legacy unversioned file.
- Persian numerals on marked elements via `static/js/fa_digits.js` (never touches
  inputs, code blocks, or JSON).
- `:focus-visible` outlines and `min-height: 44px` touch targets.
- `tests/test_rate_limit.py` (11 tests) and `tests/test_migration.py` (6 tests).

## [1.2.0] - 2026-10-28

### Added
- `Dockerfile` + `.dockerignore` (python:3.10-slim, ffmpeg, healthcheck on /healthz).
- `tests/test_contrast.py`: WCAG AA contrast guard over the design tokens.

### Changed
- `--text-tertiary` lightened `#5e6b7a` → `#7a8796` (3.67:1 → 5.45:1, now AA body).

## [2.0.0] - 2026-10-28

### Added
- `scripts/run.sh`, `scripts/run.ps1`, `scripts/run.bat`: one-command launchers for
  Linux, macOS, and Windows (auto-create venv, install deps, seed `.env`, start server).
- Dashboard: mobile bottom navigation (<900px), per-quiz progress bars, weak-areas panel
  driven by per-question category, accuracy computed from actual answers.
- New dual-accent design system (`--accent` + `--accent-2`), layered radial page glow.
- Cross-OS font stacks (`Segoe UI`/`SF Pro`/`system-ui` fallback chain) and mono stacks
  (`Cascadia Code`/`SF Mono`/`Consolas`).
- `prefers-reduced-motion` and `forced-colors` support.
- `viewport-fit=cover`, `theme-color` meta.

### Changed
- `static/style.css` rewritten as a design system (741 lines) keeping all existing class
  names, so no template or JS breakage.
- `static/dashboard.css` rewritten (RTL flex layout, sticky right sidebar, v3 stat cards).
- `templates/dashboard.html` restructured (sidebar nav icons, brand subtitle, mobile nav).
- `static/js/dashboard_page.js` rewritten: safe JSON parsing, real accuracy math,
  progress bars, per-category weak-area aggregation.
- Layout migrated from physical to logical properties (`inset-inline`, `border-inline-start`).

### Fixed
- Sidebar rendered on the wrong side under some browsers; now pinned right with
  explicit `direction: rtl`.
- Mobile bottom nav not visible: added solid `background` fallback before `color-mix`
  and explicit `bottom/left/right` offsets.

### Notes
- No API, schema, route, or storage-key changes; fully backward compatible at the
  data layer.

## [Unreleased]
