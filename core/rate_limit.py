"""Tiny in-memory rate limiter (no external deps, domain-safe).

Only mutating API requests (POST/PUT/PATCH/DELETE) under /api/v1/ or /api/
are throttled. GET requests and HTML pages are never affected.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from flask import Flask, jsonify, request


class RateLimiter:
    """Sliding-window limiter keyed by (client_ip, bucket)."""

    def __init__(self, *, limit: int, window_seconds: int = 60) -> None:
        self.limit = max(1, int(limit))
        self.window = max(1, int(window_seconds))
        self._hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: tuple[str, str], now: float | None = None) -> tuple[bool, int]:
        """Return (allowed, retry_after_seconds)."""
        now = time.monotonic() if now is None else now
        cutoff = now - self.window
        with self._lock:
            q = self._hits[key]
            while q and q[0] <= cutoff:
                q.popleft()
            if len(q) >= self.limit:
                retry = max(1, int(self.window - (now - q[0])))
                return False, retry
            q.append(now)
            return True, 0


def _client_key() -> str:
    # Intentionally ignores X-Forwarded-For unless a proxy strips it.
    return request.remote_addr or "unknown"


def install(app: Flask, *, limit: int, window_seconds: int = 60) -> RateLimiter:
    """Attach a before_request limiter to the app."""
    limiter = RateLimiter(limit=limit, window_seconds=window_seconds)
    app.extensions["rate_limiter"] = limiter

    @app.before_request
    def _enforce():
        if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
            return None
        path = request.path or ""
        if not (path.startswith("/api/v1/") or path.startswith("/api/")):
            return None
        bucket = path.split("/")[3] if path.startswith("/api/v1/") else "legacy"
        allowed, retry = limiter.allow((_client_key(), bucket))
        if allowed:
            return None
        resp = jsonify({
            "success": False,
            "code": "rate_limited",
            "error": "تعداد درخواست‌ها بیش از حد مجاز است",
            "retry_after": retry,
        })
        resp.status_code = 429
        resp.headers["Retry-After"] = str(retry)
        return resp

    return limiter
