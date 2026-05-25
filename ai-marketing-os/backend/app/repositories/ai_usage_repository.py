from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_usage import AIAlert, AIUsageLog
from app.repositories.base_repository import BaseRepository


class AIUsageRepository(BaseRepository[AIUsageLog]):
    """Repository for AIUsageLog operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(AIUsageLog, db)

    async def log_usage(
        self,
        workspace_id: UUID,
        provider: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost_usd: Decimal,
        content_type: str,
        request_id: str,
        user_id: Optional[UUID] = None,
        content_post_id: Optional[UUID] = None,
        duration_ms: Optional[int] = None,
    ) -> AIUsageLog:
        """Create and persist an AI usage log entry."""
        log_entry = AIUsageLog(
            workspace_id=workspace_id,
            user_id=user_id,
            content_post_id=content_post_id,
            provider=provider,
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost_usd=cost_usd,
            content_type=content_type,
            request_id=request_id,
            duration_ms=duration_ms,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(log_entry)
        await self.db.flush()
        await self.db.refresh(log_entry)
        return log_entry

    async def get_workspace_usage(
        self,
        workspace_id: UUID,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> List[AIUsageLog]:
        """Return usage log entries for a workspace within an optional date range."""
        conditions = [AIUsageLog.workspace_id == workspace_id]
        if date_from is not None:
            conditions.append(AIUsageLog.created_at >= date_from)
        if date_to is not None:
            conditions.append(AIUsageLog.created_at <= date_to)

        result = await self.db.execute(
            select(AIUsageLog)
            .where(and_(*conditions))
            .order_by(AIUsageLog.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_usage_summary(
        self,
        workspace_id: UUID,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Return aggregated token and cost stats broken down by provider."""
        conditions = [AIUsageLog.workspace_id == workspace_id]
        if date_from is not None:
            conditions.append(AIUsageLog.created_at >= date_from)
        if date_to is not None:
            conditions.append(AIUsageLog.created_at <= date_to)

        where = and_(*conditions)

        # Per-provider breakdown
        by_provider_result = await self.db.execute(
            select(
                AIUsageLog.provider,
                func.count(AIUsageLog.id).label("request_count"),
                func.coalesce(func.sum(AIUsageLog.prompt_tokens), 0).label("prompt_tokens"),
                func.coalesce(func.sum(AIUsageLog.completion_tokens), 0).label("completion_tokens"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.sum(AIUsageLog.cost_usd), Decimal("0")).label("cost_usd"),
            )
            .where(where)
            .group_by(AIUsageLog.provider)
        )
        by_provider = [
            {
                "provider": row.provider,
                "request_count": int(row.request_count),
                "prompt_tokens": int(row.prompt_tokens),
                "completion_tokens": int(row.completion_tokens),
                "total_tokens": int(row.total_tokens),
                "cost_usd": float(row.cost_usd),
            }
            for row in by_provider_result.all()
        ]

        # Overall totals
        totals_result = await self.db.execute(
            select(
                func.count(AIUsageLog.id).label("total_requests"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.sum(AIUsageLog.cost_usd), Decimal("0")).label("total_cost_usd"),
            ).where(where)
        )
        totals = totals_result.one()

        return {
            "by_provider": by_provider,
            "total_requests": int(totals.total_requests),
            "total_tokens": int(totals.total_tokens),
            "total_cost_usd": float(totals.total_cost_usd),
        }


class AIAlertRepository(BaseRepository[AIAlert]):
    """Repository for AIAlert operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(AIAlert, db)

    async def create_alert(
        self,
        workspace_id: UUID,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        campaign_id: Optional[UUID] = None,
        ad_account_id: Optional[UUID] = None,
    ) -> AIAlert:
        """Create and persist a new AI alert."""
        alert = AIAlert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            ad_account_id=ad_account_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            details=details or {},
            is_read=False,
            is_dismissed=False,
            triggered_at=datetime.now(timezone.utc),
        )
        self.db.add(alert)
        await self.db.flush()
        await self.db.refresh(alert)
        return alert

    async def get_workspace_alerts(
        self,
        workspace_id: UUID,
        is_read: Optional[bool] = None,
        severity: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[AIAlert]:
        """Return non-dismissed alerts for a workspace with optional filters."""
        conditions = [
            AIAlert.workspace_id == workspace_id,
            AIAlert.is_dismissed.is_(False),
        ]
        if is_read is not None:
            conditions.append(AIAlert.is_read.is_(is_read))
        if severity is not None:
            conditions.append(AIAlert.severity == severity)

        result = await self.db.execute(
            select(AIAlert)
            .where(and_(*conditions))
            .order_by(AIAlert.triggered_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_unread_count(self, workspace_id: UUID) -> int:
        """Return the count of unread, non-dismissed alerts for a workspace."""
        result = await self.db.execute(
            select(func.count(AIAlert.id)).where(
                AIAlert.workspace_id == workspace_id,
                AIAlert.is_read.is_(False),
                AIAlert.is_dismissed.is_(False),
            )
        )
        return result.scalar_one()

    async def mark_as_read(self, alert_ids: List[UUID], workspace_id: UUID) -> int:
        """Mark the given alerts as read and return the number of records updated."""
        result = await self.db.execute(
            select(AIAlert).where(
                AIAlert.id.in_(alert_ids),
                AIAlert.workspace_id == workspace_id,
                AIAlert.is_read.is_(False),
            )
        )
        alerts = result.scalars().all()
        count = 0
        for alert in alerts:
            alert.is_read = True
            count += 1
        await self.db.flush()
        return count

    async def dismiss_alert(self, alert_id: UUID, workspace_id: UUID) -> None:
        """Mark a single alert as dismissed."""
        await self.db.execute(
            update(AIAlert)
            .where(
                AIAlert.id == alert_id,
                AIAlert.workspace_id == workspace_id,
            )
            .values(is_dismissed=True)
        )
        await self.db.flush()
