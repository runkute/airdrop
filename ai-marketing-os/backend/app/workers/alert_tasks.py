"""Celery tasks for AI alert detection."""

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List

from celery.utils.log import get_task_logger

from app.workers.celery_app import celery_app

log = get_task_logger(__name__)


def _run_async(coro):
    """Run an async coroutine synchronously in a Celery task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


async def _async_get_active_workspace_ids() -> List[str]:
    """Return IDs of all active workspaces."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy import select
    from app.core.config import settings
    from app.models.workspace import Workspace

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            select(Workspace.id).where(Workspace.is_active == True)
        )
        return [str(row[0]) for row in result.all()]


async def _async_run_workspace_alerts(workspace_id: str) -> Dict[str, Any]:
    """Run alert detection for a single workspace."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from app.core.config import settings
    from app.models.ads import AdAccount, Campaign, CampaignMetrics
    from app.models.ai_usage import AIAlert
    from app.repositories.ads_repository import CampaignMetricsRepository, CampaignRepository
    from app.repositories.ai_usage_repository import AIAlertRepository
    from app.services.alert_service import AlertService
    from uuid import UUID

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            service = AlertService(
                alert_repo=AIAlertRepository(AIAlert, session),
                metrics_repo=CampaignMetricsRepository(CampaignMetrics, session),
                campaign_repo=CampaignRepository(Campaign, session),
            )
            alerts = await service.run_alerts_for_workspace(UUID(workspace_id))
            return {
                "workspace_id": workspace_id,
                "alerts_created": len(alerts),
            }


@celery_app.task(
    name="app.workers.alert_tasks.run_alert_detection",
    queue="alerts",
)
def run_alert_detection() -> Dict[str, Any]:
    """Run alert detection for all active workspaces.

    Runs every 30 minutes via Celery Beat.
    """
    log.info("Starting alert detection for all workspaces")
    try:
        workspace_ids = _run_async(_async_get_active_workspace_ids())
    except Exception as exc:
        log.error(f"Failed to fetch active workspace IDs: {exc}")
        return {"error": str(exc)}

    log.info(f"Running alerts for {len(workspace_ids)} workspaces")
    for workspace_id in workspace_ids:
        run_workspace_alerts.delay(workspace_id)

    return {
        "workspaces_queued": len(workspace_ids),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@celery_app.task(
    name="app.workers.alert_tasks.run_workspace_alerts",
    queue="alerts",
)
def run_workspace_alerts(workspace_id: str) -> Dict[str, Any]:
    """Run alert detection for a specific workspace."""
    log.info(f"Running alerts for workspace {workspace_id}")
    try:
        result = _run_async(_async_run_workspace_alerts(workspace_id))
        log.info(f"Alert detection complete: {result}")
        return result
    except Exception as exc:
        log.error(f"Alert detection failed for workspace {workspace_id}: {exc}")
        return {"workspace_id": workspace_id, "error": str(exc)}
