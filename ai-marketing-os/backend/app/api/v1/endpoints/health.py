from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter()


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """Basic health check – verifies DB connectivity."""
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def readiness_check() -> dict:
    """Kubernetes readiness probe – returns 200 when the app is ready to serve traffic."""
    return {"status": "ready", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/live")
async def liveness_check() -> dict:
    """Kubernetes liveness probe – returns 200 when the app is alive."""
    return {"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()}
