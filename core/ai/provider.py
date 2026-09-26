"""AI provider abstraction - swap providers without touching the service."""
from __future__ import annotations

import abc
import json
import logging
import urllib.error
import urllib.request

from config import Config
from core.errors import AppError

log = logging.getLogger(__name__)


class AIProvider(abc.ABC):
    @abc.abstractmethod
    def complete(self, prompt: str) -> str:
        """Return the assistant's raw text response."""


class OpenAICompatibleProvider(AIProvider):
    def __init__(self, base_url: str, api_key: str, model: str, timeout: int = 60) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model = model
        self._timeout = timeout

    def complete(self, prompt: str) -> str:
        if not self._api_key:
            raise AppError("کلید API تنظیم نشده است (QUIZ_AI_API_KEY)")

        body = json.dumps({
            "model": self._model,
            "messages": [
                {"role": "system", "content": "You output only valid JSON. No prose."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.4,
            "response_format": {"type": "json_object"},
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self._base_url}/chat/completions",
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                payload = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")[:400]
            log.error("AI provider HTTP %s: %s", e.code, detail)
            raise AppError(f"سرویس AI خطا داد ({e.code})")
        except Exception as e:
            log.error("AI provider error: %s", e)
            raise AppError("ارتباط با سرویس AI ممکن نشد")

        try:
            return payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise AppError("پاسخ AI قابل خواندن نیست") from e


class MockProvider(AIProvider):
    """Deterministic provider used when no API key is configured."""

    def complete(self, prompt: str) -> str:
        log.warning("MockProvider in use - no real AI request performed")
        return json.dumps({
            "title": "نمونه AI",
            "description": "این یک پاسخ Mock است.",
            "type": "general",
            "level": 1,
            "questions": [{
                "text": "کدام گزینه درست است؟ (نمونه)",
                "options": ["گزینه ۱", "گزینه ۲", "گزینه ۳", "گزینه ۴"],
                "correct": 0,
                "category": "نمونه",
                "level": 1,
                "explanation": "این یک نمونه Mock است.",
            }],
        }, ensure_ascii=False)


def get_provider() -> AIProvider:
    if not Config.AI_API_KEY:
        return MockProvider()
    return OpenAICompatibleProvider(
        base_url=Config.AI_BASE_URL,
        api_key=Config.AI_API_KEY,
        model=Config.AI_MODEL,
        timeout=Config.AI_TIMEOUT,
    )
