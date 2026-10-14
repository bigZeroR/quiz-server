"""Security utilities: sanitization and path traversal protection."""
from __future__ import annotations

import pytest

from core import security
from core.errors import SecurityError, ValidationError


# ── sanitize_quiz_name ──────────────────────────────────────
@pytest.mark.parametrize("name,expected", [
    ("linux-basics", "linux-basics"),
    ("My_Quiz-01", "my_quiz-01"),
    ("  spaced  ", "spaced"),
])
def test_sanitize_quiz_name_ok(name, expected):
    assert security.sanitize_quiz_name(name) == expected


@pytest.mark.parametrize("bad", [
    "", "   ", "../etc/passwd", "..\\windows", "con", "prn",
    ".hidden", "a/b", "foo bar", "سلام", "a" * 100, "-leading",
])
def test_sanitize_quiz_name_rejects(bad):
    with pytest.raises(ValidationError):
        security.sanitize_quiz_name(bad)


# ── sanitize_filename ───────────────────────────────────────
def test_sanitize_filename_ascii():
    assert security.sanitize_filename("hello world.mp3") == "hello_world.mp3"


def test_sanitize_filename_strips_path():
    assert security.sanitize_filename("../../etc/passwd") == "passwd"


def test_sanitize_filename_empty_fallback():
    assert security.sanitize_filename("???") == "file"


# ── ensure_within ───────────────────────────────────────────
def test_ensure_within_ok(tmp_path):
    base = tmp_path / "base"
    base.mkdir()
    child = base / "a" / "b.txt"
    child.parent.mkdir()
    child.write_text("x")
    assert security.ensure_within(base, child) == child.resolve()


def test_ensure_within_blocks_escape(tmp_path):
    base = tmp_path / "base"
    base.mkdir()
    outside = tmp_path / "outside.txt"
    outside.write_text("x")
    with pytest.raises(SecurityError):
        security.ensure_within(base, outside)


def test_ensure_within_blocks_symlink_escape(tmp_path):
    base = tmp_path / "base"
    base.mkdir()
    outside = tmp_path / "target.txt"
    outside.write_text("x")
    link = base / "link.txt"
    try:
        link.symlink_to(outside)
    except OSError:
        pytest.skip("symlinks not supported on this platform")
    with pytest.raises(SecurityError):
        security.ensure_within(base, link)
