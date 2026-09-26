"""Text session management for Mobile → Server → AI flow."""
from __future__ import annotations

import logging
import threading
import time
import uuid

from config import Config
from core.errors import NotFoundError, ValidationError

log = logging.getLogger(__name__)

_SESSION_TTL_SECONDS = 60 * 60


class TextSessionService:
    """In-memory text sessions (user-submitted text awaiting AI processing)."""

    def __init__(self) -> None:
        self._sessions: dict[str, dict] = {}
        self._lock = threading.RLock()

    def create(self, text: str, *, title: str = "") -> dict:
        text = (text or "").strip()
        if not text:
            raise ValidationError("متن خالی است")
        if len(text) > Config.ALLOWED_TEXT_MAX_CHARS:
            raise ValidationError("متن بیش از حد طولانی است")
        self._gc()
        sid = uuid.uuid4().hex
        with self._lock:
            self._sessions[sid] = {
                "id": sid,
                "title": title.strip() or f"session_{sid[:6]}",
                "text": text,
                "created_at": time.time(),
                "draft": None,
            }
        log.info("Text session %s created (%d chars)", sid, len(text))
        return self._public(sid)

    def get(self, sid: str) -> dict:
        with self._lock:
            s = self._sessions.get(sid)
            if not s:
                raise NotFoundError("Session یافت نشد")
            if time.time() - s["created_at"] > _SESSION_TTL_SECONDS:
                self._sessions.pop(sid, None)
                raise NotFoundError("Session منقضی شده است")
            return self._public(sid)

    def get_raw(self, sid: str) -> dict:
        with self._lock:
            s = self._sessions.get(sid)
            if not s:
                raise NotFoundError("Session یافت نشد")
            return dict(s)

    def attach_draft(self, sid: str, draft: dict) -> dict:
        with self._lock:
            s = self._sessions.get(sid)
            if not s:
                raise NotFoundError("Session یافت نشد")
            s["draft"] = draft
            return self._public(sid)

    def delete(self, sid: str) -> None:
        with self._lock:
            self._sessions.pop(sid, None)

    def _gc(self) -> None:
        now = time.time()
        with self._lock:
            stale = [k for k, v in self._sessions.items()
                     if now - v["created_at"] > _SESSION_TTL_SECONDS]
            for k in stale:
                self._sessions.pop(k, None)

    def _public(self, sid: str) -> dict:
        s = self._sessions[sid]
        return {
            "id": s["id"],
            "title": s["title"],
            "text": s["text"],
            "created_at": s["created_at"],
            "has_draft": s["draft"] is not None,
        }


text_session_service = TextSessionService()
