"""Guards against personal data leaks and env/config regressions."""
from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
ENV_EXAMPLE = ROOT / ".env.example"

_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_SECRET = re.compile(r"(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})")


def test_env_example_exists():
    assert ENV_EXAMPLE.is_file()


def test_env_example_has_no_absolute_home_paths():
    text = ENV_EXAMPLE.read_text(encoding="utf-8")
    assert "/home/" not in text
    assert "/Users/" not in text


def test_env_example_has_no_emails():
    text = ENV_EXAMPLE.read_text(encoding="utf-8")
    assert not _EMAIL.search(text), _EMAIL.findall(text)


def test_env_example_has_no_obvious_secrets():
    text = ENV_EXAMPLE.read_text(encoding="utf-8")
    assert not _SECRET.search(text)


def test_config_loads_dotenv_not_example():
    src = (ROOT / "config.py").read_text(encoding="utf-8")
    assert 'load_dotenv(_BASE / ".env")' in src
    assert '".env.example"' not in src


def test_audio_import_blocks_system_paths():
    from core.services import audio_service
    assert audio_service._is_blocked_import_path(Path("/etc/passwd"))
    assert not audio_service._is_blocked_import_path(ROOT / "README.md")


def test_audio_import_respects_configured_roots(tmp_path, monkeypatch):
    from config import Config
    from core.services import audio_service
    from core.errors import SecurityError

    allowed = tmp_path / "allowed"
    allowed.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    src = outside / "clip.wav"
    src.write_bytes(b"RIFF0000WAVE")

    monkeypatch.setattr(Config, "AUDIO_IMPORT_ROOTS", (str(allowed),))
    with pytest.raises(SecurityError):
        audio_service.import_audio_from_path(str(src), "clip")


def test_logging_redacts_home_paths():
    import logging
    from core.logging_setup import _PathRedactor

    rec = logging.LogRecord("t", logging.INFO, __file__, 1, "path /home/alice/x", None, None)
    _PathRedactor().filter(rec)
    assert "/home/alice" not in rec.getMessage()
    assert "/<user>" in rec.getMessage()


def test_healthz_registered():
    import server
    rules = {r.rule for r in server.app.url_map.iter_rules()}
    assert "/healthz" in rules
