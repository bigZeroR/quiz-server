"""Audio subsystem endpoints (powered by audio-recorder)."""
from __future__ import annotations

from flask import Blueprint, jsonify, request, send_file

from core.services import audio_service

bp = Blueprint("audio", __name__, url_prefix="/api/v1/audio")

# one recorder at a time (this is a small LAN app)
_recorder: audio_service.AudioRecorder | None = None


def _ok(payload: dict | None = None, status: int = 200):
    body = {"success": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


@bp.get("/devices")
def devices():
    return _ok({"devices": audio_service.list_audio_devices()})


@bp.post("/record/start")
def start_recording():
    global _recorder
    body = request.get_json(silent=True) or {}
    name = (body.get("name") or "").strip()
    device = body.get("device_id", "")
    preset = body.get("preset", "general")
    output_format = body.get("format", "mp3")

    if not name:
        return jsonify({"success": False, "error": "نام ضبط الزامی است"}), 422
    if _recorder and _recorder.is_recording:
        return jsonify({"success": False, "error": "ضبط دیگری در حال اجراست"}), 409

    _recorder = audio_service.AudioRecorder(
        name=name,
        device_id=device,
        preset=preset,
        output_format=output_format,
    )
    try:
        path = _recorder.start()
    except Exception as e:  # noqa: BLE001
        _recorder = None
        return jsonify({"success": False, "error": str(e)}), 500

    return _ok({
        "filename": path.name,
        "preset": preset,
        "format": output_format,
    })


@bp.post("/record/stop")
def stop_recording():
    global _recorder
    if not _recorder or not _recorder.is_recording:
        return jsonify({"success": False, "error": "ضبطی در حال اجرا نیست"}), 409
    try:
        result = _recorder.stop()
    except Exception as e:  # noqa: BLE001
        _recorder = None
        return jsonify({"success": False, "error": str(e)}), 500
    _recorder = None
    return _ok(result)


@bp.get("/presets")
def presets():
    """List available processing presets and output formats."""
    return _ok({
        "presets": ["speech", "lecture", "general", "raw"],
        "formats": ["mp3", "wav", "flac"],
    })


@bp.get("/files")
def files():
    return _ok({"files": audio_service.list_audio_files()})


@bp.get("/files/<filename>")
def download(filename: str):
    path = audio_service.get_audio_file(filename)
    return send_file(path, as_attachment=True, download_name=path.name)


@bp.delete("/files/<filename>")
def remove(filename: str):
    audio_service.delete_audio_file(filename)
    return _ok()


@bp.post("/files/import")
def import_file():
    body = request.get_json(silent=True) or {}
    src = body.get("source_path", "")
    name = body.get("name", "")
    return _ok(audio_service.import_audio_from_path(src, name), 201)
