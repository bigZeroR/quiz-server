"""Shared pytest fixtures."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Ensure project root is importable
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture
def tmp_data_dir(tmp_path: Path, monkeypatch) -> Path:
    """Point Config.DATA_DIR at a fresh temporary directory."""
    from config import Config
    d = tmp_path / "data"
    d.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(Config, "DATA_DIR", d)
    return d


@pytest.fixture
def tmp_lesson_dir(tmp_path: Path, monkeypatch) -> Path:
    from config import Config
    d = tmp_path / "lessons"
    d.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(Config, "LESSON_DIR", d)
    return d


@pytest.fixture
def tmp_storage(tmp_path: Path, monkeypatch) -> Path:
    from config import Config
    s = tmp_path / "storage"
    (s / "audio").mkdir(parents=True, exist_ok=True)
    (s / "videos").mkdir(parents=True, exist_ok=True)
    (s / "tmp").mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(Config, "STORAGE_DIR", s)
    monkeypatch.setattr(Config, "AUDIO_DIR", s / "audio")
    monkeypatch.setattr(Config, "VIDEO_DIR", s / "videos")
    monkeypatch.setattr(Config, "TMP_DIR", s / "tmp")
    return s
