from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import ContentPost, PublishingLog
from app.repositories.base_repository import BaseRepository


class ContentRepository(BaseRepository[ContentPost]):
    """Repository for ContentPost and PublishingLog operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(ContentPost, db)

    async def get_workspace_posts(
        self,
        workspace_id: UUID,
        status: Optional[str] = None,
        content_type: Optional[str] = None,
        platform: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ContentPost]:
        """Return a filtered, paginated list of posts for a workspace."""
        conditions = [ContentPost.workspace_id == workspace_id]
        if status is not None:
            conditions.append(ContentPost.status == status)
        if content_type is not None:
            conditions.append(ContentPost.content_type == content_type)
        if platform is not None:
            conditions.append(ContentPost.platform == platform)

        result = await self.db.execute(
            select(ContentPost)
            .where(and_(*conditions))
            .order_by(ContentPost.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_scheduled_posts(self, before_datetime: datetime) -> List[ContentPost]:
        """Return all scheduled posts whose scheduled_at is at or before the given datetime.

        Used by the publishing queue worker.
        """
        result = await self.db.execute(
            select(ContentPost).where(
                ContentPost.status == "scheduled",
                ContentPost.scheduled_at <= before_datetime,
            )
        )
        return list(result.scalars().all())

    async def update_status(
        self,
        post_id: UUID,
        status: str,
        published_at: Optional[datetime] = None,
        external_post_id: Optional[str] = None,
    ) -> ContentPost:
        """Update a post's status (and optionally set published_at / external_post_id)."""
        values: Dict[str, Any] = {"status": status}
        if published_at is not None:
            values["published_at"] = published_at
        if external_post_id is not None:
            values["external_post_id"] = external_post_id

        await self.db.execute(
            update(ContentPost).where(ContentPost.id == post_id).values(**values)
        )
        await self.db.flush()

        result = await self.db.execute(select(ContentPost).where(ContentPost.id == post_id))
        post = result.scalar_one()
        return post

    async def create_publishing_log(
        self,
        content_post_id: UUID,
        platform: str,
        status: str,
        response_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> PublishingLog:
        """Persist a new publishing log entry."""
        log = PublishingLog(
            content_post_id=content_post_id,
            platform=platform,
            status=status,
            response_data=response_data,
            error_message=error_message,
            retry_count=0,
            attempted_at=datetime.now(timezone.utc),
        )
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        return log

    async def get_publishing_logs(self, content_post_id: UUID) -> List[PublishingLog]:
        """Return all publishing log entries for a given content post."""
        result = await self.db.execute(
            select(PublishingLog)
            .where(PublishingLog.content_post_id == content_post_id)
            .order_by(PublishingLog.attempted_at.desc())
        )
        return list(result.scalars().all())

    async def get_calendar_posts(
        self, workspace_id: UUID, date_from: datetime, date_to: datetime
    ) -> List[ContentPost]:
        """Return scheduled and published posts within a date range for the calendar view."""
        result = await self.db.execute(
            select(ContentPost)
            .where(
                ContentPost.workspace_id == workspace_id,
                ContentPost.scheduled_at >= date_from,
                ContentPost.scheduled_at <= date_to,
            )
            .order_by(ContentPost.scheduled_at.asc())
        )
        return list(result.scalars().all())

    async def count_by_status(self, workspace_id: UUID) -> Dict[str, int]:
        """Return a dict mapping each status to its post count for a workspace."""
        result = await self.db.execute(
            select(ContentPost.status, func.count(ContentPost.id))
            .where(ContentPost.workspace_id == workspace_id)
            .group_by(ContentPost.status)
        )
        rows = result.all()
        return {row[0]: row[1] for row in rows}
