"""Schema normalization."""
from __future__ import annotations

import pytest

from core.errors import ValidationError
from core.schema import (
    normalize_lesson,
    normalize_lesson_section,
    normalize_question,
    normalize_quiz,
    stable_id,
)


# ── normalize_question ──────────────────────────────────────
def test_normalize_question_minimal():
    q = normalize_question({
        "text": "What is 2+2?",
        "options": ["3", "4", "5"],
        "correct": 1,
    })
    assert q["text"] == "What is 2+2?"
    assert q["options"] == ["3", "4", "5"]
    assert q["correct"] == 1
    assert q["id"].startswith("q_")


def test_normalize_question_alias_fields():
    q = normalize_question({
        "question": "Q?",
        "choices": ["a", "b"],
        "answer": 0,
        "topic": "math",
    })
    assert q["text"] == "Q?"
    assert q["options"] == ["a", "b"]
    assert q["correct"] == 0
    assert q["category"] == "math"


def test_normalize_question_missing_text():
    with pytest.raises(ValidationError):
        normalize_question({"options": ["a", "b"], "correct": 0})


def test_normalize_question_too_few_options():
    with pytest.raises(ValidationError):
        normalize_question({"text": "Q?", "options": ["only"], "correct": 0})


def test_normalize_question_correct_out_of_range():
    with pytest.raises(ValidationError):
        normalize_question({"text": "Q?", "options": ["a", "b"], "correct": 5})


def test_normalize_question_stable_id_is_deterministic():
    a = stable_id("Q?", ["a", "b"], salt="x")
    b = stable_id("Q?", ["a", "b"], salt="x")
    c = stable_id("Q?", ["a", "b"], salt="y")
    assert a == b != c


# ── normalize_quiz ──────────────────────────────────────────
def test_normalize_quiz_minimal():
    quiz = normalize_quiz({
        "title": "T",
        "questions": [{"text": "Q?", "options": ["a", "b"], "correct": 0}],
    }, quiz_name="demo")
    assert quiz["title"] == "T"
    assert len(quiz["questions"]) == 1


def test_normalize_quiz_empty_questions():
    with pytest.raises(ValidationError):
        normalize_quiz({"title": "T", "questions": []}, quiz_name="demo")


def test_normalize_quiz_deduplicates_ids():
    quiz = normalize_quiz({
        "title": "T",
        "questions": [
            {"id": "x", "text": "A?", "options": ["a", "b"], "correct": 0},
            {"id": "x", "text": "B?", "options": ["a", "b"], "correct": 0},
        ],
    }, quiz_name="demo")
    ids = [q["id"] for q in quiz["questions"]]
    assert len(set(ids)) == 2


# ── normalize_lesson ────────────────────────────────────────
def test_normalize_lesson_minimal():
    lesson = normalize_lesson({
        "title": "L",
        "sections": [{"title": "S1", "content": "hello"}],
    }, lesson_name="demo")
    assert lesson["title"] == "L"
    assert len(lesson["sections"]) == 1
    assert lesson["sections"][0]["content"] == "hello"


def test_normalize_lesson_string_section():
    lesson = normalize_lesson({
        "title": "L",
        "sections": ["just text"],
    }, lesson_name="demo")
    assert lesson["sections"][0]["content"] == "just text"


def test_normalize_lesson_empty_sections():
    with pytest.raises(ValidationError):
        normalize_lesson({"title": "L", "sections": []}, lesson_name="demo")


def test_normalize_lesson_section_tags_from_csv():
    s = normalize_lesson_section({"title": "T", "content": "c", "tags": "a, b, c"})
    assert s["tags"] == ["a", "b", "c"]


def test_normalize_lesson_section_qids_from_string():
    s = normalize_lesson_section({"title": "T", "content": "c", "question_ids": "q1"})
    assert s["question_ids"] == ["q1"]
