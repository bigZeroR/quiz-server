"""Logging configuration - safe defaults, no secrets."""
from __future__ import annotations

import logging
import re
import sys
from logging.handlers import RotatingFileHandler
from config import Config



class _PathRedactor(logging.Filter):
    """Redact absolute home paths from log records (privacy)."""

    _RE = re.compile(r"/(?:home|Users)/[^/\s]+")

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = record.getMessage()
        except Exception:
            return True
        if self._RE.search(msg):
            record.msg = self._RE.sub("/<user>", msg)
            record.args = ()
        return True


def setup_logging(level: int = logging.INFO) -> None:
    Config.ensure_dirs()
    fmt = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    formatter = logging.Formatter(fmt)

    root = logging.getLogger()
    root.setLevel(level)
    for h in list(root.handlers):
        root.removeHandler(h)

    redactor = _PathRedactor()
    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(formatter)
    stream.addFilter(redactor)
    root.addHandler(stream)

    fileh = RotatingFileHandler(
        Config.LOG_DIR / "app.log", maxBytes=5_000_000, backupCount=3, encoding="utf-8"
    )
    fileh.setFormatter(formatter)
    fileh.addFilter(redactor)
    root.addHandler(fileh)

    logging.getLogger("werkzeug").setLevel(logging.WARNING)
