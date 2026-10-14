"""Application configuration - all tunables in one place."""
from __future__ import annotations

import os
import secrets
from pathlib import Path

# ── Load .env if present (optional dependency) ───────────────
try:
    from dotenv import load_dotenv
    _BASE = Path(__file__).resolve().parent
    load_dotenv(_BASE / ".env")
except ImportError:  # pragma: no cover
    pass


class Config:
    """Central configuration (env-overridable)."""

    BASE_DIR: Path = Path(__file__).resolve().parent
    DATA_DIR: Path = Path(os.getenv("QUIZ_DATA_DIR", BASE_DIR / "data"))
    LESSON_DIR: Path = Path(os.getenv("QUIZ_LESSON_DIR", DATA_DIR / "lessons"))
    STORAGE_DIR: Path = Path(os.getenv("QUIZ_STORAGE_DIR", BASE_DIR / "storage"))
    AUDIO_DIR: Path = STORAGE_DIR / "audio"
    VIDEO_DIR: Path = Path(os.getenv("QUIZ_VIDEO_DIR", STORAGE_DIR / "videos"))
    TMP_DIR: Path = STORAGE_DIR / "tmp"
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    LOG_DIR: Path = STORAGE_DIR / "logs"

    # ── Network ─────────────────────────────────────────────
    # Bind to localhost by default. Set QUIZ_HOST=0.0.0.0 only if
    # you intentionally want the app reachable from your LAN.
    HOST: str = os.getenv("QUIZ_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("QUIZ_PORT", "5000"))

    # Debug is OFF by default. Never enable it on a shared network:
    # Werkzeug's debugger allows arbitrary code execution.
    DEBUG: bool = os.getenv("QUIZ_DEBUG", "0") == "1"

    # Generate a random key if none provided. This means sessions
    # are invalidated on every restart unless you set QUIZ_SECRET_KEY.
    SECRET_KEY: str = os.getenv("QUIZ_SECRET_KEY") or secrets.token_hex(32)

    # ── Uploads / limits ────────────────────────────────────
    MAX_UPLOAD_MB: int = int(os.getenv("QUIZ_MAX_UPLOAD_MB", "64"))
    MAX_AUDIO_SECONDS: int = int(os.getenv("QUIZ_MAX_AUDIO_SECONDS", "600"))
    ALLOWED_AUDIO_EXT: tuple[str, ...] = (".wav", ".mp3", ".ogg", ".m4a", ".flac", ".webm")
    ALLOWED_TEXT_MAX_CHARS: int = int(os.getenv("QUIZ_TEXT_MAX_CHARS", "200000"))

    # ── Video roots allowed for /api/v1/video/* ─────────────
    # Comma-separated list. Empty means "storage/videos only".
    # Example: QUIZ_VIDEO_ROOTS="~/Videos,~/Downloads,/mnt/media"
    VIDEO_ROOTS: tuple[str, ...] = tuple(
        p.strip() for p in os.getenv("QUIZ_VIDEO_ROOTS", "").split(",") if p.strip()
    )

    # ── AI ──────────────────────────────────────────────────
    AI_PROVIDER: str = os.getenv("QUIZ_AI_PROVIDER", "openai_compatible")
    AI_BASE_URL: str = os.getenv("QUIZ_AI_BASE_URL", "https://api.openai.com/v1")
    AI_API_KEY: str = os.getenv("QUIZ_AI_API_KEY", "")
    AI_MODEL: str = os.getenv("QUIZ_AI_MODEL", "gpt-4o-mini")
    AI_TIMEOUT: int = int(os.getenv("QUIZ_AI_TIMEOUT", "60"))

    @classmethod
    def ensure_dirs(cls) -> None:
        for p in (cls.DATA_DIR, cls.LESSON_DIR, cls.AUDIO_DIR, cls.VIDEO_DIR,
                  cls.TMP_DIR, cls.UPLOAD_DIR, cls.LOG_DIR):
            p.mkdir(parents=True, exist_ok=True)

    @classmethod
    def allowed_video_roots(cls) -> list[Path]:
        """Resolved list of directories the video API may read from."""
        roots: list[Path] = [cls.VIDEO_DIR.resolve()]
        for raw in cls.VIDEO_ROOTS:
            try:
                roots.append(Path(raw).expanduser().resolve())
            except OSError:
                continue
        return roots
