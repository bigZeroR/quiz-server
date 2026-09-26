"""Security utilities: sanitization, path-traversal protection."""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path

from config import Config
from core.errors import SecurityError, ValidationError


_SAFE_NAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_\-]{0,63}$")


def sanitize_quiz_name(raw: str) -> str:
    if not isinstance(raw, str):
        raise ValidationError("نام آزمون باید متن باشد")
    name = raw.strip().lower()
    if not name:
        raise ValidationError("نام آزمون الزامی است")
    name = Path(name).name
    if name.startswith(".") or name in {"con", "prn", "aux", "nul"}:
        raise ValidationError("نام آزمون نامعتبر است")
    if not _SAFE_NAME.match(name):
        raise ValidationError("نام آزمون فقط می‌تواند شامل حروف انگلیسی، اعداد، - و _ باشد")
    return name


def sanitize_filename(raw: str) -> str:
    raw = Path(raw).name
    base = unicodedata.normalize("NFKD", raw).encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^A-Za-z0-9_.\-]+", "_", base).strip("._")
    return base or "file"


def ensure_within(base: Path, candidate: Path) -> Path:
    base_r = base.resolve()
    try:
        cand_r = candidate.resolve()
    except OSError as e:
        raise SecurityError("مسیر نامعتبر") from e
    try:
        cand_r.relative_to(base_r)
    except ValueError:
        raise SecurityError("دسترسی به این مسیر مجاز نیست")
    return cand_r


def quiz_path(name: str) -> Path:
    safe = sanitize_quiz_name(name)
    p = (Config.DATA_DIR / f"{safe}.json")
    return ensure_within(Config.DATA_DIR, p)


def audio_path(filename: str) -> Path:
    safe = sanitize_filename(filename)
    p = (Config.AUDIO_DIR / safe)
    return ensure_within(Config.AUDIO_DIR, p)
