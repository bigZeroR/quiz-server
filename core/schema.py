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


# ═══════════════════════════════════════════════════════════════
#  Lesson (درسنامه) schema
# ═══════════════════════════════════════════════════════════════

LESSON_SECTION_MAP: dict[str, tuple[str, ...]] = {
    "id":           ("id", "slug", "key"),
    "title":        ("title", "name", "heading", "header"),
    "content":      ("content", "body", "text", "markdown", "md"),
    "level":        ("level", "difficulty", "tier"),
    "tags":         ("tags", "keywords", "labels", "topics"),
    "question_ids": ("question_ids", "related_question_ids", "questions", "qids"),
}


def _pick_lesson(d: dict, canonical: str, default=None):
    for alias in LESSON_SECTION_MAP.get(canonical, (canonical,)):
        if alias in d and d[alias] is not None:
            return d[alias]
    return default


def normalize_lesson_section(raw, *, salt: str = "", fallback_id: str | None = None) -> dict:
    if isinstance(raw, str):
        raw = {"title": "", "content": raw}
    if not isinstance(raw, dict):
        raise ValidationError("هر بخش درسنامه باید متن یا آبجکت باشد")

    title = str(_pick_lesson(raw, "title", "") or "").strip()
    content = str(_pick_lesson(raw, "content", "") or "").strip()
    if not content and not title:
        raise ValidationError("بخش درسنامه نمی‌تواند خالی باشد")

    qids_raw = _pick_lesson(raw, "question_ids", []) or []
    if isinstance(qids_raw, (str, int)):
        qids = [str(qids_raw)]
    elif isinstance(qids_raw, (list, tuple)):
        qids = [str(q).strip() for q in qids_raw if str(q).strip()]
    else:
        qids = []

    tags_raw = _pick_lesson(raw, "tags", []) or []
    if isinstance(tags_raw, str):
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
    elif isinstance(tags_raw, (list, tuple)):
        tags = [str(t).strip() for t in tags_raw if str(t).strip()]
    else:
        tags = []

    try:
        level = int(_pick_lesson(raw, "level", DEFAULT_LEVEL))
    except (TypeError, ValueError):
        level = DEFAULT_LEVEL
    level = max(1, min(9, level))

    sec_id = raw.get("id") or fallback_id
    if not sec_id:
        seed = (title + "|" + content[:200]).encode("utf-8")
        h = hashlib.sha1(seed)
        h.update(salt.encode("utf-8"))
        sec_id = "s_" + h.hexdigest()[:10]

    return {
        "id": str(sec_id),
        "title": title,
        "content": content,
        "level": level,
        "tags": tags,
        "question_ids": qids,
    }


def normalize_lesson(raw: dict, *, lesson_name: str = "") -> dict:
    if not isinstance(raw, dict):
        raise ValidationError("ساختار درسنامه نامعتبر است")

    sections_raw = raw.get("sections") or raw.get("chapters") or raw.get("parts") or []
    if isinstance(sections_raw, str):
        sections_raw = [sections_raw]
    if not isinstance(sections_raw, list) or not sections_raw:
        raise ValidationError("درسنامه باید حداقل یک بخش داشته باشد")

    seen: set[str] = set()
    sections: list[dict] = []
    for i, s in enumerate(sections_raw):
        fb = f"{lesson_name}_{i+1}" if lesson_name else f"s{i+1}"
        norm = normalize_lesson_section(s, salt=lesson_name, fallback_id=fb)
        base = norm["id"]
        if base in seen:
            norm["id"] = f"{base}_{i+1}"
        seen.add(norm["id"])
        sections.append(norm)

    title = str(raw.get("title", lesson_name or "درسنامه")).strip() or "درسنامه"
    description = str(raw.get("description", "")).strip()
    quiz_name = str(raw.get("quiz_name", "") or "").strip()
    try:
        level = int(raw.get("level", 1))
    except (TypeError, ValueError):
        level = 1

    tags = raw.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]
    elif isinstance(tags, (list, tuple)):
        tags = [str(t).strip() for t in tags if str(t).strip()]
    else:
        tags = []

    return {
        "title": title,
        "description": description,
        "quiz_name": quiz_name,
        "level": level,
        "tags": tags,
        "sections": sections,
    }
