"""Lesson (درسنامه) endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from core.errors import AppError
from core.services.lesson_service import LessonService

bp = Blueprint("lesson", __name__, url_prefix="/api/v1/lessons")
_service = LessonService()


def _ok(payload: dict | None = None, status: int = 200):
    body = {"success": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


@bp.get("")
@bp.get("/")
def list_lessons():
    return _ok({"lessons": _service.list_all(reload=request.args.get("reload") == "1")})


@bp.get("/by-quiz/<quiz_name>")
def lesson_for_quiz(quiz_name: str):
    lesson = _service.for_quiz(quiz_name)
    return _ok({"lesson": lesson})  # null if none


@bp.get("/<name>")
def get_lesson(name: str):
    return _ok({"lesson": _service.get(name), "name": name})


@bp.post("/<name>")
def create_lesson(name: str):
    data = request.get_json(silent=True) or {}
    _service.save(name, data)
    return _ok({"redirect": f"/lessons/{name}"}, 201)


@bp.put("/<name>")
def update_lesson(name: str):
    data = request.get_json(silent=True) or {}
    _service.update(name, data)
    return _ok()


@bp.delete("/<name>")
def delete_lesson(name: str):
    _service.delete(name)
    return _ok()


@bp.get("/search")
def search_lessons():
    q = (request.args.get("q") or "").strip().lower()
    if not q:
        return _ok({"lessons": []})
    results = []
    for meta in _service.list_all():
        try:
            full = _service.get(meta["file"])
        except AppError:
            continue
        blob = " ".join([
            full.get("title", ""),
            full.get("description", ""),
            " ".join(full.get("tags", [])),
            " ".join(s.get("title", "") + " " + s.get("content", "")
                     for s in full.get("sections", [])),
        ]).lower()
        if q in blob:
            results.append(meta)
    return _ok({"lessons": results})
