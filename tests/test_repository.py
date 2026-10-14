"""Repository: atomic write, caching, concurrency."""
from __future__ import annotations

import json
import threading

import pytest

from core.errors import NotFoundError
from core.repository import QuizRepository


def _sample_quiz(name: str = "Demo") -> dict:
    return {
        "title": name,
        "questions": [
            {"id": "q1", "text": "Q?", "options": ["a", "b"], "correct": 0},
        ],
    }


def test_save_and_get(tmp_data_dir, monkeypatch):
    from config import Config
    monkeypatch.setattr(Config, "DATA_DIR", tmp_data_dir)
    repo = QuizRepository(data_dir=tmp_data_dir)
    repo.save_quiz("demo", _sample_quiz())
    got = repo.get_quiz("demo")
    assert got["title"] == "Demo"
    assert len(got["questions"]) == 1


def test_missing_quiz_raises(tmp_data_dir):
    repo = QuizRepository(data_dir=tmp_data_dir)
    with pytest.raises(NotFoundError):
        repo.get_quiz("nope")


def test_list_returns_metadata(tmp_data_dir):
    repo = QuizRepository(data_dir=tmp_data_dir)
    repo.save_quiz("a", _sample_quiz("A"))
    repo.save_quiz("b", _sample_quiz("B"))
    metas = repo.list_quizzes()
    names = sorted(m["file"] for m in metas)
    assert names == ["a", "b"]
    for m in metas:
        assert m["count"] == 1


def test_atomic_write_leaves_no_tmp(tmp_data_dir):
    repo = QuizRepository(data_dir=tmp_data_dir)
    repo.save_quiz("demo", _sample_quiz())
    tmp_files = list(tmp_data_dir.glob("*.tmp"))
    assert tmp_files == []


def test_concurrent_saves_do_not_corrupt(tmp_data_dir):
    """Many threads saving the same quiz must not break JSON."""
    repo = QuizRepository(data_dir=tmp_data_dir)
    errors: list[Exception] = []

    def worker(i: int):
        try:
            repo.save_quiz("shared", _sample_quiz(f"T{i}"))
        except Exception as e:  # noqa: BLE001
            errors.append(e)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(20)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert not errors, f"errors during concurrent save: {errors[:3]}"

    # File must still be valid JSON
    path = tmp_data_dir / "shared.json"
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    assert "questions" in data


def test_delete_question(tmp_data_dir):
    repo = QuizRepository(data_dir=tmp_data_dir)
    repo.save_quiz("demo", _sample_quiz())
    repo.delete_question("demo", "q1")
    got = repo.get_quiz("demo")
    assert got["questions"] == []


def test_delete_missing_question(tmp_data_dir):
    repo = QuizRepository(data_dir=tmp_data_dir)
    repo.save_quiz("demo", _sample_quiz())
    with pytest.raises(NotFoundError):
        repo.delete_question("demo", "nope")


def test_update_question(tmp_data_dir):
    repo = QuizRepository(data_dir=tmp_data_dir)
    repo.save_quiz("demo", _sample_quiz())
    repo.update_question("demo", "q1", {
        "id": "q1", "text": "Updated?", "options": ["x", "y"], "correct": 1,
    })
    got = repo.get_quiz("demo")
    assert got["questions"][0]["text"] == "Updated?"
