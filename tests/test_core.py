"""Core unit tests - runnable via `pytest tests/`."""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

os.environ.setdefault("QUIZ_DATA_DIR", "/tmp/quiz_test_data")

from core import schema, security
from core.errors import SecurityError, ValidationError
from core.repository import QuizRepository


def test_normalize_question_minimal():
    q = schema.normalize_question({"text": "Q?", "options": ["a", "b"], "correct": 1})
    assert q["text"] == "Q?"
    assert q["correct"] == 1
    assert q["category"] == schema.DEFAULT_CATEGORY
    assert q["id"].startswith("q_")


def test_normalize_question_rejects_bad_correct():
    with pytest.raises(ValidationError):
        schema.normalize_question({"text": "Q?", "options": ["a", "b"], "correct": 5})


def test_normalize_question_keeps_existing_id():
    q = schema.normalize_question({"id": "42", "text": "Q?", "options": ["a", "b"], "correct": 0})
    assert q["id"] == "42"


def test_stable_id_is_deterministic():
    a = schema.stable_id("hello", ["x", "y"])
    b = schema.stable_id("hello", ["x", "y"])
    assert a == b


def test_field_alias_detection():
    q = schema.normalize_question({"question": "Hello?", "choices": ["a", "b"], "answer": 0})
    assert q["text"] == "Hello?"
    assert q["options"] == ["a", "b"]


def test_sanitize_quiz_name_rejects_traversal():
    with pytest.raises(ValidationError):
        security.sanitize_quiz_name("../etc/passwd")
    with pytest.raises(ValidationError):
        security.sanitize_quiz_name("")
    with pytest.raises(ValidationError):
        security.sanitize_quiz_name("....")


def test_sanitize_quiz_name_accepts_normal():
    assert security.sanitize_quiz_name("My-Quiz_01") == "my-quiz_01"


def test_ensure_within_raises():
    base = Path("/tmp/base")
    with pytest.raises(SecurityError):
        security.ensure_within(base, Path("/tmp/evil"))


@pytest.fixture
def repo(tmp_path: Path):
    return QuizRepository(data_dir=tmp_path)


def test_save_and_get(repo: QuizRepository):
    repo.save_quiz("test1", {
        "title": "T",
        "questions": [{"id": "q1", "text": "?", "options": ["a", "b"], "correct": 0}],
    })
    quiz = repo.get_quiz("test1")
    assert quiz["title"] == "T"
    assert quiz["questions"][0]["id"] == "q1"


def test_delete_keeps_other_ids(repo: QuizRepository):
    repo.save_quiz("test2", {
        "title": "T",
        "questions": [
            {"id": "q1", "text": "A?", "options": ["a", "b"], "correct": 0},
            {"id": "q2", "text": "B?", "options": ["a", "b"], "correct": 0},
            {"id": "q3", "text": "C?", "options": ["a", "b"], "correct": 0},
        ],
    })
    repo.delete_question("test2", "q2")
    quiz = repo.get_quiz("test2")
    ids = [q["id"] for q in quiz["questions"]]
    assert ids == ["q1", "q3"]


def test_atomic_write_no_leftover_tmp(repo: QuizRepository, tmp_path: Path):
    repo.save_quiz("atomic", {
        "title": "T",
        "questions": [{"text": "?", "options": ["a", "b"], "correct": 0}],
    })
    assert not list(tmp_path.glob("*.tmp"))
