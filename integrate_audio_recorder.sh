#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  integrate_audio_recorder.sh
#  نصب audio-recorder به عنوان وابستگی محلی و بازنویسی audio_service
#  Usage: bash integrate_audio_recorder.sh [project_root]
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

if [ ! -f "server.py" ]; then
    echo "❌ server.py یافت نشد. از ریشه پروژه اجرا کنید."
    exit 1
fi

echo "═══════════════════════════════════════════════════════"
echo " 🎧 Integrating audio-recorder into quiz-server"
echo "═══════════════════════════════════════════════════════"

# ─── 1. بررسی پیش‌نیازها ──────────────────────────────────────
echo "▶ Checking prerequisites..."
MISSING=0
for cmd in git python3 pip ffmpeg; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "  ✗ $cmd یافت نشد"
        MISSING=$((MISSING+1))
    else
        echo "  ✓ $cmd"
    fi
done

if [ "$MISSING" -gt 0 ]; then
    echo ""
    echo "⚠️  برخی پیش‌نیازها نصب نیستند. برای نصب:"
    echo "   Ubuntu/Debian: sudo apt install git python3 python3-pip ffmpeg"
    echo "   macOS:         brew install git python3 ffmpeg"
    echo "   Windows:       از winget یا choco نصب کنید"
    exit 1
fi

# ─── 2. فعال‌سازی venv (اگر وجود دارد) ────────────────────────
if [ -d "venv" ]; then
    echo "▶ Activating venv..."
    # shellcheck disable=SC1091
    source venv/bin/activate
elif [ -d ".venv" ]; then
    echo "▶ Activating .venv..."
    # shellcheck disable=SC1091
    source .venv/bin/activate
fi

# ─── 3. کلون کردن audio-recorder در vendor/ ───────────────────
mkdir -p vendor
if [ ! -d "vendor/audio-recorder/.git" ]; then
    echo "▶ Cloning audio-recorder..."
    git clone --depth 1 https://github.com/bigZeroR/audio-recorder.git vendor/audio-recorder
else
    echo "  ✓ vendor/audio-recorder already exists"
    echo "▶ Updating..."
    git -C vendor/audio-recorder pull --ff-only || true
fi

# ─── 4. نصب به صورت editable ──────────────────────────────────
echo "▶ Installing audio-recorder (editable)..."
pip install -q -e vendor/audio-recorder

# ─── 5. افزودن به requirements.txt ────────────────────────────
if ! grep -q "vendor/audio-recorder" requirements.txt 2>/dev/null; then
    echo "-e vendor/audio-recorder" >> requirements.txt
    echo "  ✓ Added to requirements.txt"
fi

# ─── 6. .gitignore برای vendor ────────────────────────────────
if ! grep -q "^vendor/" .gitignore 2>/dev/null; then
    echo "vendor/" >> .gitignore
    echo "  ✓ Added vendor/ to .gitignore"
fi

# ─── 7. بازنویسی core/services/audio_service.py ───────────────
echo "▶ Rewriting core/services/audio_service.py..."
mkdir -p core/services

cat > core/services/audio_service.py <<'PY_EOF'
"""Audio subsystem — powered by the external ``audio-recorder`` package.

This module is a thin adapter that exposes the same public API as before
(``list_audio_devices``, ``AudioRecorder``, ``list_audio_files``, etc.)
while delegating the heavy lifting to ``audio_recorder``.

Public API (unchanged):
    * list_audio_devices() -> list[dict]
    * AudioRecorder(name, device_id, preset, output_format)
    * list_audio_files() -> list[dict]
    * get_audio_file(filename) -> Path
    * import_audio_from_path(source_path, name) -> dict
    * delete_audio_file(filename) -> None
"""
from __future__ import annotations

import logging
import shutil
import time
from pathlib import Path

from config import Config
from core import security
from core.errors import AppError, NotFoundError, ValidationError

# ── audio-recorder imports ──────────────────────────────────────
# The package is installed editable from vendor/audio-recorder.
try:
    from audio_recorder.audio.backends import get_backend
    from audio_recorder.audio.device import AudioDevice
    from audio_recorder.config import PRESETS, Config as ARConfig
    from audio_recorder.exporter import AudioExporter
    from audio_recorder.ffmpeg_engine import FFmpegEngine
    from audio_recorder.file_manager import FileManager
    from audio_recorder.processing.pipeline import ProcessingPipeline
    from audio_recorder.recorder import Recorder
    _AUDIO_RECORDER_AVAILABLE = True
except ImportError as _e:  # pragma: no cover
    _AUDIO_RECORDER_AVAILABLE = False
    _AUDIO_RECORDER_IMPORT_ERROR = str(_e)

log = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════
#  Device enumeration
# ═══════════════════════════════════════════════════════════════

def list_audio_devices() -> list[dict]:
    """Return the list of audio devices available on this machine.

    Uses the cross-platform backend from ``audio_recorder``.
    Returns an empty list if the backend cannot be initialised.
    """
    if not _AUDIO_RECORDER_AVAILABLE:
        log.warning("audio-recorder not available: %s", _AUDIO_RECORDER_IMPORT_ERROR)
        return []

    try:
        backend = get_backend()
    except Exception as e:  # noqa: BLE001
        log.warning("Audio backend unavailable: %s", e)
        return []

    try:
        devices = backend.list_devices()
    except Exception as e:  # noqa: BLE001
        log.warning("Device enumeration failed: %s", e)
        return []

    return [
        {
            "id": d.id,
            "name": d.name,
            "kind": d.kind.value,
            "backend": d.backend,
            "is_default": d.is_default,
        }
        for d in devices
    ]


# ═══════════════════════════════════════════════════════════════
#  Recorder
# ═══════════════════════════════════════════════════════════════

class AudioRecorder:
    """Record audio via ``audio_recorder.Recorder`` and save into AUDIO_DIR.

    Supports the same preset/output-format pipeline as the CLI tool:
        preset:  speech | lecture | general | raw
        format:  mp3 | wav | flac
    """

    def __init__(
        self,
        name: str,
        device_id: str = "",
        preset: str = "general",
        output_format: str = "mp3",
    ) -> None:
        if not _AUDIO_RECORDER_AVAILABLE:
            raise AppError(
                "audio-recorder نصب نیست. اسکریپت integrate_audio_recorder.sh را اجرا کنید."
            )

        self.name = name
        self.device_id = device_id
        self.preset = preset if preset in PRESETS else "general"
        self.output_format = output_format if output_format in ("mp3", "wav", "flac") else "mp3"

        self._backend = None
        self._device: AudioDevice | None = None
        self._recorder: Recorder | None = None
        self._ar_config: ARConfig | None = None
        self._file_manager: FileManager | None = None
        self._started_at: float = 0.0
        self._raw_path: Path | None = None

    # ── Public state ────────────────────────────────────────────

    @property
    def is_recording(self) -> bool:
        return self._recorder is not None and self._recorder.is_recording

    # ── Device resolution ───────────────────────────────────────

    def _resolve_device(self) -> AudioDevice:
        """Return the ``AudioDevice`` matching ``device_id`` or the default."""
        if self._backend is None:
            self._backend = get_backend()
        devices = self._backend.list_devices()
        if not devices:
            raise AppError("هیچ دستگاه صوتی یافت نشد")

        if self.device_id:
            for d in devices:
                if d.id == self.device_id:
                    return d

        default = self._backend.default_input() or self._backend.default_output()
        if default:
            return default
        return devices[0]

    # ── Recording lifecycle ─────────────────────────────────────

    def start(self) -> Path:
        """Begin recording. Returns the path to the raw WAV file."""
        if self.is_recording:
            raise AppError("ضبط در حال اجراست")

        Config.ensure_dirs()

        self._ar_config = ARConfig(
            output_dir=Config.AUDIO_DIR,
            temp_dir=Config.TMP_DIR,
            output_format=self.output_format,
            default_preset=self.preset,
        )
        self._file_manager = FileManager(
            output_dir=Config.AUDIO_DIR,
            temp_dir=Config.TMP_DIR,
        )
        self._raw_path = self._file_manager.create_temp_file(suffix=".wav")

        engine = FFmpegEngine(binary="ffmpeg")
        self._recorder = Recorder(
            engine=engine,
            sample_rate=self._ar_config.sample_rate,
            channels=self._ar_config.channels,
        )

        device = self._resolve_device()
        self._device = device
        self._recorder.start(device=device, output_path=self._raw_path)
        self._started_at = time.time()
        log.info("Recording started: device=%s -> %s", device, self._raw_path)
        return self._raw_path

    def stop(self) -> dict:
        """Stop recording, post-process, and return file info.

        Returns:
            dict with ``filename``, ``duration_seconds``, ``size_bytes``.
        """
        if not self.is_recording or self._recorder is None or self._raw_path is None:
            raise AppError("ضبطی در حال اجرا نیست")

        try:
            self._recorder.stop()
        except Exception as e:  # noqa: BLE001
            log.error("Recorder.stop() failed: %s", e)
            self._cleanup()
            raise AppError(f"خطا در توقف ضبط: {e}") from e

        duration = round(time.time() - self._started_at, 2)

        # ── Post-processing + export ──
        output_path: Path | None = None
        try:
            pipeline = ProcessingPipeline.from_preset(
                PRESETS[self.preset], playback_speed=1.0
            )
            exporter = AudioExporter(FFmpegEngine(), self._ar_config)
            stem = FileManager.sanitize_name(self.name)
            output_path = self._file_manager.build_output_path(stem, self.output_format)
            exporter.export(self._raw_path, output_path, pipeline)
        except Exception as e:  # noqa: BLE001
            log.exception("Export failed, falling back to raw WAV")
            output_path = self._raw_path
        finally:
            if output_path != self._raw_path and not self._ar_config.keep_temp_file:
                FileManager.safe_remove(self._raw_path)

        size = output_path.stat().st_size if output_path.exists() else 0
        log.info(
            "Recording stopped: %s (%.2fs, %d bytes, preset=%s, format=%s)",
            output_path.name, duration, size, self.preset, self.output_format,
        )

        result = {
            "filename": output_path.name,
            "duration_seconds": duration,
            "size_bytes": size,
        }
        self._cleanup()
        return result

    def _cleanup(self) -> None:
        """Reset internal state after stop/failure."""
        self._recorder = None
        self._raw_path = None


# ═══════════════════════════════════════════════════════════════
#  Audio file management
# ═══════════════════════════════════════════════════════════════

def list_audio_files() -> list[dict]:
    """List all supported audio files in ``Config.AUDIO_DIR``."""
    files: list[dict] = []
    for f in sorted(
        Config.AUDIO_DIR.glob("*"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    ):
        if f.suffix.lower() not in Config.ALLOWED_AUDIO_EXT:
            continue
        st = f.stat()
        files.append({
            "filename": f.name,
            "size_bytes": st.st_size,
            "modified": int(st.st_mtime),
        })
    return files


def get_audio_file(filename: str) -> Path:
    """Return a validated path to an audio file inside AUDIO_DIR.

    Raises:
        NotFoundError: file does not exist.
        ValidationError: extension not allowed.
        SecurityError: path traversal attempt.
    """
    p = security.audio_path(filename)
    if not p.exists() or not p.is_file():
        raise NotFoundError("فایل صوتی یافت نشد")
    if p.suffix.lower() not in Config.ALLOWED_AUDIO_EXT:
        raise ValidationError("پسوند فایل مجاز نیست")
    return p


def import_audio_from_path(source_path: str, name: str) -> dict:
    """Copy an external audio file into ``Config.AUDIO_DIR``."""
    src = Path(source_path).expanduser()
    if not src.exists() or not src.is_file():
        raise NotFoundError("فایل مبدأ یافت نشد")
    if src.suffix.lower() not in Config.ALLOWED_AUDIO_EXT:
        raise ValidationError("پسوند فایل مجاز نیست")

    safe_name = security.sanitize_filename(name or src.name)
    if not safe_name.lower().endswith(tuple(Config.ALLOWED_AUDIO_EXT)):
        safe_name += src.suffix.lower()

    dst = security.audio_path(safe_name)
    shutil.copy2(src, dst)
    log.info("Imported audio: %s -> %s", src, dst.name)
    return {"filename": dst.name, "size_bytes": dst.stat().st_size}


def delete_audio_file(filename: str) -> None:
    """Delete an audio file from ``Config.AUDIO_DIR``."""
    p = get_audio_file(filename)
    p.unlink()
    log.info("Deleted audio: %s", p.name)
PY_EOF

echo "  ✓ core/services/audio_service.py rewritten"

# ─── 8. بازنویسی routes/audio_routes.py (پشتیبانی از preset/format) ──
echo "▶ Updating routes/audio_routes.py..."

cat > routes/audio_routes.py <<'PY_EOF'
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
PY_EOF

echo "  ✓ routes/audio_routes.py updated"

# ─── 9. بروزرسانی templates/audio.html ──────────────────────────
echo "▶ Updating templates/audio.html..."

cat > templates/audio.html <<'HTML_EOF'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>مدیریت ضبط صدا | Quiz Server</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
<div class="creator-container" style="max-width:900px;margin:40px auto;padding:0 16px;">
    <header class="creator-header" style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
        <a href="/" class="back-btn">←</a>
        <h1 style="margin:0;">🎧 مدیریت ضبط صدا</h1>
    </header>

    <section class="form-section" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:12px;padding:24px;margin-bottom:24px;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--accent);margin-bottom:16px;">🎙️ ضبط جدید</div>

        <div style="margin-bottom:12px;">
            <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-secondary);">نام ضبط *</label>
            <input type="text" id="recName" class="form-input" placeholder="مثال: درس شبکه جلسه ۳"
                   style="width:100%;padding:10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary);box-sizing:border-box;">
        </div>

        <div style="margin-bottom:12px;">
            <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-secondary);">دستگاه ورودی</label>
            <select id="recDevice" class="form-select"
                    style="width:100%;padding:10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary);box-sizing:border-box;">
                <option value="">پیش‌فرض</option>
            </select>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
                <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-secondary);">Preset</label>
                <select id="recPreset" class="form-select"
                        style="width:100%;padding:10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary);box-sizing:border-box;">
                    <option value="general" selected>general</option>
                    <option value="speech">speech (نویزگیری قوی)</option>
                    <option value="lecture">lecture (سخنرانی)</option>
                    <option value="raw">raw (بدون پردازش)</option>
                </select>
            </div>
            <div>
                <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--text-secondary);">فرمت</label>
                <select id="recFormat" class="form-select"
                        style="width:100%;padding:10px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary);box-sizing:border-box;">
                    <option value="mp3" selected>MP3</option>
                    <option value="wav">WAV</option>
                    <option value="flac">FLAC</option>
                </select>
            </div>
        </div>

        <div style="display:flex;gap:10px;">
            <button class="btn btn-primary" id="btnStart">▶️ شروع ضبط</button>
            <button class="btn btn-danger" id="btnStop" disabled>⏹️ توقف</button>
        </div>
        <div id="recStatus" style="margin-top:12px;color:var(--text-secondary);font-family:monospace;font-size:0.85rem;"></div>
    </section>

    <section class="form-section" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:12px;padding:24px;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--accent);margin-bottom:16px;">📁 فایل‌های موجود</div>
        <div id="filesList">در حال بارگذاری...</div>
    </section>
</div>

<script src="/static/js/api.js"></script>
<script src="/static/js/sanitize.js"></script>
<script>
  const { escapeHtml } = Sanitize;
  const recName = document.getElementById('recName');
  const recDevice = document.getElementById('recDevice');
  const recPreset = document.getElementById('recPreset');
  const recFormat = document.getElementById('recFormat');
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const recStatus = document.getElementById('recStatus');
  const filesList = document.getElementById('filesList');

  async function loadDevices() {
    try {
      const r = await API.listDevices();
      recDevice.innerHTML = '<option value="">پیش‌فرض</option>';
      r.devices.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.name} (${d.kind})`;
        if (d.is_default) opt.textContent += ' ⭐';
        recDevice.appendChild(opt);
      });
    } catch (e) {
      recStatus.textContent = '⚠️ خطا در دریافت دستگاه‌ها: ' + e.message;
    }
  }

  async function loadFiles() {
    try {
      const r = await API.listAudioFiles();
      if (!r.files.length) { filesList.textContent = 'هیچ فایلی وجود ندارد.'; return; }
      filesList.innerHTML = '';
      r.files.forEach(f => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;padding:10px;border-bottom:1px solid var(--border-subtle);align-items:center;gap:8px;';
        const info = document.createElement('span');
        info.textContent = `${f.filename} (${(f.size_bytes/1024).toFixed(1)} KB)`;
        info.style.fontSize = '0.85rem';
        const actions = document.createElement('span');
        actions.style.display = 'flex';
        actions.style.gap = '6px';
        const dl = document.createElement('a');
        dl.href = `/api/v1/audio/files/${encodeURIComponent(f.filename)}`;
        dl.textContent = '⬇️';
        dl.className = 'btn btn-ghost';
        dl.title = 'دانلود';
        const del = document.createElement('button');
        del.textContent = '🗑️';
        del.className = 'btn btn-danger';
        del.title = 'حذف';
        del.onclick = async () => {
          if (!confirm(`"${f.filename}" حذف شود؟`)) return;
          try { await API.deleteAudio(f.filename); loadFiles(); }
          catch (e) { alert(e.message); }
        };
        actions.appendChild(dl);
        actions.appendChild(del);
        row.appendChild(info);
        row.appendChild(actions);
        filesList.appendChild(row);
      });
    } catch (e) {
      filesList.textContent = 'خطا در بارگذاری: ' + e.message;
    }
  }

  btnStart.onclick = async () => {
    const name = recName.value.trim();
    if (!name) { alert('نام ضبط را وارد کنید'); return; }
    btnStart.disabled = true;
    recStatus.textContent = '⏳ در حال شروع...';
    try {
      await API.startRecording(name, recDevice.value, recPreset.value, recFormat.value);
      btnStop.disabled = false;
      recStatus.textContent = '⏺ در حال ضبط...';
    } catch (e) {
      btnStart.disabled = false;
      recStatus.textContent = '❌ خطا: ' + e.message;
    }
  };

  btnStop.onclick = async () => {
    btnStop.disabled = true;
    recStatus.textContent = '⏳ در حال پردازش...';
    try {
      const r = await API.stopRecording();
      btnStart.disabled = false;
      recStatus.textContent = `✅ ذخیره شد: ${r.filename} (${r.duration_seconds}s، ${(r.size_bytes/1024).toFixed(1)}KB)`;
      loadFiles();
    } catch (e) {
      btnStart.disabled = false;
      recStatus.textContent = '❌ خطا: ' + e.message;
    }
  };

  loadDevices();
  loadFiles();
</script>
</body>
</html>
HTML_EOF

echo "  ✓ templates/audio.html updated"

# ─── 10. بروزرسانی static/js/api.js برای پشتیبانی از preset/format ──
echo "▶ Patching static/js/api.js..."

if [ -f "static/js/api.js" ]; then
    # اگر خط startRecording قدیمی است، جایگزین کن
    python3 - <<'PY'
from pathlib import Path
p = Path("static/js/api.js")
src = p.read_text(encoding="utf-8")

old = "startRecording: (name, deviceId) => request(`${BASE}/audio/record/start`, {\n      method: 'POST', body: JSON.stringify({ name, device_id: deviceId }),\n    }),"
new = ("startRecording: (name, deviceId, preset, format) => request(`${BASE}/audio/record/start`, {\n"
       "      method: 'POST',\n"
       "      body: JSON.stringify({\n"
       "        name,\n"
       "        device_id: deviceId || '',\n"
       "        preset: preset || 'general',\n"
       "        format: format || 'mp3',\n"
       "      }),\n"
       "    }),")

if old in src:
    src = src.replace(old, new)
    p.write_text(src, encoding="utf-8")
    print("  ✓ patched")
else:
    print("  ⏭  no change needed (pattern not found)")
PY
else
    echo "  ⚠️  static/js/api.js not found — skipping"
fi

# ─── 11. تست نصب ───────────────────────────────────────────────
echo ""
echo "▶ Testing imports..."
python3 - <<'PY'
import sys
try:
    from audio_recorder.recorder import Recorder
    from audio_recorder.audio.backends import get_backend
    from audio_recorder.config import PRESETS
    print("  ✓ audio_recorder package OK")
    print("    presets:", list(PRESETS.keys()))
except Exception as e:
    print("  ✗ import failed:", e)
    sys.exit(1)

try:
    from core.services import audio_service
    print("  ✓ core.services.audio_service OK")
except Exception as e:
    print("  ✗ audio_service import failed:", e)
    sys.exit(1)
PY

echo ""
echo "═══════════════════════════════════════════════════════"
echo " ✅ Integration complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo " Next steps:"
echo "   1. bash run.sh"
echo "   2. Open http://127.0.0.1:5000/audio"
echo ""
echo " New API endpoint:"
echo "   GET  /api/v1/audio/presets    → لیست presetها و فرمت‌ها"
echo "   POST /api/v1/audio/record/start"
echo "        body: {name, device_id, preset, format}"
echo ""
echo " Presets: speech | lecture | general | raw"
echo " Formats: mp3 | wav | flac"
echo ""
