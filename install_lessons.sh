#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  install_lessons.sh — افزودن درسنامه به Quiz Server
#  Usage: bash install_lessons.sh [project_root]
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

if [ ! -f "server.py" ]; then
    echo "❌ server.py یافت نشد. از ریشه پروژه اجرا کنید."
    exit 1
fi

echo "═══════════════════════════════════════════════════"
echo " 📖 Installing Lesson (درسنامه) subsystem"
echo "═══════════════════════════════════════════════════"

# ─── 1. config.py: افزودن LESSON_DIR ─────────────────────────
echo "▶ Patching config.py..."
python3 - <<'PY'
from pathlib import Path
p = Path("config.py")
src = p.read_text(encoding="utf-8")

if "LESSON_DIR" not in src:
    src = src.replace(
        'DATA_DIR: Path = Path(os.getenv("QUIZ_DATA_DIR", BASE_DIR / "data"))',
        'DATA_DIR: Path = Path(os.getenv("QUIZ_DATA_DIR", BASE_DIR / "data"))\n'
        '    LESSON_DIR: Path = Path(os.getenv("QUIZ_LESSON_DIR", DATA_DIR / "lessons"))',
    )
    src = src.replace(
        "for p in (cls.DATA_DIR, cls.AUDIO_DIR, cls.TMP_DIR,",
        "for p in (cls.DATA_DIR, cls.LESSON_DIR, cls.AUDIO_DIR, cls.TMP_DIR,",
    )
    p.write_text(src, encoding="utf-8")
    print("  ✓ LESSON_DIR added")
else:
    print("  ⏭  already patched")
PY

# ─── 2. core/security.py: افزودن lesson_path ─────────────────
echo "▶ Patching core/security.py..."
python3 - <<'PY'
from pathlib import Path
p = Path("core/security.py")
src = p.read_text(encoding="utf-8")
if "def lesson_path" not in src:
    src += '''

def lesson_path(name: str) -> Path:
    """Return a safe path inside LESSON_DIR for ``name``."""
    safe = sanitize_quiz_name(name)
    p = (Config.LESSON_DIR / f"{safe}.json")
    return ensure_within(Config.LESSON_DIR, p)
'''
    p.write_text(src, encoding="utf-8")
    print("  ✓ lesson_path added")
else:
    print("  ⏭  already patched")
PY

# ─── 3. core/schema.py: افزودن normalize_lesson ──────────────
echo "▶ Patching core/schema.py..."
python3 - <<'PY'
from pathlib import Path
p = Path("core/schema.py")
src = p.read_text(encoding="utf-8")
if "def normalize_lesson" not in src:
    src += '''

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
'''
    p.write_text(src, encoding="utf-8")
    print("  ✓ normalize_lesson added")
else:
    print("  ⏭  already patched")
PY

# ─── 4. core/services/lesson_service.py ──────────────────────
echo "▶ Writing core/services/lesson_service.py..."
cat > core/services/lesson_service.py <<'PY_EOF'
"""Lesson (درسنامه) service — CRUD on JSON files in Config.LESSON_DIR."""
from __future__ import annotations

import json
import logging
import os
import threading
from pathlib import Path

from config import Config
from core import security
from core.errors import NotFoundError, ValidationError
from core.schema import normalize_lesson

log = logging.getLogger(__name__)

_LOCKS: dict[str, threading.RLock] = {}
_GUARD = threading.Lock()


def _lock_for(name: str) -> threading.RLock:
    with _GUARD:
        if name not in _LOCKS:
            _LOCKS[name] = threading.RLock()
        return _LOCKS[name]


class LessonService:
    """Load / save / list lessons stored as ``data/lessons/<name>.json``."""

    def __init__(self, lesson_dir: Path | None = None) -> None:
        self._dir = lesson_dir or Config.LESSON_DIR
        self._dir.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, dict] = {}
        self._cache_lock = threading.RLock()

    # ── Public API ────────────────────────────────────────────
    def list_all(self, *, reload: bool = False) -> list[dict]:
        if reload or not self._cache:
            self._reload()
        with self._cache_lock:
            return [self._meta(n, l) for n, l in sorted(self._cache.items())]

    def get(self, name: str) -> dict:
        if not self._cache:
            self._reload()
        with self._cache_lock:
            if name not in self._cache:
                self._reload()
            if name not in self._cache:
                raise NotFoundError("درسنامه یافت نشد")
            return json.loads(json.dumps(self._cache[name], ensure_ascii=False))

    def save(self, name: str, raw: dict) -> dict:
        safe = security.sanitize_quiz_name(name)
        lesson = normalize_lesson(raw, lesson_name=safe)
        path = security.lesson_path(safe)
        with _lock_for(safe):
            self._atomic_write(path, lesson)
            with self._cache_lock:
                self._cache[safe] = lesson
        log.info("Saved lesson %s (%d sections)", safe, len(lesson["sections"]))
        return lesson

    def update(self, name: str, raw: dict) -> dict:
        # ensure exists
        self.get(name)
        return self.save(name, raw)

    def delete(self, name: str) -> None:
        path = security.lesson_path(name)
        if not path.exists():
            raise NotFoundError("درسنامه یافت نشد")
        path.unlink()
        with self._cache_lock:
            self._cache.pop(name, None)
        log.info("Deleted lesson %s", name)

    def for_quiz(self, quiz_name: str) -> dict | None:
        """Return the first lesson whose ``quiz_name`` matches, or None."""
        if not self._cache:
            self._reload()
        with self._cache_lock:
            for name, lesson in self._cache.items():
                if lesson.get("quiz_name") == quiz_name:
                    meta = self._meta(name, lesson)
                    meta["sections_count"] = len(lesson.get("sections", []))
                    return meta
        return None

    def invalidate(self) -> None:
        with self._cache_lock:
            self._cache.clear()

    # ── Internal ──────────────────────────────────────────────
    def _reload(self) -> None:
        new_cache: dict[str, dict] = {}
        for file in sorted(self._dir.glob("*.json")):
            name = file.stem
            try:
                with file.open("r", encoding="utf-8") as f:
                    data = json.load(f)
                new_cache[name] = normalize_lesson(data, lesson_name=name)
            except Exception as e:  # noqa: BLE001
                log.warning("Failed to load lesson %s: %s", file.name, e)
        with self._cache_lock:
            self._cache = new_cache

    def _meta(self, name: str, lesson: dict) -> dict:
        return {
            "file": name,
            "title": lesson.get("title", name),
            "description": lesson.get("description", ""),
            "quiz_name": lesson.get("quiz_name", ""),
            "level": lesson.get("level", 1),
            "tags": lesson.get("tags", []),
            "sections_count": len(lesson.get("sections", [])),
        }

    @staticmethod
    def _atomic_write(path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(path.suffix + ".tmp")
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
PY_EOF
echo "  ✓ core/services/lesson_service.py"

# ─── 5. routes/lesson_routes.py ──────────────────────────────
echo "▶ Writing routes/lesson_routes.py..."
cat > routes/lesson_routes.py <<'PY_EOF'
"""Lesson (درسنامه) endpoints."""
from __future__ import annotations

from flask import Blueprint, jsonify, request

from core.errors import AppError
from core.services.lesson_service import LessonService

bp = Blueprint("lesson", __name__, url_prefix="/api/v1/lessons")
_service = LessonService()


def _ok(payload: dict | None = None, status: int = 200):
    body = {"success": True}
    if payload:
        body.update(payload)
    return jsonify(body), status


@bp.get("")
@bp.get("/")
def list_lessons():
    return _ok({"lessons": _service.list_all(reload=request.args.get("reload") == "1")})


@bp.get("/by-quiz/<quiz_name>")
def lesson_for_quiz(quiz_name: str):
    lesson = _service.for_quiz(quiz_name)
    return _ok({"lesson": lesson})  # null if none


@bp.get("/<name>")
def get_lesson(name: str):
    return _ok({"lesson": _service.get(name), "name": name})


@bp.post("/<name>")
def create_lesson(name: str):
    data = request.get_json(silent=True) or {}
    _service.save(name, data)
    return _ok({"redirect": f"/lessons/{name}"}, 201)


@bp.put("/<name>")
def update_lesson(name: str):
    data = request.get_json(silent=True) or {}
    _service.update(name, data)
    return _ok()


@bp.delete("/<name>")
def delete_lesson(name: str):
    _service.delete(name)
    return _ok()


@bp.get("/search")
def search_lessons():
    q = (request.args.get("q") or "").strip().lower()
    if not q:
        return _ok({"lessons": []})
    results = []
    for meta in _service.list_all():
        try:
            full = _service.get(meta["file"])
        except AppError:
            continue
        blob = " ".join([
            full.get("title", ""),
            full.get("description", ""),
            " ".join(full.get("tags", [])),
            " ".join(s.get("title", "") + " " + s.get("content", "")
                     for s in full.get("sections", [])),
        ]).lower()
        if q in blob:
            results.append(meta)
    return _ok({"lessons": results})
PY_EOF
echo "  ✓ routes/lesson_routes.py"

# ─── 6. server.py: ثبت blueprint + HTML routes ───────────────
echo "▶ Patching server.py..."
python3 - <<'PY'
from pathlib import Path
p = Path("server.py")
src = p.read_text(encoding="utf-8")

if "lesson_routes" not in src:
    src = src.replace(
        "from routes import ai_routes, audio_routes, quiz_routes",
        "from routes import ai_routes, audio_routes, lesson_routes, quiz_routes",
    )
    src = src.replace(
        "    app.register_blueprint(audio_routes.bp)",
        "    app.register_blueprint(audio_routes.bp)\n"
        "    app.register_blueprint(lesson_routes.bp)",
    )
    # HTML routes — insert after mobile page route
    needle = '@app.get("/mobile")\n    def mobile_page():\n        return render_template("mobile.html")\n'
    insert = needle + '''
    @app.get("/lessons")
    def lessons_page():
        return render_template("lessons.html")

    @app.get("/lessons/<name>")
    def lesson_view_page(name: str):
        return render_template("lesson_view.html", lesson_name=name)

    @app.get("/lessons/<name>/edit")
    def lesson_edit_page(name: str):
        return render_template("lesson_edit.html", lesson_name=name)
'''
    if needle in src:
        src = src.replace(needle, insert)
        print("  ✓ HTML routes inserted")
    else:
        print("  ⚠  mobile route anchor not found — add HTML routes manually")
    p.write_text(src, encoding="utf-8")
    print("  ✓ blueprint registered")
else:
    print("  ⏭  already patched")
PY

# ─── 7. templates/lessons.html ───────────────────────────────
echo "▶ Writing templates/lessons.html..."
cat > templates/lessons.html <<'HTML_EOF'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>درسنامه‌ها | Quiz Server</title>
    <link rel="stylesheet" href="/static/style.css">
    <style>
        .lessons-hero { padding: 40px 16px 20px; text-align: center; }
        .lessons-hero h1 { font-size: 2rem; margin: 0 0 8px; }
        .lessons-hero p { color: var(--text-secondary); margin: 0; }
        .lessons-actions {
            display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
            margin: 24px 0 32px;
        }
        .lessons-grid {
            max-width: 1200px; margin: 0 auto;
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px; padding: 0 16px 60px;
        }
        .lesson-card {
            background: var(--bg-surface); border: 1px solid var(--border-subtle);
            border-radius: 12px; padding: 20px; text-decoration: none;
            color: inherit; display: flex; flex-direction: column;
            transition: border-color .2s, transform .15s;
        }
        .lesson-card:hover { border-color: var(--accent); transform: translateY(-2px); }
        .lesson-card h3 { margin: 0 0 8px; font-size: 1.1rem; }
        .lesson-card .desc { color: var(--text-secondary); font-size: 0.9rem; flex: 1; }
        .lesson-card .meta {
            display: flex; justify-content: space-between; align-items: center;
            margin-top: 14px; font-size: 0.8rem; color: var(--text-tertiary);
        }
        .lesson-tag {
            display: inline-block; background: var(--bg-elevated);
            border: 1px solid var(--border-subtle); border-radius: 999px;
            padding: 2px 10px; font-size: 0.75rem; margin: 0 4px 4px 0;
        }
        .empty-lessons {
            text-align: center; padding: 60px 20px;
            color: var(--text-secondary);
        }
        .empty-lessons .icon { font-size: 4rem; }
    </style>
</head>
<body>

<header class="lessons-hero">
    <h1>📖 درسنامه‌ها</h1>
    <p>مجموعه‌ای از درسنامه‌های آموزشی</p>

    <div class="lessons-actions">
        <a href="/" class="btn btn-ghost">← خانه</a>
        <a href="/lessons/new/edit" class="btn btn-primary">➕ درسنامه جدید</a>
    </div>

    <div style="max-width:500px;margin:0 auto;">
        <input type="text" id="searchInput" class="form-input" placeholder="🔍 جستجو در درسنامه‌ها..."
               style="width:100%;padding:10px 14px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary);box-sizing:border-box;">
    </div>
</header>

<main id="lessonsGrid" class="lessons-grid">
    <div class="empty-lessons" style="grid-column: 1/-1;">در حال بارگذاری...</div>
</main>

<script src="/static/js/api.js"></script>
<script src="/static/js/api_lessons.js"></script>
<script src="/static/js/sanitize.js"></script>
<script src="/static/js/lessons_list.js"></script>
</body>
</html>
HTML_EOF
echo "  ✓ templates/lessons.html"

# ─── 8. templates/lesson_view.html ───────────────────────────
echo "▶ Writing templates/lesson_view.html..."
cat > templates/lesson_view.html <<'HTML_EOF'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>درسنامه | Quiz Server</title>
    <link rel="stylesheet" href="/static/style.css">
    <style>
        .lesson-layout {
            display: grid; grid-template-columns: 260px 1fr;
            gap: 32px; max-width: 1200px; margin: 0 auto;
            padding: 24px 16px 80px;
        }
        @media (max-width: 800px) {
            .lesson-layout { grid-template-columns: 1fr; }
            .lesson-toc { position: static !important; }
        }
        .lesson-toc {
            position: sticky; top: 20px; align-self: start;
            background: var(--bg-surface); border: 1px solid var(--border-subtle);
            border-radius: 12px; padding: 16px; max-height: calc(100vh - 40px);
            overflow-y: auto;
        }
        .lesson-toc h4 { margin: 0 0 12px; font-size: 0.85rem; color: var(--text-tertiary);
                         text-transform: uppercase; letter-spacing: 0.05em; }
        .lesson-toc a {
            display: block; padding: 8px 10px; border-radius: 6px;
            color: var(--text-secondary); text-decoration: none;
            font-size: 0.9rem; margin-bottom: 2px;
            border-right: 3px solid transparent;
        }
        .lesson-toc a:hover { background: var(--bg-elevated); color: var(--text-primary); }
        .lesson-toc a.active { color: var(--accent); border-right-color: var(--accent);
                                background: var(--bg-elevated); }

        .lesson-main { min-width: 0; }
        .lesson-header {
            display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
            padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle);
            margin-bottom: 24px;
        }
        .lesson-header h1 { margin: 0; flex: 1; font-size: 1.8rem; }
        .lesson-meta {
            display: flex; gap: 14px; flex-wrap: wrap;
            font-size: 0.85rem; color: var(--text-tertiary); margin-top: 8px;
        }
        .lesson-section {
            background: var(--bg-surface); border: 1px solid var(--border-subtle);
            border-radius: 12px; padding: 24px; margin-bottom: 20px;
            scroll-margin-top: 20px;
        }
        .lesson-section h2 {
            margin: 0 0 16px; font-size: 1.3rem; color: var(--accent);
            display: flex; align-items: center; gap: 8px;
        }
        .lesson-section h2::before {
            content: '§'; opacity: 0.5; font-size: 1rem;
        }
        .lesson-content { line-height: 1.9; color: var(--text-primary); }
        .lesson-content h1, .lesson-content h2, .lesson-content h3 {
            margin: 20px 0 10px; color: var(--text-primary);
        }
        .lesson-content h1 { font-size: 1.5rem; }
        .lesson-content h2 { font-size: 1.25rem; }
        .lesson-content h3 { font-size: 1.1rem; }
        .lesson-content p { margin: 0 0 14px; }
        .lesson-content ul, .lesson-content ol { margin: 0 0 14px; padding-right: 24px; }
        .lesson-content li { margin-bottom: 6px; }
        .lesson-content code {
            background: var(--bg-elevated); padding: 2px 6px;
            border-radius: 4px; font-family: monospace; font-size: 0.9em;
            color: #f59e0b;
        }
        .lesson-content pre {
            background: var(--bg-elevated); border: 1px solid var(--border-subtle);
            border-radius: 8px; padding: 14px; overflow-x: auto;
            direction: ltr; text-align: left;
        }
        .lesson-content pre code {
            background: none; padding: 0; color: var(--text-primary);
        }
        .lesson-content blockquote {
            border-right: 4px solid var(--accent); margin: 14px 0;
            padding: 8px 16px; background: var(--bg-elevated);
            border-radius: 0 6px 6px 0; color: var(--text-secondary);
        }
        .lesson-content a { color: var(--accent); }
        .lesson-content hr {
            border: 0; border-top: 1px solid var(--border-subtle); margin: 20px 0;
        }
        .section-actions {
            display: flex; gap: 8px; margin-top: 16px;
            padding-top: 12px; border-top: 1px solid var(--border-subtle);
            font-size: 0.8rem;
        }
        .section-actions a { color: var(--text-tertiary); }
        .section-actions a:hover { color: var(--accent); }

        .section-done-btn {
            background: none; border: 1px solid var(--border-subtle);
            color: var(--text-secondary); padding: 4px 12px; border-radius: 6px;
            cursor: pointer; font-size: 0.8rem;
        }
        .section-done-btn.done {
            background: rgba(34,197,94,0.15); border-color: #22c55e; color: #22c55e;
        }
    </style>
</head>
<body>

<div class="lesson-layout">
    <aside class="lesson-toc" id="toc">
        <h4>فهرست</h4>
        <div id="tocList">در حال بارگذاری...</div>
    </aside>

    <main class="lesson-main">
        <div class="lesson-header">
            <a href="/lessons" class="back-btn">←</a>
            <div style="flex:1;min-width:200px;">
                <h1 id="lessonTitle">...</h1>
                <div class="lesson-meta" id="lessonMeta"></div>
            </div>
            <a href="#" id="editLink" class="btn btn-ghost">✏️ ویرایش</a>
        </div>

        <div id="sections"></div>

        <div id="lessonFooter" style="margin-top:32px;display:flex;justify-content:space-between;">
            <a href="/lessons" class="btn btn-ghost">📚 همهٔ درسنامه‌ها</a>
            <a href="#" id="quizLink" class="btn btn-primary" style="display:none;">📝 آزمون مرتبط</a>
        </div>
    </main>
</div>

<script src="/static/js/sanitize.js"></script>
<script src="/static/js/md.js"></script>
<script src="/static/js/api.js"></script>
<script src="/static/js/api_lessons.js"></script>
<script>
window.LESSON_NAME = {{ lesson_name | tojson }};
</script>
<script src="/static/js/lesson_view.js"></script>
</body>
</html>
HTML_EOF
echo "  ✓ templates/lesson_view.html"

# ─── 9. templates/lesson_edit.html ───────────────────────────
echo "▶ Writing templates/lesson_edit.html..."
cat > templates/lesson_edit.html <<'HTML_EOF'
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ویرایش درسنامه | Quiz Server</title>
    <link rel="stylesheet" href="/static/style.css">
    <style>
        .editor-shell { max-width: 1200px; margin: 0 auto; padding: 24px 16px 100px; }
        .editor-top {
            display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
            margin-bottom: 24px;
        }
        .editor-top h1 { margin: 0; flex: 1; font-size: 1.4rem; }
        .editor-card {
            background: var(--bg-surface); border: 1px solid var(--border-subtle);
            border-radius: 12px; padding: 20px; margin-bottom: 16px;
        }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 700px) { .grid-2 { grid-template-columns: 1fr; } }
        .form-label {
            display: block; margin-bottom: 6px; font-size: 0.85rem;
            color: var(--text-secondary);
        }
        .form-input, .form-textarea, .form-select {
            width: 100%; padding: 10px 12px; box-sizing: border-box;
            background: var(--bg-elevated); color: var(--text-primary);
            border: 1px solid var(--border-subtle); border-radius: 8px;
            font-family: inherit; font-size: 0.95rem;
        }
        .form-textarea { resize: vertical; min-height: 80px; }
        .mono { font-family: monospace; direction: ltr; text-align: left; }

        .section-row {
            background: var(--bg-elevated); border: 1px solid var(--border-subtle);
            border-radius: 10px; padding: 16px; margin-bottom: 12px;
        }
        .section-row .row-head {
            display: flex; gap: 8px; align-items: center; margin-bottom: 10px;
        }
        .section-row .row-head input[type=text] {
            flex: 1;
        }
        .drag-handle { cursor: grab; color: var(--text-tertiary); padding: 4px 8px; }
        .section-actions { display: flex; gap: 6px; }

        .editor-footer {
            position: sticky; bottom: 20px;
            background: var(--bg-elevated); border: 1px solid var(--border-default);
            border-radius: 12px; padding: 14px 20px;
            display: flex; justify-content: space-between; align-items: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); margin-top: 20px;
        }

        .tag-input {
            display: flex; gap: 6px; flex-wrap: wrap;
            padding: 6px; background: var(--bg-elevated);
            border: 1px solid var(--border-subtle); border-radius: 8px;
        }
        .tag-chip {
            background: var(--bg-surface); border: 1px solid var(--border-subtle);
            border-radius: 999px; padding: 3px 10px; font-size: 0.85rem;
            display: inline-flex; align-items: center; gap: 6px;
        }
        .tag-chip button {
            background: none; border: 0; color: var(--text-tertiary);
            cursor: pointer; font-size: 1rem; padding: 0; line-height: 1;
        }
        .tag-input input {
            flex: 1; min-width: 100px; background: transparent; border: 0;
            color: var(--text-primary); outline: none; padding: 4px;
        }
    </style>
</head>
<body>

<div class="editor-shell">
    <div class="editor-top">
        <a href="/lessons" class="back-btn">←</a>
        <h1 id="pageTitle">✏️ درسنامه</h1>
        <button id="btnPreview" class="btn btn-ghost">👁️ پیش‌نمایش</button>
        <button id="btnSave" class="btn btn-primary">💾 ذخیره</button>
    </div>

    <div class="editor-card">
        <div class="grid-2">
            <div>
                <label class="form-label">نام (فایل، فقط انگلیسی)</label>
                <input type="text" id="lessonName" class="form-input mono"
                       placeholder="storage-lesson" autocomplete="off">
            </div>
            <div>
                <label class="form-label">عنوان نمایشی</label>
                <input type="text" id="lessonTitle" class="form-input">
            </div>
        </div>

        <div style="margin-top:12px;">
            <label class="form-label">توضیح کوتاه</label>
            <input type="text" id="lessonDesc" class="form-input">
        </div>

        <div class="grid-2" style="margin-top:12px;">
            <div>
                <label class="form-label">آزمون مرتبط (اختیاری)</label>
                <select id="lessonQuiz" class="form-select">
                    <option value="">— هیچ —</option>
                </select>
            </div>
            <div>
                <label class="form-label">سطح</label>
                <select id="lessonLevel" class="form-select">
                    <option value="1">1</option><option value="2">2</option>
                    <option value="3">3</option><option value="4">4</option>
                </select>
            </div>
        </div>

        <div style="margin-top:12px;">
            <label class="form-label">برچسب‌ها</label>
            <div class="tag-input" id="tagInput">
                <input type="text" id="tagField" placeholder="Enter بزنید...">
            </div>
        </div>
    </div>

    <div class="editor-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="margin:0;">📑 بخش‌ها</h3>
            <button class="btn btn-primary" id="btnAddSection">➕ بخش جدید</button>
        </div>
        <div id="sectionsEditor"></div>
    </div>

    <div class="editor-footer">
        <span id="statusText" style="color:var(--text-tertiary);font-size:0.9rem;"></span>
        <button class="btn btn-primary" id="btnSaveBottom" style="padding:10px 28px;">
            💾 ذخیره
        </button>
    </div>
</div>

<!-- Preview Modal -->
<div id="previewModal" class="modal-overlay" style="display:none;">
    <div class="modal-container" style="max-width:900px;">
        <div class="modal-header">
            <div class="modal-header-left">
                <span class="modal-icon">👁️</span>
                <h2>پیش‌نمایش</h2>
            </div>
            <button class="modal-close" id="previewClose" type="button">✕</button>
        </div>
        <div class="modal-body" id="previewBody" style="max-height:70vh;overflow-y:auto;"></div>
    </div>
</div>

<script src="/static/js/sanitize.js"></script>
<script src="/static/js/md.js"></script>
<script src="/static/js/api.js"></script>
<script src="/static/js/api_lessons.js"></script>
<script>
window.LESSON_NAME = {{ lesson_name | tojson }};
</script>
<script src="/static/js/lesson_editor.js"></script>
</body>
</html>
HTML_EOF
echo "  ✓ templates/lesson_edit.html"

# ─── 10. static/js/md.js (markdown renderer محلی) ────────────
echo "▶ Writing static/js/md.js..."
mkdir -p static/js
cat > static/js/md.js <<'JS_EOF'
/* Minimal safe Markdown renderer — no external deps.
 * Supports: headings, bold, italic, inline code, code fences,
 * links, ul/ol, blockquote, hr, paragraphs.
 * HTML is escaped BEFORE transformation. */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inline(text) {
    // text must already be escaped
    // code spans first (protect from other rules)
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return `\u0000C${codes.length - 1}\u0000`;
    });
    // bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // italic
    text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    // links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => {
      const safe = /^(https?:|\/|#|mailto:)/i.test(u) ? u : '#';
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${t}</a>`;
    });
    // restore code spans
    text = text.replace(/\u0000C(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
    return text;
  }

  function render(md) {
    if (!md) return '';
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0, inCode = false, codeLang = '', codeBuf = [];
    let inList = null, inBQ = false, para = [];

    const flushPara = () => {
      if (para.length) {
        out.push(`<p>${inline(escapeHtml(para.join(' ')))}</p>`);
        para = [];
      }
    };
    const closeList = () => {
      if (inList) { out.push(`</${inList}>`); inList = null; }
    };
    const closeBQ = () => {
      if (inBQ) { out.push('</blockquote>'); inBQ = false; }
    };

    while (i < lines.length) {
      const line = lines[i];

      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        if (inCode) {
          out.push(`<pre><code class="lang-${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
          inCode = false; codeLang = ''; codeBuf = [];
        } else {
          flushPara(); closeList(); closeBQ();
          inCode = true; codeLang = fence[1] || '';
        }
        i++; continue;
      }
      if (inCode) { codeBuf.push(line); i++; continue; }

      if (!line.trim()) { flushPara(); closeList(); closeBQ(); i++; continue; }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushPara(); closeList(); closeBQ();
        const lvl = h[1].length;
        out.push(`<h${lvl}>${inline(escapeHtml(h[2]))}</h${lvl}>`);
        i++; continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushPara(); closeList(); closeBQ();
        out.push('<hr>'); i++; continue;
      }

      const bq = line.match(/^>\s?(.*)$/);
      if (bq) {
        flushPara(); closeList();
        if (!inBQ) { out.push('<blockquote>'); inBQ = true; }
        out.push(`<p>${inline(escapeHtml(bq[1]))}</p>`);
        i++; continue;
      } else { closeBQ(); }

      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ul) {
        flushPara();
        if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul'; }
        out.push(`<li>${inline(escapeHtml(ul[1]))}</li>`);
        i++; continue;
      }

      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ol) {
        flushPara();
        if (inList !== 'ol') { closeList(); out.push('<ol>'); inList = 'ol'; }
        out.push(`<li>${inline(escapeHtml(ol[1]))}</li>`);
        i++; continue;
      }

      closeList();
      para.push(line);
      i++;
    }
    flushPara(); closeList(); closeBQ();
    if (inCode) out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
    return out.join('\n');
  }

  global.MD = { render, escapeHtml };
})(window);
JS_EOF
echo "  ✓ static/js/md.js"

# ─── 11. static/js/api_lessons.js ────────────────────────────
echo "▶ Writing static/js/api_lessons.js..."
cat > static/js/api_lessons.js <<'JS_EOF'
/* Extends window.API with lesson endpoints. Load AFTER api.js. */
(function () {
  'use strict';
  if (!window.API) {
    console.warn('api_lessons.js: window.API missing — lesson endpoints unavailable');
    return;
  }
  const BASE = '/api/v1/lessons';

  async function req(url, opts) {
    const res = await fetch(url, opts);
    let body = {};
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) {
      const err = new Error(body.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  const json = (method, data) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  Object.assign(window.API, {
    listLessons:  () => req(BASE),
    getLesson:    (name) => req(`${BASE}/${encodeURIComponent(name)}`),
    saveLesson:   (name, data) => req(`${BASE}/${encodeURIComponent(name)}`, json('POST', data)),
    updateLesson: (name, data) => req(`${BASE}/${encodeURIComponent(name)}`, json('PUT', data)),
    deleteLesson: (name) => req(`${BASE}/${encodeURIComponent(name)}`, { method: 'DELETE' }),
    lessonForQuiz: (quizName) => req(`${BASE}/by-quiz/${encodeURIComponent(quizName)}`),
    searchLessons: (q) => req(`${BASE}/search?q=${encodeURIComponent(q)}`),
  });
})();
JS_EOF
echo "  ✓ static/js/api_lessons.js"

# ─── 12. static/js/lessons_list.js ───────────────────────────
echo "▶ Writing static/js/lessons_list.js..."
cat > static/js/lessons_list.js <<'JS_EOF'
(function () {
  'use strict';
  const esc = window.Sanitize?.escapeHtml || (s => String(s));
  const grid = document.getElementById('lessonsGrid');
  const searchInput = document.getElementById('searchInput');
  let all = [];

  async function load() {
    try {
      const r = await window.API.listLessons();
      all = r.lessons || [];
      render(all);
    } catch (e) {
      grid.innerHTML = `<div class="empty-lessons" style="grid-column:1/-1;">خطا: ${esc(e.message)}</div>`;
    }
  }

  function render(items) {
    if (!items.length) {
      grid.innerHTML = `<div class="empty-lessons" style="grid-column:1/-1;">
        <div class="icon">📚</div>
        <h3>هنوز درسنامه‌ای ساخته نشده</h3>
        <p>از دکمهٔ «درسنامه جدید» شروع کنید.</p>
      </div>`;
      return;
    }
    grid.innerHTML = '';
    items.forEach(l => {
      const card = document.createElement('a');
      card.href = `/lessons/${encodeURIComponent(l.file)}`;
      card.className = 'lesson-card';

      const tags = (l.tags || []).slice(0, 4).map(t =>
        `<span class="lesson-tag">${esc(t)}</span>`).join('');

      card.innerHTML = `
        <h3>${esc(l.title)}</h3>
        <div class="desc">${esc(l.description || '—')}</div>
        ${tags ? `<div style="margin-top:10px;">${tags}</div>` : ''}
        <div class="meta">
          <span>📑 ${l.sections_count || 0} بخش</span>
          ${l.quiz_name ? `<span>📝 ${esc(l.quiz_name)}</span>` : ''}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  let timer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) { render(all); return; }
      try {
        const r = await window.API.searchLessons(q);
        render(r.lessons || []);
      } catch (_) { /* ignore */ }
    }, 250);
  });

  load();
})();
JS_EOF
echo "  ✓ static/js/lessons_list.js"

# ─── 13. static/js/lesson_view.js ────────────────────────────
echo "▶ Writing static/js/lesson_view.js..."
cat > static/js/lesson_view.js <<'JS_EOF'
(function () {
  'use strict';
  const esc = window.Sanitize?.escapeHtml || (s => String(s));
  const md = window.MD;
  const name = window.LESSON_NAME;
  const STORAGE_KEY = `lpic_lesson_${name}_read`;

  const $title = document.getElementById('lessonTitle');
  const $meta = document.getElementById('lessonMeta');
  const $sections = document.getElementById('sections');
  const $toc = document.getElementById('tocList');
  const $editLink = document.getElementById('editLink');
  const $quizLink = document.getElementById('quizLink');

  $editLink.href = `/lessons/${encodeURIComponent(name)}/edit`;

  let readSet = new Set();
  try { readSet = new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch (_) {}

  function saveRead() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...readSet]));
  }

  async function load() {
    let lesson;
    try {
      const r = await window.API.getLesson(name);
      lesson = r.lesson;
    } catch (e) {
      $sections.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-secondary);">
        ❌ درسنامه یافت نشد.<br><a href="/lessons">بازگشت به لیست</a>
      </div>`;
      $title.textContent = 'خطا';
      return;
    }

    document.title = `${lesson.title} | درسنامه`;
    $title.textContent = lesson.title;

    const parts = [];
    if (lesson.description) parts.push(esc(lesson.description));
    parts.push(`📑 ${lesson.sections.length} بخش`);
    if (lesson.level) parts.push(`سطح ${lesson.level}`);
    if (lesson.tags?.length) parts.push(lesson.tags.map(t => `#${esc(t)}`).join(' '));
    $meta.innerHTML = parts.join(' • ');

    if (lesson.quiz_name) {
      $quizLink.href = `/quiz/${encodeURIComponent(lesson.quiz_name)}`;
      $quizLink.style.display = '';
      $quizLink.textContent = `📝 آزمون: ${lesson.quiz_name}`;
    }

    // TOC
    $toc.innerHTML = '';
    lesson.sections.forEach((s, i) => {
      const a = document.createElement('a');
      a.href = `#${s.id}`;
      a.textContent = s.title || `بخش ${i + 1}`;
      a.dataset.sid = s.id;
      $toc.appendChild(a);
    });

    // Sections
    $sections.innerHTML = '';
    lesson.sections.forEach((s, i) => {
      const wrap = document.createElement('section');
      wrap.className = 'lesson-section';
      wrap.id = s.id;

      const head = document.createElement('h2');
      head.textContent = s.title || `بخش ${i + 1}`;
      wrap.appendChild(head);

      const body = document.createElement('div');
      body.className = 'lesson-content';
      body.innerHTML = md.render(s.content);
      wrap.appendChild(body);

      const actions = document.createElement('div');
      actions.className = 'section-actions';

      const isRead = readSet.has(s.id);
      const btn = document.createElement('button');
      btn.className = 'section-done-btn' + (isRead ? ' done' : '');
      btn.textContent = isRead ? '✅ خوانده‌شده' : '⬜ علامت‌گذاری به‌عنوان خوانده‌شده';
      btn.addEventListener('click', () => {
        if (readSet.has(s.id)) readSet.delete(s.id);
        else readSet.add(s.id);
        saveRead();
        btn.classList.toggle('done');
        btn.textContent = readSet.has(s.id) ? '✅ خوانده‌شده' : '⬜ علامت‌گذاری به‌عنوان خوانده‌شده';
      });
      actions.appendChild(btn);

      if (s.question_ids?.length) {
        const qlink = document.createElement('a');
        qlink.href = `/quiz/${encodeURIComponent(lesson.quiz_name || '')}`;
        qlink.textContent = `🔗 ${s.question_ids.length} سوال مرتبط`;
        qlink.style.marginRight = 'auto';
        if (!lesson.quiz_name) qlink.style.display = 'none';
        actions.appendChild(qlink);
      }

      wrap.appendChild(actions);
      $sections.appendChild(wrap);
    });

    // Scroll spy
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          document.querySelectorAll('.lesson-toc a').forEach(a => a.classList.remove('active'));
          const a = document.querySelector(`.lesson-toc a[data-sid="${e.target.id}"]`);
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    document.querySelectorAll('.lesson-section').forEach(el => observer.observe(el));
  }

  load();
})();
JS_EOF
echo "  ✓ static/js/lesson_view.js"

# ─── 14. static/js/lesson_editor.js ──────────────────────────
echo "▶ Writing static/js/lesson_editor.js..."
cat > static/js/lesson_editor.js <<'JS_EOF'
(function () {
  'use strict';
  const esc = window.Sanitize?.escapeHtml || (s => String(s));
  const md = window.MD;
  const original = window.LESSON_NAME;
  const isNew = !original || original === 'new';

  const $name = document.getElementById('lessonName');
  const $title = document.getElementById('lessonTitle');
  const $desc = document.getElementById('lessonDesc');
  const $quiz = document.getElementById('lessonQuiz');
  const $level = document.getElementById('lessonLevel');
  const $tagField = document.getElementById('tagField');
  const $tagInput = document.getElementById('tagInput');
  const $sections = document.getElementById('sectionsEditor');
  const $status = document.getElementById('statusText');
  const $saveBtn = document.getElementById('btnSave');
  const $saveBottom = document.getElementById('btnSaveBottom');
  const $btnAdd = document.getElementById('btnAddSection');

  let tags = [];
  let sections = [];

  // ── Tags ────────────────────────────────────────────────
  function renderTags() {
    $tagInput.querySelectorAll('.tag-chip').forEach(el => el.remove());
    tags.forEach((t, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${esc(t)} <button type="button" data-i="${i}">✕</button>`;
      chip.querySelector('button').addEventListener('click', () => {
        tags.splice(i, 1); renderTags();
      });
      $tagInput.insertBefore(chip, $tagField);
    });
  }

  $tagField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const v = $tagField.value.trim();
      if (v && !tags.includes(v)) { tags.push(v); renderTags(); }
      $tagField.value = '';
    }
  });

  // ── Sections ────────────────────────────────────────────
  function newSection() {
    return { id: '', title: '', content: '', question_ids: [] };
  }

  function renderSections() {
    $sections.innerHTML = '';
    if (!sections.length) {
      $sections.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:20px;">هنوز بخشی اضافه نشده.</p>';
      return;
    }
    sections.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'section-row';
      row.innerHTML = `
        <div class="row-head">
          <span class="drag-handle">⋮⋮</span>
          <input type="text" class="form-input" placeholder="عنوان بخش ${i + 1}" value="${esc(s.title)}">
          <div class="section-actions">
            <button class="btn btn-ghost btn-sm" data-act="up" title="بالا">↑</button>
            <button class="btn btn-ghost btn-sm" data-act="down" title="پایین">↓</button>
            <button class="btn btn-danger btn-sm" data-act="del" title="حذف">🗑️</button>
          </div>
        </div>
        <textarea class="form-textarea mono" placeholder="محتوای Markdown..." rows="6">${esc(s.content)}</textarea>
        <div style="margin-top:8px;">
          <label class="form-label">شناسه‌های سوال مرتبط (با کاما جدا کنید)</label>
          <input type="text" class="form-input mono" placeholder="q_1, q_2" value="${esc((s.question_ids || []).join(', '))}">
        </div>
      `;

      const titleInput = row.querySelector('.row-head input[type=text]');
      const contentInput = row.querySelector('textarea');
      const qidInput = row.querySelectorAll('input[type=text]')[1];

      titleInput.addEventListener('input', () => { sections[i].title = titleInput.value; });
      contentInput.addEventListener('input', () => { sections[i].content = contentInput.value; });
      qidInput.addEventListener('input', () => {
        sections[i].question_ids = qidInput.value.split(',').map(x => x.trim()).filter(Boolean);
      });

      row.querySelector('[data-act=up]').addEventListener('click', () => {
        if (i === 0) return;
        [sections[i - 1], sections[i]] = [sections[i], sections[i - 1]];
        renderSections();
      });
      row.querySelector('[data-act=down]').addEventListener('click', () => {
        if (i === sections.length - 1) return;
        [sections[i + 1], sections[i]] = [sections[i], sections[i + 1]];
        renderSections();
      });
      row.querySelector('[data-act=del]').addEventListener('click', () => {
        if (!confirm(`بخش «${s.title || i + 1}» حذف شود؟`)) return;
        sections.splice(i, 1);
        renderSections();
      });

      $sections.appendChild(row);
    });
  }

  $btnAdd.addEventListener('click', () => {
    sections.push(newSection());
    renderSections();
  });

  // ── Load ────────────────────────────────────────────────
  async function loadQuizzes() {
    try {
      const r = await fetch('/api/v1/quizzes').then(x => x.json());
      (r.quizzes || []).forEach(q => {
        const o = document.createElement('option');
        o.value = q.file;
        o.textContent = q.title || q.file;
        $quiz.appendChild(o);
      });
    } catch (_) {}
  }

  async function loadLesson() {
    if (isNew) {
      $name.value = '';
      $name.readOnly = false;
      document.getElementById('pageTitle').textContent = '➕ درسنامهٔ جدید';
      sections.push(newSection());
      renderSections();
      return;
    }
    try {
      const r = await window.API.getLesson(original);
      const l = r.lesson;
      $name.value = original;
      $name.readOnly = true;
      $title.value = l.title || '';
      $desc.value = l.description || '';
      $level.value = l.level || 1;
      if (l.quiz_name) $quiz.value = l.quiz_name;
      tags = (l.tags || []).slice();
      sections = (l.sections || []).map(s => ({
        id: s.id || '',
        title: s.title || '',
        content: s.content || '',
        question_ids: s.question_ids || [],
      }));
      if (!sections.length) sections.push(newSection());
      renderTags();
      renderSections();
      document.getElementById('pageTitle').textContent = `✏️ ${l.title}`;
      document.title = `ویرایش ${l.title}`;
    } catch (e) {
      alert('خطا در بارگذاری: ' + e.message);
      window.location.href = '/lessons';
    }
  }

  // ── Save ────────────────────────────────────────────────
  function collect() {
    const name = $name.value.trim().toLowerCase();
    if (!name) throw new Error('نام درسنامه الزامی است');
    if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name)) {
      throw new Error('نام فقط حروف کوچک انگلیسی، اعداد، - و _');
    }
    const clean = sections
      .map(s => ({
        id: s.id || '',
        title: s.title.trim(),
        content: s.content.trim(),
        question_ids: (s.question_ids || []).filter(Boolean),
      }))
      .filter(s => s.title || s.content);
    if (!clean.length) throw new Error('حداقل یک بخش با محتوا لازم است');

    return {
      name,
      payload: {
        title: $title.value.trim() || name,
        description: $desc.value.trim(),
        quiz_name: $quiz.value || '',
        level: parseInt($level.value) || 1,
        tags,
        sections: clean,
      },
    };
  }

  async function save() {
    try {
      const { name, payload } = collect();
      $status.textContent = '⏳ در حال ذخیره...';
      $saveBtn.disabled = true;
      $saveBottom.disabled = true;

      if (isNew || name !== original) {
        await window.API.saveLesson(name, payload);
      } else {
        await window.API.updateLesson(name, payload);
      }
      $status.textContent = '✅ ذخیره شد';
      if (isNew || name !== original) {
        setTimeout(() => { window.location.href = `/lessons/${encodeURIComponent(name)}`; }, 400);
      } else {
        setTimeout(() => { $status.textContent = ''; }, 1500);
      }
    } catch (e) {
      alert('خطا: ' + e.message);
      $status.textContent = '';
    } finally {
      $saveBtn.disabled = false;
      $saveBottom.disabled = false;
    }
  }

  $saveBtn.addEventListener('click', save);
  $saveBottom.addEventListener('click', save);

  // Ctrl+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  });

  // ── Preview ─────────────────────────────────────────────
  const $modal = document.getElementById('previewModal');
  const $body = document.getElementById('previewBody');
  document.getElementById('btnPreview').addEventListener('click', () => {
    const parts = [`<h1>${esc($title.value || 'درسنامه')}</h1>`];
    if ($desc.value) parts.push(`<p>${esc($desc.value)}</p>`);
    sections.forEach((s, i) => {
      parts.push(`<hr><h2>${esc(s.title || 'بخش ' + (i + 1))}</h2>`);
      parts.push(`<div class="lesson-content">${md.render(s.content || '')}</div>`);
    });
    $body.innerHTML = parts.join('\n');
    $modal.style.display = 'flex';
  });
  document.getElementById('previewClose').addEventListener('click', () => { $modal.style.display = 'none'; });
  $modal.addEventListener('click', (e) => { if (e.target === $modal) $modal.style.display = 'none'; });

  // ── Boot ────────────────────────────────────────────────
  loadQuizzes();
  loadLesson();
})();
JS_EOF
echo "  ✓ static/js/lesson_editor.js"

# ─── 15. static/js/quiz_lesson_link.js ───────────────────────
echo "▶ Writing static/js/quiz_lesson_link.js..."
cat > static/js/quiz_lesson_link.js <<'JS_EOF'
/* Injects a floating "📖 درسنامه" button on the quiz page
   if the current quiz has an attached lesson. */
(function () {
  'use strict';
  if (!window.QUIZ_NAME) return;

  async function check() {
    try {
      const res = await fetch(`/api/v1/lessons/by-quiz/${encodeURIComponent(window.QUIZ_NAME)}`);
      if (!res.ok) return;
      const body = await res.json();
      if (!body.lesson) return;
      injectButton(body.lesson);
    } catch (_) {}
  }

  function injectButton(lesson) {
    const btn = document.createElement('a');
    btn.href = `/lessons/${encodeURIComponent(lesson.file)}`;
    btn.textContent = `📖 ${lesson.title || 'درسنامه'}`;
    btn.style.cssText = `
      position: fixed; bottom: 20px; left: 20px;
      background: var(--accent, #3b82f6); color: #fff;
      padding: 10px 18px; border-radius: 999px;
      text-decoration: none; font-weight: 700;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      z-index: 9999; font-size: 0.9rem;
      transition: transform .15s;
    `;
    btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; };
    btn.onmouseleave = () => { btn.style.transform = ''; };
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();
JS_EOF
echo "  ✓ static/js/quiz_lesson_link.js"

# ─── 16. templates/index.html: افزودن لینک درسنامه + script ──
echo "▶ Patching templates/index.html..."
python3 - <<'PY'
from pathlib import Path
p = Path("templates/index.html")
src = p.read_text(encoding="utf-8")

changed = False

# add home action link
if "/lessons" not in src:
    src = src.replace(
        '<a href="/audio" class="btn btn-ghost">🎧 ضبط صدا</a>',
        '<a href="/audio" class="btn btn-ghost">🎧 ضبط صدا</a>\n'
        '        <a href="/lessons" class="btn btn-ghost">📖 درسنامه‌ها</a>',
    )
    changed = True

# add quiz lesson script on quiz page
if "quiz_lesson_link.js" not in src:
    src = src.replace(
        '<script src="/static/js/quiz_page.js"></script>',
        '<script src="/static/js/quiz_page.js"></script>\n'
        '<script src="/static/js/quiz_lesson_link.js"></script>',
    )
    changed = True

if changed:
    p.write_text(src, encoding="utf-8")
    print("  ✓ patched")
else:
    print("  ⏭  already patched")
PY

# ─── 17. Sample lesson ───────────────────────────────────────
echo "▶ Writing sample lesson..."
mkdir -p data/lessons
if [ ! -f "data/lessons/sample-lesson.json" ]; then
cat > data/lessons/sample-lesson.json <<'JSON_EOF'
{
  "title": "درسنامه نمونه",
  "description": "این یک درسنامه نمونه برای تست سیستم است.",
  "quiz_name": "",
  "level": 1,
  "tags": ["نمونه", "راهنما"],
  "sections": [
    {
      "id": "s_intro",
      "title": "مقدمه",
      "content": "## به درسنامه خوش آمدید\n\nاین یک **درسنامه نمونه** است که با *Markdown* نوشته شده.\n\n- پشتیبانی از لیست\n- پشتیبانی از `inline code`\n- پشتیبانی از [لینک](https://example.com)\n\n### کد\n\n```python\ndef hello():\n    print(\"سلام\")\n```\n\n> این یک نقل‌قول است.",
      "level": 1,
      "tags": ["مقدمه"],
      "question_ids": []
    },
    {
      "id": "s_how",
      "title": "چطور استفاده کنم؟",
      "content": "1. از منوی «درسنامه‌ها» یک درسنامه انتخاب کنید\n2. از دکمهٔ «ویرایش» محتوا را تغییر دهید\n3. در صفحهٔ ویرایش، می‌توانید از `Ctrl+S` برای ذخیره استفاده کنید\n\n### اتصال به آزمون\n\nدر ویرایش درسنامه، فیلد «آزمون مرتبط» را پر کنید. بعد از ذخیره، در صفحهٔ آن آزمون یک دکمهٔ شناور 📖 نمایش داده می‌شود.",
      "level": 1,
      "tags": ["راهنما"],
      "question_ids": []
    }
  ]
}
JSON_EOF
echo "  ✓ data/lessons/sample-lesson.json"
else
echo "  ⏭  sample lesson already exists"
fi

# ─── 18. Verification ────────────────────────────────────────
echo ""
echo "▶ Verifying..."
python3 - <<'PY'
import sys
try:
    from core.services.lesson_service import LessonService
    print("  ✓ lesson_service imports OK")
except Exception as e:
    print("  ✗ lesson_service failed:", e)
    sys.exit(1)

try:
    from routes import lesson_routes
    print("  ✓ lesson_routes imports OK")
except Exception as e:
    print("  ✗ lesson_routes failed:", e)
    sys.exit(1)

try:
    import server
    print("  ✓ server imports OK")
except Exception as e:
    print("  ✗ server failed:", e)
    sys.exit(1)
PY

echo ""
echo "═══════════════════════════════════════════════════"
echo " ✅ Lesson subsystem installed!"
echo "═══════════════════════════════════════════════════"
echo ""
echo " اجرا:"
echo "   bash run.sh"
echo ""
echo " آدرس‌ها:"
echo "   /lessons              → لیست درسنامه‌ها"
echo "   /lessons/new/edit     → ساخت درسنامه جدید"
echo "   /lessons/<name>       → مشاهده"
echo "   /lessons/<name>/edit  → ویرایش"
echo ""
echo " API:"
echo "   GET    /api/v1/lessons"
echo "   GET    /api/v1/lessons/<name>"
echo "   POST   /api/v1/lessons/<name>"
echo "   PUT    /api/v1/lessons/<name>"
echo "   DELETE /api/v1/lessons/<name>"
echo "   GET    /api/v1/lessons/by-quiz/<quiz_name>"
echo ""
