"""AI + Text Session endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from core.services.ai_service import AIService
from core.services.text_session_service import text_session_service
from core.errors import ValidationError

bp = Blueprint("ai", __name__, url_prefix="/api/v1")
_ai = AIService()


def _ok(payload: dict | None = None, status: int = 200):
    body = {"success": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


@bp.post("/sessions")
def create_session():
    body = request.get_json(silent=True) or {}
    session = text_session_service.create(
        text=body.get("text", ""),
        title=body.get("title", ""),
    )
    return _ok({"session": session}, 201)


@bp.get("/sessions/<sid>")
def get_session(sid: str):
    return _ok({"session": text_session_service.get(sid)})


@bp.delete("/sessions/<sid>")
def delete_session(sid: str):
    text_session_service.delete(sid)
    return _ok()


@bp.post("/ai/generate")
def ai_generate():
    body = request.get_json(silent=True) or {}
    sid = body.get("session_id")
    if not sid:
        raise ValidationError("session_id الزامی است")

    raw_session = text_session_service.get_raw(sid)
    existing_categories = body.get("existing_categories") or []

    result = _ai.generate_from_text(
        text=raw_session["text"],
        hint_title=raw_session["title"],
        existing_categories=existing_categories,
        target_count=int(body.get("target_count", 10)),
    )
    text_session_service.attach_draft(sid, result["draft"])
    return _ok({"draft": result["draft"], "session_id": sid})


@bp.post("/ai/validate")
def ai_validate():
    from core.schema import normalize_quiz
    body = request.get_json(silent=True) or {}
    candidate = body.get("quiz") or {}
    quiz = normalize_quiz(candidate, quiz_name="external_draft")
    return _ok({"quiz": quiz})
