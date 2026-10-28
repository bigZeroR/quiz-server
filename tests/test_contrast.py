"""WCAG AA contrast guard for the design tokens (domain-safe, presentation only)."""
from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "static" / "style.css"


def _tokens() -> dict[str, str]:
    text = CSS.read_text(encoding="utf-8")
    return {k: v for k, v in re.findall(r"--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})", text)}


def _rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _lum(h: str) -> float:
    def f(c: int) -> float:
        s = c / 255
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4
    r, g, b = (f(x) for x in _rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _ratio(a: str, b: str) -> float:
    la, lb = _lum(a), _lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


PAIRS = [
    ("text-primary", "bg-base", 4.5),
    ("text-secondary", "bg-base", 4.5),
    ("text-tertiary", "bg-base", 4.5),
    ("text-primary", "bg-elevated", 4.5),
    ("text-primary", "bg-overlay", 4.5),
    ("accent", "bg-base", 4.5),
    ("error", "bg-base", 4.5),
]


@pytest.mark.parametrize("fg,bg,min_ratio", PAIRS)
def test_wcag_aa_contrast(fg: str, bg: str, min_ratio: float):
    t = _tokens()
    assert fg in t, f"token --{fg} missing"
    assert bg in t, f"token --{bg} missing"
    r = _ratio(t[fg], t[bg])
    assert r >= min_ratio, f"{fg} on {bg} = {r:.2f}:1 < {min_ratio}:1"
