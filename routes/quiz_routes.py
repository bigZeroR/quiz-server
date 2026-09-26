"""Quiz / question / search endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from core.errors import AppError
from core.services.quiz_service import QuizService
from core.repository import QuizRepository

bp = Blueprint("quiz", __name__, url_prefix="/api/v1")
_service = QuizService(QuizRepository())


def _ok(payload: dict | None = None, status: int = 200):
    body = {"success": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


@bp.get("/quizzes")
def list_quizzes():
    return _ok({"quizzes": _service.list_all(reload=request.args.get("reload") == "1")})


@bp.get("/quizzes/<name>")
def get_quiz(name: str):
    return _ok({"quiz": _service.get(name), "name": name})


@bp.get("/quizzes/<name>/categories")
def categories(name: str):
    return _ok({"categories": _service.categories(name)})


@bp.post("/quizzes/<name>")
def save_quiz(name: str):
    data = request.get_json(silent=True) or {}
    _service.save(name, data)
    return _ok({"redirect": f"/quiz/{name}"}, 201)


@bp.post("/quizzes/<name>/questions")
def append_questions(name: str):
    body = request.get_json(silent=True) or {}
    questions = body.get("questions", [])
    if not isinstance(questions, list):
        raise AppError("questions باید آرایه باشد")
    repo = QuizRepository()
    repo.append_questions(name, questions)
    return _ok(status=201)


@bp.put("/quizzes/<name>/questions/<question_id>")
def update_question(name: str, question_id: str):
    body = request.get_json(silent=True) or {}
    _service.update_question(name, question_id, body)
    return _ok()


@bp.delete("/quizzes/<name>/questions/<question_id>")
def delete_question(name: str, question_id: str):
    _service.delete_question(name, question_id)
    return _ok()


@bp.get("/search")
def search():
    q = request.args.get("q", "").strip()
    return _ok(_service.search(q))


@bp.get("/reload")
def reload_cache():
    repo = QuizRepository()
    repo.invalidate()
    quizzes = repo.list_quizzes(reload=True)
    return _ok({"message": f"کش پاک شد و {len(quizzes)} آزمون بارگذاری شد"})
