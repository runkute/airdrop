from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.integrations.ads.base import BaseAdsIntegration
from app.integrations.ads.meta_ads import MetaAdsIntegration
from app.integrations.ads.google_ads import GoogleAdsIntegration
from app.integrations.ads.tiktok_ads import TikTokAdsIntegration
from app.models.ads import AdAccount, Campaign, CampaignMetrics
from app.repositories.ads_repository import (
    AdAccountRepository,
    CampaignMetricsRepository,
    CampaignRepository,
)

log = get_logger(__name__)

_INTEGRATIONS: Dict[str, type] = {
    "meta": MetaAdsIntegration,
    "google": GoogleAdsIntegration,
    "tiktok": TikTokAdsIntegration,
}


class AdsService:
    """Business logic for ad account management and campaign metrics."""

    def __init__(
        self,
        account_repo: AdAccountRepository,
        campaign_repo: CampaignRepository,
        metrics_repo: CampaignMetricsRepository,
    ) -> None:
        self.account_repo = account_repo
        self.campaign_repo = campaign_repo
        self.metrics_repo = metrics_repo

    def _get_integration(self, platform: str) -> BaseAdsIntegration:
        integration_class = _INTEGRATIONS.get(platform.lower())
        if integration_class is None:
            raise ValueError(f"Unsupported ad platform: '{platform}'")
        return integration_class()

    async def connect_ad_account(
        self,
        workspace_id: UUID,
        platform: str,
        account_id: str,
        account_name: str,
        credentials: dict,
        currency: str = "USD",
        timezone_str: str = "UTC",
    ) -> AdAccount:
        """Connect a new ad account to a workspace."""
        # Verify credentials with the platform
        integration = self._get_integration(platform)
        is_valid = await integration.verify_credentials(credentials)
        if not is_valid:
            from app.core.exceptions import ValidationError
            raise ValidationError(
                message=f"Could not verify credentials for {platform}. "
                "Please check your API keys/tokens."
            )

        # Check for existing account
        existing = await self.account_repo.get_by_platform_account(
            workspace_id, platform, account_id
        )
        if existing:
            from app.core.exceptions import ConflictError
            raise ConflictError(
                message=f"Ad account '{account_id}' on {platform} is already connected."
            )

        account = AdAccount(
            workspace_id=workspace_id,
            platform=platform,
            account_id=account_id,
            account_name=account_name,
            credentials=credentials,
            currency=currency,
            timezone=timezone_str,
            is_active=True,
        )
        self.account_repo.db.add(account)
        await self.account_repo.db.flush()
        await self.account_repo.db.refresh(account)

        log.info(
            "ad_account_connected",
            account_id=str(account.id),
            platform=platform,
            external_id=account_id,
        )
        return account

    async def sync_ads_data(
        self,
        ad_account_id: UUID,
        workspace_id: UUID,
        date_from: date,
        date_to: date,
    ) -> Dict[str, Any]:
        """Sync campaigns and metrics from the ad platform."""
        account = await self.account_repo.get_by_id(ad_account_id)
        if account is None or account.workspace_id != workspace_id:
            raise NotFoundError(message=f"Ad account {ad_account_id} not found.")

        integration = self._get_integration(account.platform)
        credentials = account.credentials or {}

        summary = {
            "ad_account_id": str(ad_account_id),
            "platform": account.platform,
            "campaigns_synced": 0,
            "metrics_synced": 0,
            "errors": [],
        }

        # Fetch campaigns
        try:
            campaigns_data = await integration.get_campaigns(
                account_id=account.account_id,
                credentials=credentials,
            )
        except Exception as exc:
            log.error("ads_sync_campaigns_error", account_id=str(ad_account_id), error=str(exc))
            summary["errors"].append(f"Campaign fetch failed: {exc}")
            campaigns_data = []

        # Upsert campaigns
        synced_campaigns: List[Campaign] = []
        for cd in campaigns_data:
            try:
                campaign = await self.campaign_repo.upsert_campaign(
                    ad_account_id=ad_account_id,
                    workspace_id=workspace_id,
                    external_campaign_id=cd.external_id,
                    name=cd.name,
                    status=cd.status,
                    objective=cd.objective,
                    budget=Decimal(str(cd.budget)) if cd.budget else None,
                    daily_budget=Decimal(str(cd.daily_budget)) if cd.daily_budget else None,
                    platform=account.platform,
                )
                synced_campaigns.append(campaign)
                summary["campaigns_synced"] += 1
            except Exception as exc:
                log.warning(
                    "ads_sync_campaign_upsert_error",
                    campaign_id=cd.external_id,
                    error=str(exc),
                )

        # Fetch metrics for synced campaigns
        campaign_external_ids = [cd.external_id for cd in campaigns_data]
        if campaign_external_ids:
            try:
                metrics_data = await integration.get_campaign_metrics(
                    campaign_ids=campaign_external_ids,
                    date_from=date_from,
                    date_to=date_to,
                    credentials=credentials,
                )
            except Exception as exc:
                log.error("ads_sync_metrics_error", account_id=str(ad_account_id), error=str(exc))
                summary["errors"].append(f"Metrics fetch failed: {exc}")
                metrics_data = []

            # Map external_id -> campaign DB record
            ext_to_campaign: Dict[str, Campaign] = {}
            for camp in synced_campaigns:
                ext_to_campaign[camp.external_campaign_id] = camp

            for md in metrics_data:
                campaign = ext_to_campaign.get(md.campaign_id)
                if campaign is None:
                    continue
                try:
                    await self.metrics_repo.upsert_metrics(
                        campaign_id=campaign.id,
                        date_=md.date,
                        workspace_id=workspace_id,
                        impressions=md.impressions,
                        clicks=md.clicks,
                        spend=Decimal(str(round(md.spend, 2))),
                        conversions=md.conversions,
                        reach=md.reach,
                        frequency=md.frequency,
                        ctr=md.ctr,
                        cpc=md.cpc,
                        cpm=md.cpm,
                        cpa=md.cpa,
                        roas=md.roas,
                    )
                    summary["metrics_synced"] += 1
                except Exception as exc:
                    log.warning(
                        "ads_sync_metrics_upsert_error",
                        campaign_id=md.campaign_id,
                        date=str(md.date),
                        error=str(exc),
                    )

        # Update last_synced_at
        await self.account_repo.update_last_synced(ad_account_id)

        log.info(
            "ads_sync_complete",
            account_id=str(ad_account_id),
            campaigns=summary["campaigns_synced"],
            metrics=summary["metrics_synced"],
        )
        return summary

    async def get_dashboard_data(
        self,
        workspace_id: UUID,
        date_from: date,
        date_to: date,
    ) -> Dict[str, Any]:
        """Build aggregated ads dashboard data."""
        accounts = await self.account_repo.get_workspace_accounts(workspace_id)
        campaigns = await self.campaign_repo.get_workspace_campaigns(workspace_id)
        metrics_summary = await self.metrics_repo.get_workspace_metrics_summary(
            workspace_id=workspace_id,
            date_from=date_from,
            date_to=date_to,
        )
        metrics_by_date = await self.metrics_repo.get_metrics_by_date(
            workspace_id=workspace_id,
            date_from=date_from,
            date_to=date_to,
        )

        # Get top performing campaigns by ROAS
        campaign_perf: List[Dict[str, Any]] = []
        for campaign in campaigns:
            camp_metrics = await self.metrics_repo.get_campaign_metrics(
                campaign_id=campaign.id,
                date_from=date_from,
                date_to=date_to,
            )
            if camp_metrics:
                total_spend = sum(float(m.spend) for m in camp_metrics)
                total_conversions = sum(m.conversions for m in camp_metrics)
                avg_roas = sum(m.roas for m in camp_metrics) / len(camp_metrics)
                campaign_perf.append(
                    {
                        "campaign_id": str(campaign.id),
                        "name": campaign.name,
                        "platform": campaign.platform,
                        "status": campaign.status,
                        "total_spend": total_spend,
                        "total_conversions": total_conversions,
                        "avg_roas": round(avg_roas, 2),
                    }
                )

        # Sort by ROAS descending
        campaign_perf.sort(key=lambda x: x["avg_roas"], reverse=True)

        return {
            "accounts": [
                {
                    "id": str(a.id),
                    "platform": a.platform,
                    "account_name": a.account_name,
                    "is_active": a.is_active,
                    "last_synced_at": a.last_synced_at.isoformat() if a.last_synced_at else None,
                }
                for a in accounts
            ],
            "summary": metrics_summary,
            "metrics_by_date": metrics_by_date,
            "top_campaigns": campaign_perf[:10],
            "total_campaigns": len(campaigns),
        }

    async def get_campaign_metrics(
        self,
        campaign_id: UUID,
        workspace_id: UUID,
        date_from: date,
        date_to: date,
    ) -> List[CampaignMetrics]:
        """Return daily metrics for a specific campaign."""
        campaign = await self.campaign_repo.get_by_id(campaign_id)
        if campaign is None or campaign.workspace_id != workspace_id:
            raise NotFoundError(message=f"Campaign {campaign_id} not found.")
        return await self.metrics_repo.get_campaign_metrics(
            campaign_id=campaign_id,
            date_from=date_from,
            date_to=date_to,
        )

    async def get_workspace_accounts(self, workspace_id: UUID) -> List[AdAccount]:
        """Return all ad accounts for a workspace."""
        return await self.account_repo.get_workspace_accounts(workspace_id)

    async def get_workspace_campaigns(
        self,
        workspace_id: UUID,
        platform: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Campaign]:
        """Return campaigns for a workspace with optional filters."""
        return await self.campaign_repo.get_workspace_campaigns(
            workspace_id=workspace_id,
            platform=platform,
            status=status,
        )

    async def disconnect_account(
        self, account_id: UUID, workspace_id: UUID
    ) -> None:
        """Deactivate an ad account."""
        account = await self.account_repo.get_by_id(account_id)
        if account is None or account.workspace_id != workspace_id:
            raise NotFoundError(message=f"Ad account {account_id} not found.")
        account.is_active = False
        await self.account_repo.db.flush()
        log.info("ad_account_disconnected", account_id=str(account_id))
