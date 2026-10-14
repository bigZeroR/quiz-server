"""Config defaults must be safe."""
from __future__ import annotations

import importlib
import os
import sys


def _reload_config(monkeypatch, **env):
    """Reload config module with a controlled environment."""
    # Clear quiz-related env vars
    for k in list(os.environ.keys()):
        if k.startswith("QUIZ_"):
            monkeypatch.delenv(k, raising=False)
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    if "config" in sys.modules:
        del sys.modules["config"]
    return importlib.import_module("config")


def test_default_host_is_localhost(monkeypatch):
    cfg = _reload_config(monkeypatch)
    assert cfg.Config.HOST == "127.0.0.1"


def test_default_debug_is_off(monkeypatch):
    cfg = _reload_config(monkeypatch)
    assert cfg.Config.DEBUG is False


def test_debug_can_be_enabled(monkeypatch):
    cfg = _reload_config(monkeypatch, QUIZ_DEBUG="1")
    assert cfg.Config.DEBUG is True


def test_secret_key_is_generated_when_missing(monkeypatch):
    cfg = _reload_config(monkeypatch)
    assert cfg.Config.SECRET_KEY
    assert len(cfg.Config.SECRET_KEY) >= 32


def test_secret_key_from_env(monkeypatch):
    cfg = _reload_config(monkeypatch, QUIZ_SECRET_KEY="x" * 64)
    assert cfg.Config.SECRET_KEY == "x" * 64


def test_video_roots_empty_by_default(monkeypatch):
    cfg = _reload_config(monkeypatch)
    assert cfg.Config.VIDEO_ROOTS == ()


def test_video_roots_parsed(monkeypatch):
    cfg = _reload_config(monkeypatch, QUIZ_VIDEO_ROOTS="/tmp/a, /tmp/b ,")
    assert cfg.Config.VIDEO_ROOTS == ("/tmp/a", "/tmp/b")


def test_allowed_video_roots_always_contains_video_dir(monkeypatch):
    cfg = _reload_config(monkeypatch)
    roots = cfg.Config.allowed_video_roots()
    assert cfg.Config.VIDEO_DIR.resolve() in roots
