"""Business logic around quizzes (list/get/save/edit/delete)."""
from __future__ import annotations

import logging

from core.repository import QuizRepository
from core.errors import ValidationError

log = logging.getLogger(__name__)


class QuizService:
    """High-level operations on quizzes."""

    def __init__(self, repo: QuizRepository) -> None:
        self._repo = repo

    def list_all(self, *, reload: bool = False) -> list[dict]:
        return self._repo.list_quizzes(reload=reload)

    def get(self, name: str) -> dict:
        return self._repo.get_quiz(name)

    def save(self, name: str, data: dict) -> dict:
        return self._repo.save_quiz(name, data)

    def update_question(self, name: str, question_id: str, payload: dict) -> dict:
        if not question_id:
            raise ValidationError("شناسه سوال الزامی است")
        return self._repo.update_question(name, question_id, payload)

    def delete_question(self, name: str, question_id: str) -> dict:
        if not question_id:
            raise ValidationError("شناسه سوال الزامی است")
        return self._repo.delete_question(name, question_id)

    def search(self, query: str, *, limit: int = 100) -> dict:
        results = self._repo.search(query, limit=limit)
        return {"query": query, "count": len(results), "results": results}

    def categories(self, name: str) -> list[dict]:
        quiz = self._repo.get_quiz(name)
        stats: dict[str, int] = {}
        for q in quiz["questions"]:
            cat = q.get("category") or "عمومی"
            stats[cat] = stats.get(cat, 0) + 1
        return [{"id": k, "label": k, "count": v} for k, v in sorted(stats.items())]
