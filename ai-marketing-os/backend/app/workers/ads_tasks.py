"""Celery tasks for ad account data synchronisation."""

import asyncio
from datetime import date, datetime, timedelta, timezone
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


async def _async_get_all_active_accounts() -> List[Dict[str, Any]]:
    """Return all active ad accounts from the DB."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from sqlalchemy import select
    from app.core.config import settings
    from app.models.ads import AdAccount

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            select(AdAccount).where(AdAccount.is_active == True)
        )
        accounts = result.scalars().all()
        return [
            {
                "id": str(a.id),
                "workspace_id": str(a.workspace_id),
                "platform": a.platform,
            }
            for a in accounts
        ]


async def _async_sync_account(
    ad_account_id: str, date_from_str: str, date_to_str: str
) -> Dict[str, Any]:
    """Async implementation of ad account sync."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from app.core.config import settings
    from app.models.ads import AdAccount, Campaign, CampaignMetrics
    from app.repositories.ads_repository import (
        AdAccountRepository,
        CampaignRepository,
        CampaignMetricsRepository,
    )
    from app.services.ads_service import AdsService
    from uuid import UUID

    d_from = date.fromisoformat(date_from_str)
    d_to = date.fromisoformat(date_to_str)

    # Get workspace_id from account
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            account_repo = AdAccountRepository(AdAccount, session)
            account = await account_repo.get_by_id(UUID(ad_account_id))
            if account is None:
                return {"error": f"Account {ad_account_id} not found"}

            service = AdsService(
                account_repo=account_repo,
                campaign_repo=CampaignRepository(Campaign, session),
                metrics_repo=CampaignMetricsRepository(CampaignMetrics, session),
            )
            return await service.sync_ads_data(
                ad_account_id=UUID(ad_account_id),
                workspace_id=account.workspace_id,
                date_from=d_from,
                date_to=d_to,
            )


@celery_app.task(
    name="app.workers.ads_tasks.sync_all_ads",
    queue="ads",
)
def sync_all_ads() -> Dict[str, Any]:
    """Fetch all active ad accounts and queue individual sync tasks.

    Runs every hour via Celery Beat.
    Default date range: past 7 days.
    """
    log.info("Starting sync_all_ads")
    date_to = datetime.now(timezone.utc).date()
    date_from = date_to - timedelta(days=7)

    try:
        accounts = _run_async(_async_get_all_active_accounts())
    except Exception as exc:
        log.error(f"Failed to fetch active accounts: {exc}")
        return {"error": str(exc)}

    log.info(f"Queuing sync for {len(accounts)} accounts")
    for account in accounts:
        sync_ad_account.delay(
            account["id"],
            date_from.isoformat(),
            date_to.isoformat(),
        )

    return {
        "queued": len(accounts),
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    name="app.workers.ads_tasks.sync_ad_account",
    queue="ads",
)
def sync_ad_account(
    self,
    ad_account_id: str,
    date_from: str,
    date_to: str,
) -> Dict[str, Any]:
    """Sync a single ad account's campaigns and metrics.

    Retries up to 2 times on failure.
    """
    log.info(f"Syncing ad account {ad_account_id} ({date_from} to {date_to})")
    try:
        result = _run_async(_async_sync_account(ad_account_id, date_from, date_to))
        log.info(f"Ad account sync complete: {result}")
        return result
    except Exception as exc:
        log.error(f"Failed to sync ad account {ad_account_id}: {exc}")
        raise self.retry(exc=exc)
