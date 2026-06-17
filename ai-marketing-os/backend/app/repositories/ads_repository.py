from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ads import AdAccount, Campaign, CampaignMetrics
from app.repositories.base_repository import BaseRepository


class AdAccountRepository(BaseRepository[AdAccount]):
    """Repository for AdAccount operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(AdAccount, db)

    async def get_workspace_accounts(self, workspace_id: UUID) -> List[AdAccount]:
        """Return all ad accounts for a workspace."""
        result = await self.db.execute(
            select(AdAccount)
            .where(AdAccount.workspace_id == workspace_id)
            .order_by(AdAccount.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_platform_account(
        self, workspace_id: UUID, platform: str, account_id: str
    ) -> Optional[AdAccount]:
        """Look up an ad account by workspace, platform, and external account ID."""
        result = await self.db.execute(
            select(AdAccount).where(
                AdAccount.workspace_id == workspace_id,
                AdAccount.platform == platform,
                AdAccount.account_id == account_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_last_synced(self, account_id: UUID) -> None:
        """Stamp an ad account's last_synced_at with the current UTC time."""
        await self.db.execute(
            update(AdAccount)
            .where(AdAccount.id == account_id)
            .values(last_synced_at=datetime.now(timezone.utc))
        )
        await self.db.flush()


class CampaignRepository(BaseRepository[Campaign]):
    """Repository for Campaign operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(Campaign, db)

    async def get_account_campaigns(self, ad_account_id: UUID) -> List[Campaign]:
        """Return all campaigns for a given ad account."""
        result = await self.db.execute(
            select(Campaign)
            .where(Campaign.ad_account_id == ad_account_id)
            .order_by(Campaign.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_workspace_campaigns(
        self,
        workspace_id: UUID,
        platform: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Campaign]:
        """Return campaigns for a workspace with optional platform/status filters."""
        conditions = [Campaign.workspace_id == workspace_id]
        if platform is not None:
            conditions.append(Campaign.platform == platform)
        if status is not None:
            conditions.append(Campaign.status == status)

        result = await self.db.execute(
            select(Campaign)
            .where(and_(*conditions))
            .order_by(Campaign.created_at.desc())
        )
        return list(result.scalars().all())

    async def upsert_campaign(self, **data: Any) -> Campaign:
        """Create or update a campaign identified by (ad_account_id, external_campaign_id)."""
        ad_account_id: UUID = data["ad_account_id"]
        external_campaign_id: str = data["external_campaign_id"]

        result = await self.db.execute(
            select(Campaign).where(
                Campaign.ad_account_id == ad_account_id,
                Campaign.external_campaign_id == external_campaign_id,
            )
        )
        campaign = result.scalar_one_or_none()

        if campaign is None:
            campaign = Campaign(**data)
            self.db.add(campaign)
        else:
            for key, value in data.items():
                if hasattr(campaign, key):
                    setattr(campaign, key, value)

        await self.db.flush()
        await self.db.refresh(campaign)
        return campaign


class CampaignMetricsRepository(BaseRepository[CampaignMetrics]):
    """Repository for CampaignMetrics operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(CampaignMetrics, db)

    async def upsert_metrics(self, campaign_id: UUID, date_: date, **metrics: Any) -> CampaignMetrics:
        """Create or update daily metrics for a campaign."""
        result = await self.db.execute(
            select(CampaignMetrics).where(
                CampaignMetrics.campaign_id == campaign_id,
                CampaignMetrics.date == date_,
            )
        )
        existing = result.scalar_one_or_none()

        if existing is None:
            record = CampaignMetrics(campaign_id=campaign_id, date=date_, **metrics)
            self.db.add(record)
        else:
            for key, value in metrics.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            record = existing

        await self.db.flush()
        await self.db.refresh(record)
        return record

    async def get_campaign_metrics(
        self, campaign_id: UUID, date_from: date, date_to: date
    ) -> List[CampaignMetrics]:
        """Return daily metrics for a campaign within a date range."""
        result = await self.db.execute(
            select(CampaignMetrics)
            .where(
                CampaignMetrics.campaign_id == campaign_id,
                CampaignMetrics.date >= date_from,
                CampaignMetrics.date <= date_to,
            )
            .order_by(CampaignMetrics.date.asc())
        )
        return list(result.scalars().all())

    async def get_workspace_metrics_summary(
        self, workspace_id: UUID, date_from: date, date_to: date
    ) -> Dict[str, Any]:
        """Return aggregated metrics across all campaigns for a workspace."""
        result = await self.db.execute(
            select(
                func.coalesce(func.sum(CampaignMetrics.impressions), 0).label("total_impressions"),
                func.coalesce(func.sum(CampaignMetrics.clicks), 0).label("total_clicks"),
                func.coalesce(func.sum(CampaignMetrics.spend), Decimal("0")).label("total_spend"),
                func.coalesce(func.sum(CampaignMetrics.conversions), 0).label("total_conversions"),
                func.coalesce(func.avg(CampaignMetrics.ctr), 0.0).label("avg_ctr"),
                func.coalesce(func.avg(CampaignMetrics.roas), 0.0).label("avg_roas"),
                func.coalesce(func.avg(CampaignMetrics.cpc), 0.0).label("avg_cpc"),
                func.coalesce(func.avg(CampaignMetrics.cpm), 0.0).label("avg_cpm"),
            ).where(
                CampaignMetrics.workspace_id == workspace_id,
                CampaignMetrics.date >= date_from,
                CampaignMetrics.date <= date_to,
            )
        )
        row = result.one()
        return {
            "total_impressions": int(row.total_impressions),
            "total_clicks": int(row.total_clicks),
            "total_spend": float(row.total_spend),
            "total_conversions": int(row.total_conversions),
            "avg_ctr": float(row.avg_ctr),
            "avg_roas": float(row.avg_roas),
            "avg_cpc": float(row.avg_cpc),
            "avg_cpm": float(row.avg_cpm),
        }

    async def get_metrics_by_date(
        self, workspace_id: UUID, date_from: date, date_to: date
    ) -> List[Dict[str, Any]]:
        """Return per-date aggregated metrics across all campaigns for a workspace."""
        result = await self.db.execute(
            select(
                CampaignMetrics.date,
                func.coalesce(func.sum(CampaignMetrics.impressions), 0).label("impressions"),
                func.coalesce(func.sum(CampaignMetrics.clicks), 0).label("clicks"),
                func.coalesce(func.sum(CampaignMetrics.spend), Decimal("0")).label("spend"),
                func.coalesce(func.sum(CampaignMetrics.conversions), 0).label("conversions"),
                func.coalesce(func.avg(CampaignMetrics.ctr), 0.0).label("ctr"),
                func.coalesce(func.avg(CampaignMetrics.roas), 0.0).label("roas"),
            )
            .where(
                CampaignMetrics.workspace_id == workspace_id,
                CampaignMetrics.date >= date_from,
                CampaignMetrics.date <= date_to,
            )
            .group_by(CampaignMetrics.date)
            .order_by(CampaignMetrics.date.asc())
        )
        rows = result.all()
        return [
            {
                "date": str(row.date),
                "impressions": int(row.impressions),
                "clicks": int(row.clicks),
                "spend": float(row.spend),
                "conversions": int(row.conversions),
                "ctr": float(row.ctr),
                "roas": float(row.roas),
            }
            for row in rows
        ]
