"""Local video → audio extraction endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from config import Config
from core.errors import AppError
from core.services import video_service

bp = Blueprint("video", __name__, url_prefix="/api/v1/video")


def _ok(payload: dict | None = None, status: int = 200):
    body = {"success": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


@bp.post("/scan")
def scan():
    """List videos in a directory. If no path given, uses Config.VIDEO_DIR."""
    body = request.get_json(silent=True) or {}
    raw_dir = (body.get("dir") or "").strip()
    try:
        if raw_dir:
            data = video_service.list_videos_in_dir(raw_dir)
        else:
            data = video_service.list_videos_in_default_dir()
    except AppError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    return _ok(data)


@bp.post("/probe")
def probe():
    """Return metadata for a single video file."""
    body = request.get_json(silent=True) or {}
    raw = (body.get("path") or "").strip()
    if not raw:
        return jsonify({"success": False, "error": "مسیر فایل الزامی است"}), 422
    try:
        p = video_service._resolve_local_path(raw)
    except AppError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    entry = video_service._entry(p)
    return _ok({"file": entry})


@bp.post("/extract")
def extract():
    body = request.get_json(silent=True) or {}
    path = (body.get("path") or "").strip()
    name = (body.get("name") or "").strip()
    fmt = (body.get("format") or "mp3").strip().lower()

    if not path:
        return jsonify({"success": False, "error": "مسیر فایل الزامی است"}), 422
    if not name:
        return jsonify({"success": False, "error": "نام خروجی الزامی است"}), 422
    if fmt not in video_service.AUDIO_FORMATS:
        return jsonify({"success": False, "error": "فرمت پشتیبانی نمی‌شود"}), 422

    try:
        result = video_service.extract_audio(path, name, fmt=fmt)
    except AppError as e:
        return jsonify({"success": False, "error": e.message}), e.status_code
    return _ok(result)


@bp.get("/formats")
def formats():
    return _ok({
        "video_exts": list(video_service.VIDEO_EXTS),
        "audio_formats": list(video_service.AUDIO_FORMATS),
        "default_dir": str(Config.VIDEO_DIR),
    })
