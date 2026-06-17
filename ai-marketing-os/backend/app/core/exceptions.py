from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# ---------------------------------------------------------------------------
# Base exception
# ---------------------------------------------------------------------------

class AppException(Exception):
    """Base class for all application-level exceptions."""

    code: str = "APP_ERROR"
    message: str = "An unexpected error occurred."
    status_code: int = 500

    def __init__(
        self,
        message: str | None = None,
        code: str | None = None,
        status_code: int | None = None,
        details: Any = None,
    ) -> None:
        self.message = message or self.__class__.message
        self.code = code or self.__class__.code
        self.status_code = status_code or self.__class__.status_code
        self.details = details
        super().__init__(self.message)


# ---------------------------------------------------------------------------
# Concrete exception classes
# ---------------------------------------------------------------------------

class AuthenticationError(AppException):
    code = "AUTHENTICATION_ERROR"
    message = "Authentication failed."
    status_code = 401


class AuthorizationError(AppException):
    code = "AUTHORIZATION_ERROR"
    message = "You do not have permission to perform this action."
    status_code = 403


class NotFoundError(AppException):
    code = "NOT_FOUND"
    message = "The requested resource was not found."
    status_code = 404


class ValidationError(AppException):
    code = "VALIDATION_ERROR"
    message = "Request validation failed."
    status_code = 422


class ConflictError(AppException):
    code = "CONFLICT"
    message = "A conflict occurred with the current state of the resource."
    status_code = 409


class RateLimitError(AppException):
    code = "RATE_LIMIT_EXCEEDED"
    message = "Too many requests. Please slow down."
    status_code = 429


class AIProviderError(AppException):
    code = "AI_PROVIDER_ERROR"
    message = "The AI provider returned an error or is unavailable."
    status_code = 502


class PublishingError(AppException):
    code = "PUBLISHING_ERROR"
    message = "Failed to publish content to the target platform."
    status_code = 502


class ExternalServiceError(AppException):
    code = "EXTERNAL_SERVICE_ERROR"
    message = "An external service is unavailable or returned an error."
    status_code = 502


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

def _error_response(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    content: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details is not None:
        content["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=content)


async def _app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return _error_response(exc.status_code, exc.code, exc.message, exc.details)


async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Avoid leaking internal details in production
    from app.core.config import settings
    from app.core.logging import get_logger

    log = get_logger(__name__)
    log.error("unhandled_exception", path=request.url.path, error=str(exc), exc_info=exc)

    message = str(exc) if settings.DEBUG else "An unexpected internal server error occurred."
    return _error_response(500, "INTERNAL_SERVER_ERROR", message)


def add_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI *app* instance."""
    app.add_exception_handler(AppException, _app_exception_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled_exception_handler)  # type: ignore[arg-type]
