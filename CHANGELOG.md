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

## [Unreleased]
