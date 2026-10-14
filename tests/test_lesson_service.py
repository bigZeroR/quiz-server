"""Lesson service CRUD."""
from __future__ import annotations

import pytest

from core.errors import NotFoundError, ValidationError
from core.services.lesson_service import LessonService


def _lesson(title="L"):
    return {
        "title": title,
        "description": "d",
        "sections": [{"title": "S1", "content": "hello"}],
    }


def test_save_and_get(tmp_lesson_dir):
    svc = LessonService(lesson_dir=tmp_lesson_dir)
    svc.save("demo", _lesson())
    got = svc.get("demo")
    assert got["title"] == "L"


def test_get_missing(tmp_lesson_dir):
    svc = LessonService(lesson_dir=tmp_lesson_dir)
    with pytest.raises(NotFoundError):
        svc.get("nope")


def test_invalid_name(tmp_lesson_dir):
    svc = LessonService(lesson_dir=tmp_lesson_dir)
    with pytest.raises(ValidationError):
        svc.save("../escape", _lesson())


def test_empty_sections_rejected(tmp_lesson_dir):
    svc = LessonService(lesson_dir=tmp_lesson_dir)
    with pytest.raises(ValidationError):
        svc.save("demo", {"title": "L", "sections": []})


def test_list_and_delete(tmp_lesson_dir):
    svc = LessonService(lesson_dir=tmp_lesson_dir)
    svc.save("a", _lesson("A"))
    svc.save("b", _lesson("B"))
    assert len(svc.list_all()) == 2
    svc.delete("a")
    assert len(svc.list_all()) == 1


def test_for_quiz(tmp_lesson_dir):
    svc = LessonService(lesson_dir=tmp_lesson_dir)
    data = _lesson()
    data["quiz_name"] = "linux-basics"
    svc.save("linked", data)
    meta = svc.for_quiz("linux-basics")
    assert meta is not None
    assert meta["file"] == "linked"
    assert svc.for_quiz("other-quiz") is None
