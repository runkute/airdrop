from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.integrations.social.base import PublishResult
from app.integrations.social.facebook_publisher import FacebookPublisher
from app.integrations.social.instagram_publisher import InstagramPublisher
from app.integrations.social.wordpress_publisher import WordPressPublisher
from app.models.content import ContentPost, PublishingLog
from app.repositories.content_repository import ContentRepository

log = get_logger(__name__)

_PUBLISHERS = {
    "facebook": FacebookPublisher,
    "instagram": InstagramPublisher,
    "wordpress": WordPressPublisher,
}


class PublishingService:
    """Service for publishing content posts to social/web platforms."""

    def __init__(self, content_repo: ContentRepository) -> None:
        self.content_repo = content_repo

    async def publish_now(
        self,
        post_id: UUID,
        workspace_id: UUID,
        credentials: dict,
    ) -> PublishingLog:
        """Immediately publish a content post to its target platform."""
        from sqlalchemy import select

        result = await self.content_repo.db.execute(
            select(ContentPost).where(
                ContentPost.id == post_id,
                ContentPost.workspace_id == workspace_id,
            )
        )
        post = result.scalar_one_or_none()
        if post is None:
            raise NotFoundError(message=f"Content post {post_id} not found.")

        if post.status == "published":
            raise ValidationError(message="Post is already published.")

        platform = post.platform.lower()
        publisher_class = _PUBLISHERS.get(platform)

        if publisher_class is None:
            # Create a failed log entry for unsupported platforms
            pub_log = await self.content_repo.create_publishing_log(
                content_post_id=post.id,
                platform=platform,
                status="failed",
                error_message=f"Publishing to '{platform}' is not yet supported.",
            )
            return pub_log

        publisher = publisher_class()

        try:
            publish_result: PublishResult = await publisher.publish(
                content=post.content,
                **credentials,
            )
        except Exception as exc:
            log.error(
                "publish_error",
                post_id=str(post_id),
                platform=platform,
                error=str(exc),
            )
            publish_result = PublishResult(
                success=False,
                external_post_id=None,
                post_url=None,
                error_message=str(exc),
                raw_response=None,
            )

        now = datetime.now(timezone.utc)

        if publish_result.success:
            pub_log = await self.content_repo.create_publishing_log(
                content_post_id=post.id,
                platform=platform,
                status="success",
                response_data={
                    "external_post_id": publish_result.external_post_id,
                    "post_url": publish_result.post_url,
                    "raw": publish_result.raw_response,
                },
            )
            pub_log.completed_at = now
            post.status = "published"
            post.published_at = now
            post.external_post_id = publish_result.external_post_id or ""
        else:
            pub_log = await self.content_repo.create_publishing_log(
                content_post_id=post.id,
                platform=platform,
                status="failed",
                error_message=publish_result.error_message,
                response_data=publish_result.raw_response,
            )
            post.status = "failed"

        await self.content_repo.db.flush()
        await self.content_repo.db.refresh(pub_log)

        log.info(
            "post_published" if publish_result.success else "post_publish_failed",
            post_id=str(post_id),
            platform=platform,
            external_id=publish_result.external_post_id,
        )
        return pub_log

    async def process_scheduled_posts(self) -> List[PublishingLog]:
        """Find all overdue scheduled posts and attempt to publish each."""
        now = datetime.now(timezone.utc)
        scheduled_posts = await self.content_repo.get_scheduled_posts(
            before_datetime=now
        )
        logs: List[PublishingLog] = []
        for post in scheduled_posts:
            try:
                # For scheduled publishing we don't have live credentials here;
                # credentials should be stored in the workspace ad account or post metadata.
                credentials = post.metadata_ or {}
                pub_log = await self.publish_now(post.id, post.workspace_id, credentials)
                logs.append(pub_log)
            except Exception as exc:
                log.error(
                    "scheduled_post_processing_error",
                    post_id=str(post.id),
                    error=str(exc),
                )
        return logs

    async def retry_failed_post(
        self,
        post_id: UUID,
        workspace_id: UUID,
        credentials: dict,
    ) -> PublishingLog:
        """Retry publishing a failed post."""
        from sqlalchemy import select

        result = await self.content_repo.db.execute(
            select(ContentPost).where(
                ContentPost.id == post_id,
                ContentPost.workspace_id == workspace_id,
            )
        )
        post = result.scalar_one_or_none()
        if post is None:
            raise NotFoundError(message=f"Content post {post_id} not found.")
        if post.status != "failed":
            raise ValidationError(
                message=f"Post status is '{post.status}', not 'failed'. Cannot retry."
            )

        # Increment retry count on the latest log
        logs = await self.content_repo.get_publishing_logs(post_id)
        if logs:
            latest_log = logs[0]
            latest_log.retry_count += 1
            await self.content_repo.db.flush()

        return await self.publish_now(post_id, workspace_id, credentials)

    async def get_publishing_logs(
        self,
        post_id: UUID,
        workspace_id: UUID,
    ) -> List[PublishingLog]:
        """Return publishing logs for a specific post."""
        # Verify the post belongs to this workspace
        from sqlalchemy import select

        result = await self.content_repo.db.execute(
            select(ContentPost).where(
                ContentPost.id == post_id,
                ContentPost.workspace_id == workspace_id,
            )
        )
        post = result.scalar_one_or_none()
        if post is None:
            raise NotFoundError(message=f"Content post {post_id} not found.")
        return await self.content_repo.get_publishing_logs(post_id)

    async def get_workspace_logs(
        self,
        workspace_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> List[PublishingLog]:
        """Return all publishing logs for a workspace."""
        from sqlalchemy import select
        result = await self.content_repo.db.execute(
            select(PublishingLog)
            .join(ContentPost, ContentPost.id == PublishingLog.content_post_id)
            .where(ContentPost.workspace_id == workspace_id)
            .order_by(PublishingLog.attempted_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_calendar_view(
        self,
        workspace_id: UUID,
        date_from: datetime,
        date_to: datetime,
    ) -> Dict[str, Any]:
        """Return content calendar data organised by date."""
        posts = await self.content_repo.get_calendar_posts(
            workspace_id=workspace_id,
            date_from=date_from,
            date_to=date_to,
        )

        # Organise posts by date string
        calendar: Dict[str, List[Dict[str, Any]]] = {}
        for post in posts:
            if post.scheduled_at:
                date_key = post.scheduled_at.strftime("%Y-%m-%d")
                if date_key not in calendar:
                    calendar[date_key] = []
                calendar[date_key].append(
                    {
                        "id": str(post.id),
                        "title": post.title,
                        "platform": post.platform,
                        "content_type": post.content_type,
                        "status": post.status,
                        "scheduled_at": post.scheduled_at.isoformat(),
                    }
                )

        return {
            "calendar": calendar,
            "total_scheduled": len(posts),
            "date_from": date_from.isoformat(),
            "date_to": date_to.isoformat(),
        }
