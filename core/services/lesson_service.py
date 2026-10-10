"""Lesson (درسنامه) service — CRUD on JSON files in Config.LESSON_DIR."""
from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path

from config import Config
from core import security
from core.errors import NotFoundError, ValidationError
from core.schema import normalize_lesson

log = logging.getLogger(__name__)

_LOCKS: dict[str, threading.RLock] = {}
_GUARD = threading.Lock()


def _lock_for(name: str) -> threading.RLock:
    with _GUARD:
        if name not in _LOCKS:
            _LOCKS[name] = threading.RLock()
        return _LOCKS[name]


class LessonService:
    """Load / save / list lessons stored as ``data/lessons/<name>.json``."""

    def __init__(self, lesson_dir: Path | None = None) -> None:
        self._dir = lesson_dir or Config.LESSON_DIR
        self._dir.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, dict] = {}
        self._cache_lock = threading.RLock()

    # ── Public API ────────────────────────────────────────────
    def list_all(self, *, reload: bool = False) -> list[dict]:
        if reload or not self._cache:
            self._reload()
        with self._cache_lock:
            return [self._meta(n, l) for n, l in sorted(self._cache.items())]

    def get(self, name: str) -> dict:
        if not self._cache:
            self._reload()
        with self._cache_lock:
            if name not in self._cache:
                self._reload()
            if name not in self._cache:
                raise NotFoundError("درسنامه یافت نشد")
            return json.loads(json.dumps(self._cache[name], ensure_ascii=False))

    def save(self, name: str, raw: dict) -> dict:
        safe = security.sanitize_quiz_name(name)
        lesson = normalize_lesson(raw, lesson_name=safe)
        path = security.lesson_path(safe)
        with _lock_for(safe):
            self._atomic_write(path, lesson)
            with self._cache_lock:
                self._cache[safe] = lesson
        log.info("Saved lesson %s (%d sections)", safe, len(lesson["sections"]))
        return lesson

    def update(self, name: str, raw: dict) -> dict:
        # ensure exists
        self.get(name)
        return self.save(name, raw)

    def delete(self, name: str) -> None:
        path = security.lesson_path(name)
        if not path.exists():
            raise NotFoundError("درسنامه یافت نشد")
        path.unlink()
        with self._cache_lock:
            self._cache.pop(name, None)
        log.info("Deleted lesson %s", name)

    def for_quiz(self, quiz_name: str) -> dict | None:
        """Return the first lesson whose ``quiz_name`` matches, or None."""
        if not self._cache:
            self._reload()
        with self._cache_lock:
            for name, lesson in self._cache.items():
                if lesson.get("quiz_name") == quiz_name:
                    meta = self._meta(name, lesson)
                    meta["sections_count"] = len(lesson.get("sections", []))
                    return meta
        return None

    def invalidate(self) -> None:
        with self._cache_lock:
            self._cache.clear()

    # ── Internal ──────────────────────────────────────────────
    def _reload(self) -> None:
        new_cache: dict[str, dict] = {}
        for file in sorted(self._dir.glob("*.json")):
            name = file.stem
            try:
                with file.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                new_cache[name] = normalize_lesson(data, lesson_name=name)
            except Exception as e:  # noqa: BLE001
                log.warning("Failed to load lesson %s: %s", file.name, e)
        with self._cache_lock:
            self._cache = new_cache

    def _meta(self, name: str, lesson: dict) -> dict:
        return {
            "file": name,
            "title": lesson.get("title", name),
            "description": lesson.get("description", ""),
            "quiz_name": lesson.get("quiz_name", ""),
            "level": lesson.get("level", 1),
            "tags": lesson.get("tags", []),
            "sections_count": len(lesson.get("sections", [])),
        }

    @staticmethod
    def _atomic_write(path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
