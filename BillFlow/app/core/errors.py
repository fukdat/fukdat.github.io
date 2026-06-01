"""Typed application errors.

Each error carries an HTTP status code and a stable machine-readable
``code`` so clients can branch on failures without parsing messages.
"""

from __future__ import annotations


class AppError(Exception):
    """Base class for all expected, handled application errors."""

    status_code: int = 500
    code: str = "internal_error"

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.__class__.__doc__ or self.code
        super().__init__(self.message)


class NotFoundError(AppError):
    """Requested resource does not exist."""

    status_code = 404
    code = "not_found"


class ConflictError(AppError):
    """Resource already exists or violates a uniqueness constraint."""

    status_code = 409
    code = "conflict"


class AuthenticationError(AppError):
    """Missing or invalid credentials."""

    status_code = 401
    code = "unauthorized"


class AuthorizationError(AppError):
    """Authenticated principal lacks the required permission."""

    status_code = 403
    code = "forbidden"


class ValidationError(AppError):
    """Input failed a business-rule validation."""

    status_code = 422
    code = "validation_error"
