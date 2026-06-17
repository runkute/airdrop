from datetime import date
from typing import List, Optional

import httpx

from app.core.logging import get_logger
from app.integrations.ads.base import BaseAdsIntegration, CampaignData, MetricsData

log = get_logger(__name__)

META_API_VERSION = "v20.0"
META_API_BASE = f"https://graph.facebook.com/{META_API_VERSION}"


class MetaAdsIntegration(BaseAdsIntegration):
    """Meta (Facebook/Instagram) Ads API integration using Marketing API v20.0."""

    platform_name = "meta"

    async def get_campaigns(
        self, account_id: str, credentials: dict
    ) -> List[CampaignData]:
        access_token = credentials.get("access_token") or credentials.get("ACCESS_TOKEN", "")
        if not access_token:
            raise ValueError("access_token is required in credentials for Meta Ads.")

        campaigns: List[CampaignData] = []
        # Account ID format: act_XXXXXXXX
        formatted_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
        url = f"{META_API_BASE}/{formatted_id}/campaigns"
        params = {
            "access_token": access_token,
            "fields": "id,name,status,objective,budget_remaining,daily_budget,lifetime_budget",
            "limit": 100,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                for campaign in data.get("data", []):
                    budget = self._safe_float(
                        campaign.get("lifetime_budget") or campaign.get("budget_remaining")
                    )
                    daily_budget = self._safe_float(campaign.get("daily_budget"))
                    # Meta returns budgets in cents
                    campaigns.append(
                        CampaignData(
                            external_id=campaign["id"],
                            name=campaign.get("name", ""),
                            status=campaign.get("status", "PAUSED").lower(),
                            objective=campaign.get("objective"),
                            budget=budget / 100 if budget else None,
                            daily_budget=daily_budget / 100 if daily_budget else None,
                            platform="meta",
                        )
                    )

                paging = data.get("paging", {})
                next_cursor = paging.get("cursors", {}).get("after")
                if not next_cursor or not data.get("data"):
                    break
                params["after"] = next_cursor

        log.info("meta_campaigns_fetched", account_id=account_id, count=len(campaigns))
        return campaigns

    async def get_campaign_metrics(
        self,
        campaign_ids: List[str],
        date_from: date,
        date_to: date,
        credentials: dict,
    ) -> List[MetricsData]:
        access_token = credentials.get("access_token") or credentials.get("ACCESS_TOKEN", "")
        if not access_token:
            raise ValueError("access_token is required in credentials for Meta Ads.")

        metrics_list: List[MetricsData] = []
        insight_fields = ",".join([
            "campaign_id",
            "impressions",
            "clicks",
            "spend",
            "reach",
            "frequency",
            "ctr",
            "cpc",
            "cpm",
            "actions",
            "action_values",
            "cost_per_action_type",
            "date_start",
        ])

        async with httpx.AsyncClient(timeout=60.0) as client:
            for campaign_id in campaign_ids:
                url = f"{META_API_BASE}/{campaign_id}/insights"
                params = {
                    "access_token": access_token,
                    "fields": insight_fields,
                    "time_increment": 1,  # daily breakdown
                    "time_range": {
                        "since": date_from.strftime("%Y-%m-%d"),
                        "until": date_to.strftime("%Y-%m-%d"),
                    },
                    "limit": 366,
                }
                try:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    data = response.json()

                    for insight in data.get("data", []):
                        metrics_date = date.fromisoformat(
                            insight.get("date_start", date_from.isoformat())
                        )
                        impressions = self._safe_int(insight.get("impressions", 0))
                        clicks = self._safe_int(insight.get("clicks", 0))
                        spend = self._safe_float(insight.get("spend", 0))
                        reach = self._safe_int(insight.get("reach", 0))
                        frequency = self._safe_float(insight.get("frequency", 0))
                        ctr = self._safe_float(insight.get("ctr", 0))
                        cpc = self._safe_float(insight.get("cpc", 0))
                        cpm = self._safe_float(insight.get("cpm", 0))

                        # Extract purchase conversions and value
                        conversions = 0
                        conversion_value = 0.0
                        actions = insight.get("actions", [])
                        action_values = insight.get("action_values", [])

                        for action in actions:
                            if action.get("action_type") in (
                                "purchase",
                                "omni_purchase",
                                "offsite_conversion.fb_pixel_purchase",
                            ):
                                conversions += self._safe_int(action.get("value", 0))

                        for av in action_values:
                            if av.get("action_type") in (
                                "purchase",
                                "omni_purchase",
                                "offsite_conversion.fb_pixel_purchase",
                            ):
                                conversion_value += self._safe_float(av.get("value", 0))

                        cpa = spend / conversions if conversions > 0 else 0.0
                        roas = conversion_value / spend if spend > 0 else 0.0

                        metrics_list.append(
                            MetricsData(
                                campaign_id=campaign_id,
                                date=metrics_date,
                                impressions=impressions,
                                clicks=clicks,
                                spend=spend,
                                conversions=conversions,
                                reach=reach,
                                frequency=frequency,
                                ctr=ctr,
                                cpc=cpc,
                                cpm=cpm,
                                cpa=cpa,
                                roas=roas,
                            )
                        )
                except httpx.HTTPStatusError as exc:
                    log.warning(
                        "meta_insights_fetch_error",
                        campaign_id=campaign_id,
                        status_code=exc.response.status_code,
                        error=str(exc),
                    )
                except Exception as exc:
                    log.warning(
                        "meta_insights_error",
                        campaign_id=campaign_id,
                        error=str(exc),
                    )

        log.info(
            "meta_metrics_fetched",
            campaigns=len(campaign_ids),
            records=len(metrics_list),
        )
        return metrics_list

    async def verify_credentials(self, credentials: dict) -> bool:
        access_token = credentials.get("access_token") or credentials.get("ACCESS_TOKEN", "")
        if not access_token:
            return False
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(
                    f"{META_API_BASE}/me",
                    params={"access_token": access_token, "fields": "id,name"},
                )
                response.raise_for_status()
                data = response.json()
                return "id" in data
            except Exception as exc:
                log.warning("meta_ads_credentials_invalid", error=str(exc))
                return False
