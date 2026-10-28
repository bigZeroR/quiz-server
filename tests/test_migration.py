"""Schema versioning and pre-migration backup (additive, domain-safe)."""
from __future__ import annotations

import json

from core.schema import SCHEMA_VERSION, normalize_quiz, normalize_lesson
from core.repository import QuizRepository


def _quiz():
    return {"title": "T", "questions": [{"text": "Q?", "options": ["a", "b"], "correct": 0}]}


def test_normalize_quiz_adds_schema_version():
    out = normalize_quiz(_quiz(), quiz_name="demo")
    assert out["schema_version"] == SCHEMA_VERSION


def test_normalize_quiz_preserves_existing_version():
    q = _quiz()
    q["schema_version"] = 3
    out = normalize_quiz(q, quiz_name="demo")
    assert out["schema_version"] == 3


def test_normalize_quiz_bad_version_falls_back():
    q = _quiz()
    q["schema_version"] = "garbage"
    out = normalize_quiz(q, quiz_name="demo")
    assert out["schema_version"] == SCHEMA_VERSION


def test_normalize_lesson_adds_schema_version():
    out = normalize_lesson({"title": "L", "sections": [{"content": "x"}]}, lesson_name="l1")
    assert out["schema_version"] == SCHEMA_VERSION


def test_legacy_file_is_backed_up_before_migration(tmp_data_dir, monkeypatch):
    from config import Config
    monkeypatch.setattr(Config, "DATA_DIR", tmp_data_dir)
    legacy = tmp_data_dir / "demo.json"
    legacy.write_text(json.dumps({
        "title": "Demo",
        "questions": [{"id": "q1", "text": "Q?", "options": ["a", "b"], "correct": 0}],
    }), encoding="utf-8")

    repo = QuizRepository(data_dir=tmp_data_dir)
    repo.save_quiz("demo", {
        "title": "Demo",
        "questions": [{"id": "q1", "text": "Q?", "options": ["a", "b"], "correct": 0}],
    })

    bak = tmp_data_dir / "demo.json.bak"
    assert bak.is_file(), "legacy file must be backed up once"
    saved = json.loads(legacy.read_text(encoding="utf-8"))
    assert saved["schema_version"] == SCHEMA_VERSION


def test_backup_is_not_overwritten(tmp_data_dir, monkeypatch):
    from config import Config
    monkeypatch.setattr(Config, "DATA_DIR", tmp_data_dir)
    legacy = tmp_data_dir / "demo.json"
    legacy.write_text(json.dumps({"title": "Old", "questions": [
        {"id": "q1", "text": "Q?", "options": ["a", "b"], "correct": 0}
    ]}), encoding="utf-8")

    repo = QuizRepository(data_dir=tmp_data_dir)
    repo.save_quiz("demo", {"title": "New1", "questions": [
        {"id": "q1", "text": "Q?", "options": ["a", "b"], "correct": 0}
    ]})
    bak = tmp_data_dir / "demo.json.bak"
    first = bak.read_text(encoding="utf-8")

    repo.save_quiz("demo", {"title": "New2", "questions": [
        {"id": "q1", "text": "Q?", "options": ["a", "b"], "correct": 0}
    ]})
    assert bak.read_text(encoding="utf-8") == first, "backup must not be overwritten"
