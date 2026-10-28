"""Rate limiter: unit behavior + integration (domain-safe: GET never throttled)."""
from __future__ import annotations

import pytest

from core.rate_limit import RateLimiter


def test_allow_under_limit():
    rl = RateLimiter(limit=3, window_seconds=60)
    for _ in range(3):
        ok, retry = rl.allow(("1.2.3.4", "video"), now=100.0)
        assert ok and retry == 0


def test_blocks_over_limit():
    rl = RateLimiter(limit=2, window_seconds=60)
    assert rl.allow(("ip", "b"), now=100.0)[0] is True
    assert rl.allow(("ip", "b"), now=100.0)[0] is True
    ok, retry = rl.allow(("ip", "b"), now=100.0)
    assert ok is False
    assert retry >= 1


def test_window_slides():
    rl = RateLimiter(limit=1, window_seconds=10)
    assert rl.allow(("ip", "b"), now=100.0)[0] is True
    assert rl.allow(("ip", "b"), now=105.0)[0] is False
    assert rl.allow(("ip", "b"), now=111.0)[0] is True


def test_keys_are_isolated():
    rl = RateLimiter(limit=1, window_seconds=60)
    assert rl.allow(("ip1", "b"), now=1.0)[0] is True
    assert rl.allow(("ip2", "b"), now=1.0)[0] is True
    assert rl.allow(("ip1", "b"), now=1.0)[0] is False


def test_buckets_are_isolated():
    rl = RateLimiter(limit=1, window_seconds=60)
    assert rl.allow(("ip", "video"), now=1.0)[0] is True
    assert rl.allow(("ip", "audio"), now=1.0)[0] is True


def test_zero_limit_is_clamped():
    rl = RateLimiter(limit=0, window_seconds=60)
    assert rl.allow(("ip", "b"), now=1.0)[0] is True
    assert rl.allow(("ip", "b"), now=1.0)[0] is False


@pytest.fixture
def low_limit_app(monkeypatch, tmp_data_dir):
    """Fresh app with a very low limit so we can trigger 429 quickly."""
    from config import Config
    monkeypatch.setattr(Config, "DATA_DIR", tmp_data_dir)
    monkeypatch.setattr(Config, "RATE_LIMIT_PER_MIN", 2)
    from server import create_app
    return create_app()


def test_post_api_throttled_returns_429(low_limit_app):
    client = low_limit_app.test_client()
    codes = [
        client.post("/api/v1/video/formats").status_code,  # POST to API
        client.post("/api/v1/video/formats").status_code,
        client.post("/api/v1/video/formats").status_code,
    ]
    assert codes[0] != 429
    assert codes[1] != 429
    assert codes[2] == 429


def test_get_is_never_throttled(low_limit_app):
    client = low_limit_app.test_client()
    for _ in range(10):
        assert client.get("/healthz").status_code == 200
        assert client.get("/api/v1/video/formats").status_code == 200


def test_html_routes_not_throttled(low_limit_app):
    client = low_limit_app.test_client()
    for _ in range(10):
        assert client.get("/").status_code == 200


def test_429_body_shape(low_limit_app):
    client = low_limit_app.test_client()
    client.post("/api/v1/video/formats")
    client.post("/api/v1/video/formats")
    resp = client.post("/api/v1/video/formats")
    assert resp.status_code == 429
    body = resp.get_json()
    assert body["success"] is False
    assert body["code"] == "rate_limited"
    assert resp.headers.get("Retry-After")


def test_disabled_when_zero(monkeypatch, tmp_data_dir):
    from config import Config
    monkeypatch.setattr(Config, "DATA_DIR", tmp_data_dir)
    monkeypatch.setattr(Config, "RATE_LIMIT_PER_MIN", 0)
    from server import create_app
    app = create_app()
    assert "rate_limiter" not in app.extensions
    client = app.test_client()
    for _ in range(20):
        assert client.post("/api/v1/video/formats").status_code != 429
