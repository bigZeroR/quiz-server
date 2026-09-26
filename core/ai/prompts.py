"""AI prompt templates - separated from business logic."""
from __future__ import annotations

import json


SYSTEM_RULES = """\
You are a specialized quiz generation engine.
Rules:
1. Output ONLY valid JSON - no prose, no markdown fences.
2. Follow the exact JSON schema provided below.
3. Do not invent fields that are not in the schema.
4. Every question MUST have: text, options (>=2), correct (index of correct option).
5. Optional fields: id, category, level, explanation, command, example.
6. Explanations should reference technical terms with <code>...</code> tags.
7. Wrong options must be plausible (not obviously wrong).
"""


def schema_block() -> str:
    schema = {
        "title": "string - quiz title",
        "description": "string - short description",
        "type": "string - e.g. general | network | linux | command",
        "level": "integer - 1..4",
        "questions": [{
            "text": "string - question text",
            "options": ["string", "string", "string", "string"],
            "correct": "integer - 0-based index of correct option",
            "category": "string - topic",
            "level": "integer - 1..4",
            "explanation": "string - why the correct answer is correct",
            "command": "string (optional)",
            "example": "string (optional)",
        }],
    }
    return json.dumps(schema, ensure_ascii=False, indent=2)


def build_prompt(
    *,
    text: str,
    hint_title: str = "",
    existing_categories: list[str] | None = None,
    target_count: int = 10,
) -> str:
    cats = ", ".join(existing_categories or []) or "(none yet - invent sensibly)"
    return f"""{SYSTEM_RULES}

JSON SCHEMA (must be respected):
{schema_block()}

EXISTING CATEGORIES (prefer reusing):
{cats}

HINT TITLE: {hint_title or "(auto)"}
TARGET QUESTION COUNT: approximately {target_count}

SOURCE TEXT:
\"\"\"
{text}
\"\"\"

Produce the JSON object now.
"""
