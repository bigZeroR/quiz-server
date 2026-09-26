"""Quiz repository - the only place that touches JSON files."""
from __future__ import annotations

import json
import logging
import os
import threading
import time
from pathlib import Path

from config import Config
from core import security
from core.errors import NotFoundError
from core.schema import detect_quiz_type, normalize_quiz, normalize_question

log = logging.getLogger(__name__)

_QUIZ_LOCKS: dict[str, threading.RLock] = {}
_LOCKS_GUARD = threading.Lock()


def _lock_for(name: str) -> threading.RLock:
    with _LOCKS_GUARD:
        if name not in _QUIZ_LOCKS:
            _QUIZ_LOCKS[name] = threading.RLock()
        return _QUIZ_LOCKS[name]


class QuizRepository:
    """Data access layer for quizzes stored as JSON files."""

    def __init__(self, data_dir: Path | None = None) -> None:
        self._data_dir = data_dir or Config.DATA_DIR
        self._data_dir.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, dict] = {}
        self._cache_lock = threading.RLock()

    def list_quizzes(self, *, reload: bool = False) -> list[dict]:
        if reload:
            self._reload()
        if not self._cache:
            self._reload()
        with self._cache_lock:
            return [self._meta(name, data) for name, data in self._cache.items()]

    def get_quiz(self, name: str) -> dict:
        if not self._cache:
            self._reload()
        with self._cache_lock:
            if name not in self._cache:
                self._reload()
            if name not in self._cache:
                raise NotFoundError("آزمون یافت نشد")
            return json.loads(json.dumps(self._cache[name], ensure_ascii=False))

    def save_quiz(self, name: str, raw: dict) -> dict:
        safe_name = security.sanitize_quiz_name(name)
        quiz = normalize_quiz(raw, quiz_name=safe_name)
        path = security.quiz_path(safe_name)

        with _lock_for(safe_name):
            self._atomic_write(path, quiz)
            with self._cache_lock:
                self._cache[safe_name] = quiz
        log.info("Saved quiz %s (%d questions)", safe_name, len(quiz["questions"]))
        return quiz

    def update_question(self, name: str, question_id: str, updated: dict) -> dict:
        quiz = self.get_quiz(name)
        norm = normalize_question(updated, salt=name)
        norm["id"] = str(question_id)

        for i, q in enumerate(quiz["questions"]):
            if str(q.get("id")) == str(question_id):
                quiz["questions"][i] = norm
                break
        else:
            raise NotFoundError("سوال یافت نشد")

        return self.save_quiz(name, quiz)

    def delete_question(self, name: str, question_id: str) -> dict:
        quiz = self.get_quiz(name)
        before = len(quiz["questions"])
        quiz["questions"] = [q for q in quiz["questions"] if str(q.get("id")) != str(question_id)]
        if len(quiz["questions"]) == before:
            raise NotFoundError("سوال یافت نشد")
        return self.save_quiz(name, quiz)

    def append_questions(self, name: str, new_questions: list[dict]) -> dict:
        try:
            quiz = self.get_quiz(name)
        except NotFoundError:
            quiz = {"title": name, "description": "", "type": "general", "level": 1, "questions": []}

        existing_ids = {str(q.get("id")) for q in quiz["questions"]}
        for i, raw in enumerate(new_questions):
            norm = normalize_question(raw, salt=name)
            if norm["id"] in existing_ids:
                norm["id"] = f"{norm['id']}_{int(time.time()*1000)}_{i}"
            existing_ids.add(norm["id"])
            quiz["questions"].append(norm)
        return self.save_quiz(name, quiz)

    def search(self, query: str, *, limit: int = 100) -> list[dict]:
        if not query:
            return []
        q_lower = query.lower()
        if not self._cache:
            self._reload()

        results: list[dict] = []
        with self._cache_lock:
            for quiz_name, quiz in self._cache.items():
                title = quiz.get("title", quiz_name)
                for q in quiz.get("questions", []):
                    blob = " ".join([
                        str(q.get("text", "")),
                        " ".join(map(str, q.get("options", []))),
                        str(q.get("explanation", "")),
                        str(q.get("category", "")),
                    ]).lower()
                    if q_lower in blob:
                        results.append({
                            "quiz_name": quiz_name,
                            "quiz_title": title,
                            "question_id": q.get("id"),
                            "question_text": q.get("text", ""),
                            "category": q.get("category", ""),
                            "level": q.get("level", 1),
                            "options": q.get("options", []),
                            "correct": q.get("correct", 0),
                            "explanation": q.get("explanation", ""),
                        })
                        if len(results) >= limit:
                            return results
        return results

    def invalidate(self) -> None:
        with self._cache_lock:
            self._cache.clear()

    def _reload(self) -> None:
        new_cache: dict[str, dict] = {}
        for file in sorted(self._data_dir.glob("*.json")):
            name = file.stem
            try:
                with file.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                quiz = normalize_quiz(data, quiz_name=name)
                quiz["type"] = data.get("type") or detect_quiz_type(data, name)
                new_cache[name] = quiz
            except Exception as e:
                log.warning("Failed to load %s: %s", file.name, e)
        with self._cache_lock:
            self._cache = new_cache

    def _meta(self, name: str, quiz: dict) -> dict:
        return {
            "file": name,
            "title": quiz.get("title", name),
            "description": quiz.get("description", ""),
            "count": len(quiz.get("questions", [])),
            "type": quiz.get("type", "general"),
            "level": quiz.get("level", 1),
        }

    @staticmethod
    def _atomic_write(path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
