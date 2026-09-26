"""Domain exceptions mapped to HTTP status codes."""
from __future__ import annotations


class AppError(Exception):
    """Base application error."""
    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str = "خطای داخلی سرور", *, details: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}

    def to_dict(self) -> dict:
        return {"success": False, "code": self.code, "error": self.message, "details": self.details}


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"

    def __init__(self, message: str = "مورد یافت نشد", **kw) -> None:
        super().__init__(message, **kw)


class ConflictError(AppError):
    status_code = 409
    code = "conflict"


class SecurityError(AppError):
    status_code = 403
    code = "security_error"
