"""
Desktop entry point for AI Marketing OS.
Uses SQLite + APScheduler instead of PostgreSQL + Redis + Celery.
"""
import asyncio
import os
import logging
from contextlib import asynccontextmanager

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db, engine
from app.core.exceptions import add_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestIDMiddleware, RequestLoggingMiddleware
from app.api.v1.router import api_router

# ─── Scheduler (replaces Celery beat) ────────────────────────────────────────
scheduler = AsyncIOScheduler(timezone="UTC")
logger = structlog.get_logger(__name__)


async def _run_scheduled_publishing():
    """Process posts that are due for publishing."""
    try:
        from app.core.database import AsyncSessionLocal
        from app.repositories.content_repository import ContentRepository
        from app.services.publishing_service import PublishingService

        async with AsyncSessionLocal() as db:
            service = PublishingService(ContentRepository(db))
            logs = await service.process_scheduled_posts(db)
            if logs:
                logger.info("desktop_publishing_tick", processed=len(logs))
    except Exception as e:
        logger.error("desktop_publishing_error", error=str(e))


async def _run_alert_detection():
    """Run AI alert detection for all workspaces."""
    try:
        from app.core.database import AsyncSessionLocal
        from app.repositories.ads_repository import AdAccountRepository, CampaignMetricsRepository
        from app.repositories.ai_usage_repository import AIAlertRepository
        from app.services.alert_service import AlertService

        async with AsyncSessionLocal() as db:
            service = AlertService(
                AIAlertRepository(db),
                CampaignMetricsRepository(db),
            )
            from app.models.workspace import Workspace
            from sqlalchemy import select
            result = await db.execute(select(Workspace).where(Workspace.is_active == True))
            workspaces = result.scalars().all()
            for ws in workspaces:
                await service.run_alerts_for_workspace(ws.id, db)
    except Exception as e:
        logger.error("desktop_alert_error", error=str(e))


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info(
        "desktop_startup",
        version=settings.APP_VERSION,
        db=settings.DATABASE_URL[:50] + "...",
        port=os.environ.get("BACKEND_PORT", 8765),
    )

    # Initialize database (creates tables if not exist)
    await init_db()
    logger.info("database_ready")

    # Start background scheduler
    scheduler.add_job(
        _run_scheduled_publishing,
        "interval",
        seconds=60,
        id="publishing",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        _run_alert_detection,
        "interval",
        minutes=30,
        id="alerts",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.start()
    logger.info("scheduler_started", jobs=len(scheduler.get_jobs()))

    yield

    # Shutdown
    scheduler.shutdown(wait=False)
    await engine.dispose()
    logger.info("desktop_shutdown")


# ─── App factory ──────────────────────────────────────────────────────────────
def create_desktop_app() -> FastAPI:
    app = FastAPI(
        title=f"{settings.APP_NAME} — Desktop",
        version=settings.APP_VERSION,
        description="AI Marketing Operating System Desktop Edition",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS — allow Electron renderer (file:// and localhost)
    cors_origins = settings.CORS_ORIGINS + ["file://", "app://."]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Desktop: allow all since traffic is local
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)

    # Exception handlers
    add_exception_handlers(app)

    # Routers
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    # Health
    @app.get("/health", tags=["Health"], include_in_schema=False)
    async def health():
        return {
            "status": "healthy",
            "mode": "desktop",
            "version": settings.APP_VERSION,
            "database": "sqlite",
            "scheduler": "apscheduler",
        }

    @app.get("/health/ready", tags=["Health"], include_in_schema=False)
    async def readiness():
        return JSONResponse({"status": "ready"})

    return app


app = create_desktop_app()


# ─── Entry point (PyInstaller / direct run) ───────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("BACKEND_PORT", 8765))
    log_level = os.environ.get("LOG_LEVEL", "info").lower()

    uvicorn.run(
        "app.main_desktop:app",
        host="127.0.0.1",
        port=port,
        log_level=log_level,
        reload=False,
        workers=1,
    )
