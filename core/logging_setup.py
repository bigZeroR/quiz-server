"""Logging configuration - safe defaults, no secrets."""
from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from config import Config


def setup_logging(level: int = logging.INFO) -> None:
    Config.ensure_dirs()
    fmt = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    formatter = logging.Formatter(fmt)

    root = logging.getLogger()
    root.setLevel(level)
    for h in list(root.handlers):
        root.removeHandler(h)

    stream = logging.StreamHandler(sys.stdout)
    stream.setFormatter(formatter)
    root.addHandler(stream)

    fileh = RotatingFileHandler(
        Config.LOG_DIR / "app.log", maxBytes=5_000_000, backupCount=3, encoding="utf-8"
    )
    fileh.setFormatter(formatter)
    root.addHandler(fileh)

    logging.getLogger("werkzeug").setLevel(logging.WARNING)
