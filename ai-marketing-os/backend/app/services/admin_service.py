from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.integrations.ai.gateway import ai_gateway
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.ai_usage_repository import AIUsageRepository
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository

log = get_logger(__name__)


class AdminService:
    """Administrative operations for platform management."""

    def __init__(
        self,
        user_repo: UserRepository,
        workspace_repo: WorkspaceRepository,
        ai_usage_repo: AIUsageRepository,
        db: AsyncSession,
    ) -> None:
        self.user_repo = user_repo
        self.workspace_repo = workspace_repo
        self.ai_usage_repo = ai_usage_repo
        self.db = db

    async def get_all_users(
        self, skip: int = 0, limit: int = 50
    ) -> Tuple[List[User], int]:
        """Return a paginated list of all users."""
        result = await self.db.execute(
            select(User)
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        users = list(result.scalars().all())

        count_result = await self.db.execute(select(func.count()).select_from(User))
        total = count_result.scalar_one()
        return users, total

    async def get_all_workspaces(
        self, skip: int = 0, limit: int = 50
    ) -> Tuple[List[Workspace], int]:
        """Return a paginated list of all workspaces."""
        result = await self.db.execute(
            select(Workspace)
            .order_by(Workspace.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        workspaces = list(result.scalars().all())

        count_result = await self.db.execute(select(func.count()).select_from(Workspace))
        total = count_result.scalar_one()
        return workspaces, total

    async def get_ai_usage_stats(
        self,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Return AI usage statistics across all workspaces."""
        from app.models.ai_usage import AIUsageLog

        conditions = []
        if date_from:
            conditions.append(AIUsageLog.created_at >= date_from)
        if date_to:
            conditions.append(AIUsageLog.created_at <= date_to)

        from sqlalchemy import and_
        where_clause = and_(*conditions) if conditions else True

        # By provider breakdown
        by_provider_result = await self.db.execute(
            select(
                AIUsageLog.provider,
                func.count(AIUsageLog.id).label("request_count"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.sum(AIUsageLog.cost_usd), 0).label("total_cost"),
            )
            .where(where_clause)
            .group_by(AIUsageLog.provider)
        )
        by_provider = [
            {
                "provider": row.provider,
                "request_count": int(row.request_count),
                "total_tokens": int(row.total_tokens),
                "total_cost_usd": float(row.total_cost),
            }
            for row in by_provider_result.all()
        ]

        # Requests per day
        per_day_result = await self.db.execute(
            select(
                func.date_trunc("day", AIUsageLog.created_at).label("day"),
                func.count(AIUsageLog.id).label("requests"),
                func.coalesce(func.sum(AIUsageLog.cost_usd), 0).label("cost"),
            )
            .where(where_clause)
            .group_by(func.date_trunc("day", AIUsageLog.created_at))
            .order_by(func.date_trunc("day", AIUsageLog.created_at))
        )
        per_day = [
            {
                "date": row.day.strftime("%Y-%m-%d") if row.day else None,
                "requests": int(row.requests),
                "cost_usd": float(row.cost),
            }
            for row in per_day_result.all()
        ]

        # Totals
        totals_result = await self.db.execute(
            select(
                func.count(AIUsageLog.id).label("total_requests"),
                func.coalesce(func.sum(AIUsageLog.total_tokens), 0).label("total_tokens"),
                func.coalesce(func.sum(AIUsageLog.cost_usd), 0).label("total_cost"),
            ).where(where_clause)
        )
        totals = totals_result.one()

        return {
            "by_provider": by_provider,
            "per_day": per_day,
            "total_requests": int(totals.total_requests),
            "total_tokens": int(totals.total_tokens),
            "total_cost_usd": float(totals.total_cost),
        }

    async def get_system_health(self) -> Dict[str, Any]:
        """Return system health status."""
        # Check DB connection
        db_healthy = False
        try:
            await self.db.execute(select(func.now()))
            db_healthy = True
        except Exception as exc:
            log.error("health_check_db_error", error=str(exc))

        # Check Redis
        redis_healthy = False
        try:
            from app.core.redis_client import redis_client
            await redis_client.ping()
            redis_healthy = True
        except Exception as exc:
            log.warning("health_check_redis_error", error=str(exc))

        # Check AI providers
        try:
            provider_status = await ai_gateway.get_providers_status()
        except Exception:
            provider_status = {}

        # Platform stats
        try:
            user_count_result = await self.db.execute(select(func.count()).select_from(User))
            user_count = user_count_result.scalar_one()
            ws_count_result = await self.db.execute(select(func.count()).select_from(Workspace))
            ws_count = ws_count_result.scalar_one()
        except Exception:
            user_count = 0
            ws_count = 0

        overall_healthy = db_healthy and redis_healthy

        return {
            "status": "healthy" if overall_healthy else "degraded",
            "database": "connected" if db_healthy else "error",
            "redis": "connected" if redis_healthy else "error",
            "ai_providers": provider_status,
            "platform_stats": {
                "total_users": user_count,
                "total_workspaces": ws_count,
            },
        }

    async def get_platform_stats(self) -> Dict[str, Any]:
        """Return high-level platform statistics."""
        from app.models.ai_usage import AIUsageLog
        from app.models.content import ContentPost
        from app.models.ads import AdAccount, Campaign

        user_count = (
            await self.db.execute(select(func.count()).select_from(User))
        ).scalar_one()
        workspace_count = (
            await self.db.execute(select(func.count()).select_from(Workspace))
        ).scalar_one()
        content_count = (
            await self.db.execute(select(func.count()).select_from(ContentPost))
        ).scalar_one()
        ad_account_count = (
            await self.db.execute(select(func.count()).select_from(AdAccount))
        ).scalar_one()
        campaign_count = (
            await self.db.execute(select(func.count()).select_from(Campaign))
        ).scalar_one()
        ai_request_count = (
            await self.db.execute(select(func.count()).select_from(AIUsageLog))
        ).scalar_one()
        ai_cost = (
            await self.db.execute(
                select(func.coalesce(func.sum(AIUsageLog.cost_usd), 0))
            )
        ).scalar_one()

        return {
            "total_users": user_count,
            "total_workspaces": workspace_count,
            "total_content_posts": content_count,
            "total_ad_accounts": ad_account_count,
            "total_campaigns": campaign_count,
            "total_ai_requests": ai_request_count,
            "total_ai_cost_usd": float(ai_cost),
        }

    async def deactivate_user(self, user_id: UUID) -> User:
        """Deactivate a user account."""
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError(message=f"User {user_id} not found.")
        user.is_active = False
        await self.db.flush()
        await self.db.refresh(user)
        log.info("user_deactivated", user_id=str(user_id))
        return user

    async def deactivate_workspace(self, workspace_id: UUID) -> Workspace:
        """Deactivate a workspace."""
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if workspace is None:
            raise NotFoundError(message=f"Workspace {workspace_id} not found.")
        workspace.is_active = False
        await self.db.flush()
        await self.db.refresh(workspace)
        log.info("workspace_deactivated", workspace_id=str(workspace_id))
        return workspace
