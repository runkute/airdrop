"""AI Marketing OS – FastAPI application factory."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.core.config import settings
from app.core.exceptions import add_exception_handlers
from app.core.logging import get_logger
from app.core.middleware import RequestIDMiddleware, RequestLoggingMiddleware

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# Sentry initialisation (only when DSN is configured)
# ---------------------------------------------------------------------------

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
        send_default_pii=False,
    )
    log.info("sentry_initialised", environment=settings.ENVIRONMENT)


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifecycle manager."""
    # ---- Startup ----
    log.info("app_starting", name=settings.APP_NAME, version=settings.APP_VERSION)

    # Verify database connectivity
    try:
        from app.core.database import engine
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        log.info("database_connected")
    except Exception as exc:
        log.error("database_connection_failed", error=str(exc))
        # Don't prevent startup; let health checks surface DB issues

    # Verify Redis connectivity
    try:
        from app.core.redis_client import redis_client
        await redis_client.ping()
        log.info("redis_connected")
    except Exception as exc:
        log.warning("redis_connection_failed", error=str(exc))

    # Log available AI providers
    try:
        from app.integrations.ai.gateway import ai_gateway
        log.info("ai_providers_available", providers=ai_gateway.available_providers)
    except Exception as exc:
        log.warning("ai_gateway_init_warning", error=str(exc))

    log.info("app_started")
    yield

    # ---- Shutdown ----
    log.info("app_shutting_down")

    try:
        from app.core.database import engine
        await engine.dispose()
        log.info("database_disconnected")
    except Exception as exc:
        log.warning("database_disconnect_error", error=str(exc))

    try:
        from app.core.redis_client import redis_client
        await redis_client.aclose()
        log.info("redis_disconnected")
    except Exception as exc:
        log.warning("redis_disconnect_error", error=str(exc))

    log.info("app_stopped")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Enterprise AI Marketing Operating System – "
            "AI-powered content generation, multi-platform publishing, "
            "and ads performance monitoring."
        ),
        docs_url="/docs" if settings.DEBUG or settings.ENVIRONMENT != "production" else None,
        redoc_url="/redoc" if settings.DEBUG or settings.ENVIRONMENT != "production" else None,
        openapi_url="/openapi.json" if settings.DEBUG or settings.ENVIRONMENT != "production" else None,
        lifespan=lifespan,
    )

    # ------------------------------------------------------------------
    # Middleware (order matters – outermost first)
    # ------------------------------------------------------------------

    # Request ID – must be first so all subsequent middleware/handlers have access
    app.add_middleware(RequestIDMiddleware)

    # Request logging
    app.add_middleware(RequestLoggingMiddleware)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Total-Count"],
    )

    # ------------------------------------------------------------------
    # Rate limiting (slowapi)
    # ------------------------------------------------------------------
    try:
        from slowapi import Limiter, _rate_limit_exceeded_handler
        from slowapi.errors import RateLimitExceeded
        from slowapi.util import get_remote_address

        limiter = Limiter(
            key_func=get_remote_address,
            default_limits=[
                f"{settings.RATE_LIMIT_REQUESTS}/{settings.RATE_LIMIT_PERIOD}second"
            ],
        )
        app.state.limiter = limiter
        app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    except ImportError:
        log.warning("slowapi_not_available_rate_limiting_disabled")

    # ------------------------------------------------------------------
    # Exception handlers
    # ------------------------------------------------------------------
    add_exception_handlers(app)

    # ------------------------------------------------------------------
    # API routers
    # ------------------------------------------------------------------
    from app.api.v1.router import api_router
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # ------------------------------------------------------------------
    # Top-level health endpoint (no auth, no prefix)
    # ------------------------------------------------------------------
    @app.get("/health", tags=["Health"], include_in_schema=False)
    async def root_health() -> dict:
        return {"status": "ok", "service": settings.APP_NAME}

    # ------------------------------------------------------------------
    # Prometheus metrics endpoint (optional)
    # ------------------------------------------------------------------
    try:
        from prometheus_client import make_asgi_app
        from starlette.routing import Mount

        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)
    except ImportError:
        pass

    log.info(
        "app_created",
        name=settings.APP_NAME,
        prefix=settings.API_V1_PREFIX,
        cors_origins=settings.CORS_ORIGINS,
    )
    return app


# ---------------------------------------------------------------------------
# Application instance (used by uvicorn and gunicorn)
# ---------------------------------------------------------------------------
app = create_app()
