"""Question / Quiz schema with dynamic field mapping."""
from __future__ import annotations

import hashlib
from typing import Any, Iterable

from core.errors import ValidationError


FIELD_MAP: dict[str, tuple[str, ...]] = {
    "id":          ("id", "qid", "question_id", "_id", "number"),
    "text":        ("text", "question", "title", "body", "prompt"),
    "options":     ("options", "choices", "answers", "variants"),
    "correct":     ("correct", "answer", "correct_index", "correctIndex"),
    "category":    ("category", "topic", "group", "section", "tag"),
    "level":       ("level", "difficulty", "tier"),
    "explanation": ("explanation", "reason", "why", "rationale"),
    "command":     ("command", "cmd", "shell"),
    "example":     ("example", "sample", "demo"),
}

DEFAULT_CATEGORY = "عمومی"
DEFAULT_LEVEL = 1
DEFAULT_EXPLANATION = ""


def _pick(d: dict, canonical: str, default: Any = None) -> Any:
    for alias in FIELD_MAP.get(canonical, (canonical,)):
        if alias in d and d[alias] is not None:
            return d[alias]
    return default


def stable_id(text: str, options: list[str], salt: str = "") -> str:
    h = hashlib.sha1()
    h.update(salt.encode("utf-8"))
    h.update(b"|")
    h.update(text.encode("utf-8"))
    h.update(b"|")
    h.update("||".join(options).encode("utf-8"))
    return "q_" + h.hexdigest()[:12]


def normalize_question(raw: dict, *, salt: str = "", fallback_id: str | None = None) -> dict:
    if not isinstance(raw, dict):
        raise ValidationError("سوال باید یک آبجکت باشد")

    text = str(_pick(raw, "text", "")).strip()
    if not text:
        raise ValidationError("متن سوال الزامی است")

    options_raw = _pick(raw, "options", [])
    if not isinstance(options_raw, Iterable) or isinstance(options_raw, (str, bytes)):
        raise ValidationError("گزینه‌ها باید آرایه باشند")
    options = [str(o).strip() for o in options_raw if str(o).strip()]
    if len(options) < 2:
        raise ValidationError("حداقل دو گزینه لازم است")

    correct_raw = _pick(raw, "correct", 0)
    try:
        correct = int(correct_raw)
    except (TypeError, ValueError):
        raise ValidationError("ایندکس پاسخ صحیح نامعتبر است")
    if not 0 <= correct < len(options):
        raise ValidationError("ایندکس پاسخ صحیح خارج از محدوده است")

    qid_raw = _pick(raw, "id", None)
    if qid_raw is None or qid_raw == "":
        qid = fallback_id or stable_id(text, options, salt=salt)
    else:
        qid = str(qid_raw)

    try:
        level = int(_pick(raw, "level", DEFAULT_LEVEL))
    except (TypeError, ValueError):
        level = DEFAULT_LEVEL
    level = max(1, min(9, level))

    category = str(_pick(raw, "category", DEFAULT_CATEGORY) or DEFAULT_CATEGORY).strip() or DEFAULT_CATEGORY
    explanation = str(_pick(raw, "explanation", DEFAULT_EXPLANATION) or "").strip()

    q: dict[str, Any] = {
        "id": qid,
        "text": text,
        "options": options,
        "correct": correct,
        "category": category,
        "level": level,
        "explanation": explanation,
    }

    cmd = _pick(raw, "command", None)
    if cmd:
        q["command"] = str(cmd)
    ex = _pick(raw, "example", None)
    if ex:
        q["example"] = str(ex)

    return q


def normalize_quiz(raw: dict, *, quiz_name: str = "") -> dict:
    if not isinstance(raw, dict):
        raise ValidationError("ساختار آزمون نامعتبر است")

    questions_raw = raw.get("questions", [])
    if not isinstance(questions_raw, list) or not questions_raw:
        raise ValidationError("آزمون باید حداقل یک سوال داشته باشد")

    seen_ids: set[str] = set()
    questions: list[dict] = []
    for i, q in enumerate(questions_raw):
        fallback = f"{quiz_name}_{i+1}" if quiz_name else None
        norm = normalize_question(q, salt=quiz_name, fallback_id=fallback)
        base_id = norm["id"]
        if base_id in seen_ids:
            norm["id"] = f"{base_id}_{i+1}"
        seen_ids.add(norm["id"])
        questions.append(norm)

    title = str(raw.get("title", quiz_name or "آزمون")).strip() or "آزمون"
    description = str(raw.get("description", "")).strip()
    qtype = str(raw.get("type", "general") or "general").lower()
    try:
        level = int(raw.get("level", 1))
    except (TypeError, ValueError):
        level = 1

    return {
        "title": title,
        "description": description,
        "type": qtype,
        "level": level,
        "questions": questions,
    }


def detect_quiz_type(data: dict, filename: str) -> str:
    explicit = data.get("type")
    if explicit:
        return str(explicit).lower()

    hay = f"{filename} {data.get('title', '')}".lower()
    for token, label in (("network", "network"), ("شبکه", "network"),
                         ("command", "command"), ("دستور", "command"),
                         ("linux", "linux"), ("لینوکس", "linux")):
        if token in hay:
            return label

    for q in data.get("questions", [])[:5]:
        if isinstance(q, dict):
            if "command" in q or "example" in q:
                return "command"
    return "general"
