"""AI service: transform free text into normalized quiz JSON."""
from __future__ import annotations

import json
import logging
import re

from core import schema
from core.ai.prompts import build_prompt
from core.ai.provider import AIProvider, get_provider
from core.errors import ValidationError

log = logging.getLogger(__name__)


class AIService:
    """Text → structured quiz conversion."""

    def __init__(self, provider: AIProvider | None = None) -> None:
        self._provider = provider or get_provider()

    def generate_from_text(
        self,
        text: str,
        *,
        hint_title: str = "",
        existing_categories: list[str] | None = None,
        target_count: int = 10,
    ) -> dict:
        text = (text or "").strip()
        if len(text) < 30:
            raise ValidationError("متن ورودی بسیار کوتاه است")

        prompt = build_prompt(
            text=text,
            hint_title=hint_title,
            existing_categories=existing_categories or [],
            target_count=target_count,
        )

        raw_response = self._provider.complete(prompt)
        candidate = self._extract_json(raw_response)

        try:
            quiz = schema.normalize_quiz(candidate, quiz_name="ai_draft")
        except ValidationError as e:
            log.warning("AI returned invalid quiz: %s", e)
            raise ValidationError(f"خروجی AI معتبر نیست: {e.message}") from e

        return {
            "draft": quiz,
            "raw_ai_response": raw_response[:2000],
        }

    @staticmethod
    def _extract_json(text: str) -> dict:
        if not text:
            raise ValidationError("پاسخ AI خالی است")

        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        start = text.find("{")
        if start == -1:
            raise ValidationError("JSON در پاسخ AI یافت نشد")
        depth = 0
        for i in range(start, len(text)):
            c = text[i]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError as e:
                        raise ValidationError(f"JSON نامعتبر در پاسخ AI: {e}") from e
        raise ValidationError("JSON نامعتبر در پاسخ AI")
