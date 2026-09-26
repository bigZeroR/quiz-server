"""Application configuration - all tunables in one place."""
from __future__ import annotations

import os
from pathlib import Path


class Config:
    """Central configuration (env-overridable)."""

    BASE_DIR: Path = Path(__file__).resolve().parent
    DATA_DIR: Path = Path(os.getenv("QUIZ_DATA_DIR", BASE_DIR / "data"))
    STORAGE_DIR: Path = Path(os.getenv("QUIZ_STORAGE_DIR", BASE_DIR / "storage"))
    AUDIO_DIR: Path = STORAGE_DIR / "audio"
    TMP_DIR: Path = STORAGE_DIR / "tmp"
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    LOG_DIR: Path = STORAGE_DIR / "logs"

    HOST: str = os.getenv("QUIZ_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("QUIZ_PORT", "5000"))
    DEBUG: bool = os.getenv("QUIZ_DEBUG", "1") == "1"
    SECRET_KEY: str = os.getenv("QUIZ_SECRET_KEY", "dev-only-change-me")

    MAX_UPLOAD_MB: int = int(os.getenv("QUIZ_MAX_UPLOAD_MB", "64"))
    MAX_AUDIO_SECONDS: int = int(os.getenv("QUIZ_MAX_AUDIO_SECONDS", "600"))
    ALLOWED_AUDIO_EXT: tuple[str, ...] = (".wav", ".mp3", ".ogg", ".m4a", ".flac", ".webm")
    ALLOWED_TEXT_MAX_CHARS: int = int(os.getenv("QUIZ_TEXT_MAX_CHARS", "200000"))

    AI_PROVIDER: str = os.getenv("QUIZ_AI_PROVIDER", "openai_compatible")
    AI_BASE_URL: str = os.getenv("QUIZ_AI_BASE_URL", "https://api.openai.com/v1")
    AI_API_KEY: str = os.getenv("QUIZ_AI_API_KEY", "")
    AI_MODEL: str = os.getenv("QUIZ_AI_MODEL", "gpt-4o-mini")
    AI_TIMEOUT: int = int(os.getenv("QUIZ_AI_TIMEOUT", "60"))

    @classmethod
    def ensure_dirs(cls) -> None:
        for p in (cls.DATA_DIR, cls.AUDIO_DIR, cls.TMP_DIR,
                  cls.UPLOAD_DIR, cls.LOG_DIR):
            p.mkdir(parents=True, exist_ok=True)
