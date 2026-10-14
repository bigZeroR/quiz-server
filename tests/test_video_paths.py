"""Video service: path restriction."""
from __future__ import annotations

from pathlib import Path

import pytest

from config import Config
from core.errors import NotFoundError, ValidationError
from core.services import video_service


@pytest.fixture
def fake_video(tmp_path: Path) -> Path:
    f = tmp_path / "clip.mp4"
    f.write_bytes(b"\x00" * 32)
    return f


def test_is_under_true(tmp_path):
    root = tmp_path / "root"
    root.mkdir()
    child = root / "a.txt"
    child.write_text("x")
    assert video_service._is_under(child, [root])


def test_is_under_false(tmp_path):
    root = tmp_path / "root"
    root.mkdir()
    other = tmp_path / "other.txt"
    other.write_text("x")
    assert not video_service._is_under(other, [root])


def test_is_under_multiple_roots(tmp_path):
    a = tmp_path / "a"; a.mkdir()
    b = tmp_path / "b"; b.mkdir()
    f = b / "f.txt"; f.write_text("x")
    assert video_service._is_under(f, [a, b])


def test_resolve_local_path_missing(tmp_path):
    with pytest.raises(NotFoundError):
        video_service._resolve_local_path(str(tmp_path / "nope.mp4"))


def test_resolve_local_path_wrong_ext(tmp_path):
    f = tmp_path / "file.txt"
    f.write_text("x")
    with pytest.raises(ValidationError):
        video_service._resolve_local_path(str(f))


def test_resolve_local_path_outside_allowed(tmp_path, monkeypatch, fake_video):
    """A valid video file outside the allowed roots is rejected."""
    allowed = tmp_path / "allowed"
    allowed.mkdir()
    monkeypatch.setattr(Config, "VIDEO_DIR", allowed)
    monkeypatch.setattr(Config, "VIDEO_ROOTS", ())

    with pytest.raises(ValidationError, match="مجاز نیست"):
        video_service._resolve_local_path(str(fake_video))


def test_resolve_local_path_inside_allowed(tmp_path, monkeypatch):
    allowed = tmp_path / "videos"
    allowed.mkdir()
    f = allowed / "clip.mp4"
    f.write_bytes(b"\x00" * 32)

    monkeypatch.setattr(Config, "VIDEO_DIR", allowed)
    monkeypatch.setattr(Config, "VIDEO_ROOTS", ())

    resolved = video_service._resolve_local_path(str(f))
    assert resolved == f.resolve()


def test_resolve_dir_outside_allowed(tmp_path, monkeypatch):
    outside = tmp_path / "outside"
    outside.mkdir()
    allowed = tmp_path / "allowed"
    allowed.mkdir()

    monkeypatch.setattr(Config, "VIDEO_DIR", allowed)
    monkeypatch.setattr(Config, "VIDEO_ROOTS", ())

    with pytest.raises(ValidationError, match="مجاز نیست"):
        video_service._resolve_dir(str(outside))


def test_resolve_dir_inside_allowed(tmp_path, monkeypatch):
    allowed = tmp_path / "videos"
    allowed.mkdir()
    monkeypatch.setattr(Config, "VIDEO_DIR", allowed)
    monkeypatch.setattr(Config, "VIDEO_ROOTS", ())
    assert video_service._resolve_dir(str(allowed)) == allowed.resolve()


def test_video_roots_extends_allowed(tmp_path, monkeypatch):
    allowed = tmp_path / "allowed"; allowed.mkdir()
    extra = tmp_path / "extra"; extra.mkdir()
    f = extra / "clip.mp4"; f.write_bytes(b"\x00" * 32)

    monkeypatch.setattr(Config, "VIDEO_DIR", allowed)
    monkeypatch.setattr(Config, "VIDEO_ROOTS", (str(extra),))

    resolved = video_service._resolve_local_path(str(f))
    assert resolved == f.resolve()
