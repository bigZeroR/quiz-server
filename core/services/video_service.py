"""Local video → audio extraction (ffmpeg)."""
from __future__ import annotations

import json
import logging
import re
import shutil
import subprocess
import time
from pathlib import Path

from config import Config
from core.errors import AppError, NotFoundError, ValidationError

log = logging.getLogger(__name__)

VIDEO_EXTS = (".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".wmv", ".m4v", ".ts", ".mpg", ".mpeg")
AUDIO_FORMATS = ("mp3", "wav", "flac", "m4a", "opus", "aac")


def _require_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None:
        raise AppError("ffmpeg نصب نیست (sudo apt install ffmpeg)")


# ── Name standardization ────────────────────────────────────

def standardize_name(raw: str, fallback: str = "audio") -> str:
    """Convert a filename/title into a safe lowercase ascii name (no ext)."""
    if not raw:
        return fallback
    s = Path(raw).stem.strip().lower()
    s = re.sub(r"[\s\.]+", "-", s)
    s = re.sub(r"[^a-z0-9\-_]", "", s)
    s = re.sub(r"-{2,}", "-", s).strip("-_")
    if not s:
        return fallback
    return s[:80]


def _safe_output_stem(name: str, fallback: str) -> str:
    """Sanitize output file stem; allows unicode letters too."""
    raw = Path(name or "").name
    raw = re.sub(r'[\x00-\x1f<>:"/\\|?*]+', "_", raw).strip(" .")
    if not raw:
        raw = fallback
    return raw[:120]


# ── Path safety ─────────────────────────────────────────────

def _is_under(path: Path, roots: list[Path]) -> bool:
    try:
        rp = path.resolve()
    except OSError:
        return False
    for root in roots:
        try:
            rp.relative_to(root)
            return True
        except ValueError:
            continue
    return False


def _resolve_local_path(raw_path: str) -> Path:
    """Expand ~, resolve, and validate the path is a file under an allowed root."""
    if not raw_path or not raw_path.strip():
        raise ValidationError("مسیر فایل الزامی است")
    p = Path(raw_path).expanduser()
    try:
        p = p.resolve(strict=True)
    except (OSError, FileNotFoundError):
        raise NotFoundError(f"فایل یافت نشد: {raw_path}")
    if not p.is_file():
        raise ValidationError("مسیر باید به یک فایل اشاره کند")
    if p.suffix.lower() not in VIDEO_EXTS:
        raise ValidationError(
            f"فرمت پشتیبانی نمی‌شود. مجاز: {', '.join(VIDEO_EXTS)}"
        )
    if not _is_under(p, Config.allowed_video_roots()):
        raise ValidationError(
            "این مسیر مجاز نیست. برای افزودن مسیر، QUIZ_VIDEO_ROOTS را ست کنید."
        )
    return p


def _resolve_dir(raw_path: str) -> Path:
    if not raw_path or not raw_path.strip():
        raise ValidationError("مسیر پوشه الزامی است")
    p = Path(raw_path).expanduser()
    try:
        p = p.resolve(strict=True)
    except (OSError, FileNotFoundError):
        raise NotFoundError(f"پوشه یافت نشد: {raw_path}")
    if not p.is_dir():
        raise ValidationError("مسیر باید یک پوشه باشد")
    if not _is_under(p, Config.allowed_video_roots()):
        raise ValidationError(
            "این مسیر مجاز نیست. برای افزودن مسیر، QUIZ_VIDEO_ROOTS را ست کنید."
        )
    return p


def probe(path: Path) -> dict:
    """Return duration / size / title for a local video file."""
    if shutil.which("ffprobe") is None:
        return {"duration": None, "size": path.stat().st_size, "title": path.stem}
    try:
        out = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration:format_tags=title",
                "-of", "json", str(path),
            ],
            capture_output=True, text=True, timeout=15, check=False,
        )
        data = json.loads(out.stdout or "{}")
    except Exception as e:  # noqa: BLE001
        log.debug("ffprobe failed on %s: %s", path, e)
        data = {}

    fmt = data.get("format", {}) or {}
    duration = None
    try:
        duration = float(fmt.get("duration")) if fmt.get("duration") else None
    except (TypeError, ValueError):
        duration = None

    tags = fmt.get("tags") or {}
    title = tags.get("title") or path.stem

    return {
        "duration": duration,
        "size": path.stat().st_size,
        "title": title,
    }


def _entry(path: Path) -> dict:
    info = probe(path)
    return {
        "path": str(path),
        "filename": path.name,
        "title": info["title"],
        "duration": info["duration"],
        "size_bytes": info["size"],
        "suggested_name": standardize_name(
            info["title"] or path.stem,
            fallback=standardize_name(path.stem, fallback="video"),
        ),
    }


# ── Listing ─────────────────────────────────────────────────

def list_videos_in_dir(raw_dir: str) -> dict:
    """List video files in a local directory (non-recursive)."""
    p = _resolve_dir(raw_dir)
    files = []
    try:
        for f in sorted(p.iterdir(), key=lambda x: x.name.lower()):
            if f.is_file() and f.suffix.lower() in VIDEO_EXTS:
                files.append(_entry(f))
    except PermissionError as e:
        raise AppError(f"دسترسی به پوشه ممکن نیست: {e}") from e
    return {"dir": str(p), "count": len(files), "files": files}


def list_videos_in_default_dir() -> dict:
    """List videos in Config.VIDEO_DIR."""
    Config.ensure_dirs()
    return list_videos_in_dir(str(Config.VIDEO_DIR))


# ── Extraction ──────────────────────────────────────────────

def extract_audio(raw_path: str, output_name: str, fmt: str = "mp3",
                  *, bitrate: str = "192k") -> dict:
    """Extract audio from a local video file into Config.AUDIO_DIR."""
    _require_ffmpeg()
    src = _resolve_local_path(raw_path)

    fmt = fmt.lower().strip()
    if fmt not in AUDIO_FORMATS:
        fmt = "mp3"

    info = probe(src)
    duration = info.get("duration")
    hard_limit = max(Config.MAX_AUDIO_SECONDS * 6, 3600)
    if duration and duration > hard_limit:
        raise ValidationError(
            f"مدت ویدیو ({int(duration)}s) از حد مجاز ({hard_limit}s) بیشتر است"
        )

    Config.ensure_dirs()

    stem = _safe_output_stem(output_name, fallback=src.stem)
    target = Config.AUDIO_DIR / f"{stem}.{fmt}"
    n = 1
    while target.exists():
        target = Config.AUDIO_DIR / f"{stem}_{n}.{fmt}"
        n += 1

    # codec-specific flags
    codec_args: list[str] = []
    if fmt == "mp3":
        codec_args = ["-c:a", "libmp3lame", "-b:a", bitrate]
    elif fmt == "wav":
        codec_args = ["-c:a", "pcm_s16le"]
    elif fmt == "flac":
        codec_args = ["-c:a", "flac"]
    elif fmt == "m4a":
        codec_args = ["-c:a", "aac", "-b:a", bitrate]
    elif fmt == "aac":
        codec_args = ["-c:a", "aac", "-b:a", bitrate]
    elif fmt == "opus":
        codec_args = ["-c:a", "libopus", "-b:a", "128k"]

    cmd = [
        "ffmpeg", "-y",
        "-i", str(src),
        "-vn",
        *codec_args,
        str(target),
    ]

    log.info("ffmpeg extract: %s → %s", src.name, target.name)
    started = time.time()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True, text=True,
            timeout=hard_limit * 4,
            check=False,
        )
    except subprocess.TimeoutExpired:
        target.unlink(missing_ok=True)
        raise AppError("زمان استخراج بیش از حد طول کشید")

    if proc.returncode != 0:
        target.unlink(missing_ok=True)
        tail = (proc.stderr or "")[-500:]
        log.error("ffmpeg failed: %s", tail)
        raise AppError(f"خطای ffmpeg: {tail}")

    elapsed = round(time.time() - started, 2)
    size = target.stat().st_size
    log.info("Extracted %s (%.1fs, %d bytes) in %ss",
             target.name, duration or 0, size, elapsed)

    return {
        "filename": target.name,
        "size_bytes": size,
        "duration_seconds": duration,
        "source": src.name,
        "elapsed_seconds": elapsed,
    }
