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
        """Return the AudioDevice matching device_id or the best default.

        Priority when no explicit device_id is given:
            1. Explicit match by id
            2. First *input* device (real microphone)
            3. First device whose kind is NOT monitor
            4. Fallback to the first available device
        """
        if self._backend is None:
            self._backend = get_backend()
        devices = self._backend.list_devices()
        if not devices:
            raise AppError("هیچ دستگاه صوتی یافت نشد")

        # 1. Explicit match
        if self.device_id:
            for d in devices:
                if d.id == self.device_id:
                    return d

        # 2. Prefer real input (microphone)
        for d in devices:
            if d.kind.value == "input":
                return d

        # 3. Avoid monitor-only devices
        for d in devices:
            if d.kind.value != "monitor":
                return d

        # 4. Last resort
        return devices[0]

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
