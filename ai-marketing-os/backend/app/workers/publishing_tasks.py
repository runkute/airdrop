"""Celery tasks for content publishing."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict

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


async def _async_publish(post_id: str, credentials: dict) -> Dict[str, Any]:
    """Async implementation of content publishing."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from app.core.config import settings
    from app.models.content import ContentPost
    from app.repositories.content_repository import ContentRepository
    from app.services.publishing_service import PublishingService
    from uuid import UUID

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            service = PublishingService(
                content_repo=ContentRepository(ContentPost, session)
            )
            pub_log = await service.publish_now(
                post_id=UUID(post_id),
                workspace_id=None,  # Resolve from post record
                credentials=credentials,
            )
            return {
                "log_id": str(pub_log.id),
                "status": pub_log.status,
                "platform": pub_log.platform,
            }


async def _async_process_scheduled() -> Dict[str, Any]:
    """Async implementation of scheduled post processing."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
    from app.core.config import settings
    from app.models.content import ContentPost
    from app.repositories.content_repository import ContentRepository
    from app.services.publishing_service import PublishingService

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            service = PublishingService(
                content_repo=ContentRepository(ContentPost, session)
            )
            logs = await service.process_scheduled_posts()
            return {
                "processed": len(logs),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=300,
    name="app.workers.publishing_tasks.publish_content",
    queue="publishing",
)
def publish_content(self, post_id: str, credentials: dict) -> Dict[str, Any]:
    """Publish a single content post to its target platform.

    Retries up to 3 times with a 5-minute delay on failure.
    """
    log.info(f"Publishing post {post_id}")
    try:
        result = _run_async(_async_publish(post_id, credentials))
        log.info(f"Post {post_id} published: {result}")
        return result
    except Exception as exc:
        log.error(f"Failed to publish post {post_id}: {exc}")
        # Exponential backoff: 300s, 600s, 1200s
        retry_countdown = 300 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=retry_countdown)


@celery_app.task(
    name="app.workers.publishing_tasks.process_scheduled_posts",
    queue="publishing",
)
def process_scheduled_posts() -> Dict[str, Any]:
    """Find all scheduled posts due for publishing and process them.

    This task runs every 60 seconds via Celery Beat.
    """
    log.info("Processing scheduled posts")
    try:
        result = _run_async(_async_process_scheduled())
        log.info(f"Scheduled posts processing complete: {result}")
        return result
    except Exception as exc:
        log.error(f"Scheduled posts processing failed: {exc}")
        raise
