from datetime import date
from typing import Any, Dict, List, Optional

import httpx

from app.core.logging import get_logger
from app.integrations.ads.base import BaseAdsIntegration, CampaignData, MetricsData

log = get_logger(__name__)

TIKTOK_API_BASE = "https://business-api.tiktok.com/open_api/v1.3"


class TikTokAdsIntegration(BaseAdsIntegration):
    """TikTok Ads API integration using Business API v1.3."""

    platform_name = "tiktok"

    def _build_headers(self, access_token: str) -> Dict[str, str]:
        return {
            "Access-Token": access_token,
            "Content-Type": "application/json",
        }

    async def get_campaigns(
        self, account_id: str, credentials: dict
    ) -> List[CampaignData]:
        access_token = credentials.get("access_token") or credentials.get("ACCESS_TOKEN", "")
        if not access_token:
            raise ValueError("access_token is required in credentials for TikTok Ads.")

        campaigns: List[CampaignData] = []
        url = f"{TIKTOK_API_BASE}/campaign/get/"
        page = 1
        page_size = 100

        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                params: Dict[str, Any] = {
                    "advertiser_id": account_id,
                    "page": page,
                    "page_size": page_size,
                    "fields": '["campaign_id","campaign_name","status","objective_type","budget","budget_mode"]',
                }
                try:
                    response = await client.get(
                        url,
                        params=params,
                        headers=self._build_headers(access_token),
                    )
                    response.raise_for_status()
                    data = response.json()
                except Exception as exc:
                    log.error("tiktok_ads_get_campaigns_error", error=str(exc))
                    break

                if data.get("code") != 0:
                    log.error(
                        "tiktok_ads_api_error",
                        code=data.get("code"),
                        message=data.get("message"),
                    )
                    break

                list_data = data.get("data", {}).get("list", [])
                page_info = data.get("data", {}).get("page_info", {})

                for campaign in list_data:
                    budget = self._safe_float(campaign.get("budget", 0))
                    budget_mode = campaign.get("budget_mode", "")
                    daily_budget = budget if budget_mode == "BUDGET_MODE_DAY" else None
                    lifetime_budget = budget if budget_mode == "BUDGET_MODE_TOTAL" else None

                    campaigns.append(
                        CampaignData(
                            external_id=str(campaign.get("campaign_id", "")),
                            name=campaign.get("campaign_name", ""),
                            status=campaign.get("status", "DISABLE").lower(),
                            objective=campaign.get("objective_type"),
                            budget=lifetime_budget,
                            daily_budget=daily_budget,
                            platform="tiktok",
                        )
                    )

                total_count = page_info.get("total_number", 0)
                if len(campaigns) >= total_count or not list_data:
                    break
                page += 1

        log.info("tiktok_campaigns_fetched", account_id=account_id, count=len(campaigns))
        return campaigns

    async def get_campaign_metrics(
        self,
        campaign_ids: List[str],
        date_from: date,
        date_to: date,
        credentials: dict,
    ) -> List[MetricsData]:
        access_token = credentials.get("access_token") or credentials.get("ACCESS_TOKEN", "")
        account_id = credentials.get("advertiser_id") or credentials.get("account_id", "")
        if not access_token or not account_id:
            raise ValueError(
                "access_token and advertiser_id are required in credentials for TikTok Ads."
            )

        if not campaign_ids:
            return []

        url = f"{TIKTOK_API_BASE}/report/integrated/get/"
        metrics_fields = [
            "campaign_id",
            "stat_time_day",
            "impressions",
            "clicks",
            "spend",
            "conversions",
            "reach",
            "frequency",
            "ctr",
            "cpc",
            "cpm",
            "cost_per_conversion",
            "real_time_conversion",
            "total_purchase_value",
        ]

        page = 1
        page_size = 200
        metrics_list: List[MetricsData] = []

        async with httpx.AsyncClient(timeout=60.0) as client:
            while True:
                payload: Dict[str, Any] = {
                    "advertiser_id": account_id,
                    "report_type": "BASIC",
                    "dimensions": ["campaign_id", "stat_time_day"],
                    "metrics": metrics_fields,
                    "data_level": "AUCTION_CAMPAIGN",
                    "start_date": date_from.strftime("%Y-%m-%d"),
                    "end_date": date_to.strftime("%Y-%m-%d"),
                    "filtering": [
                        {"field_name": "campaign_id", "filter_type": "IN", "filter_value": campaign_ids}
                    ],
                    "page": page,
                    "page_size": page_size,
                }

                try:
                    response = await client.post(
                        url,
                        json=payload,
                        headers=self._build_headers(access_token),
                    )
                    response.raise_for_status()
                    data = response.json()
                except Exception as exc:
                    log.error("tiktok_ads_get_metrics_error", error=str(exc))
                    break

                if data.get("code") != 0:
                    log.error(
                        "tiktok_ads_metrics_api_error",
                        code=data.get("code"),
                        message=data.get("message"),
                    )
                    break

                list_data = data.get("data", {}).get("list", [])
                page_info = data.get("data", {}).get("page_info", {})

                for row in list_data:
                    dims = row.get("dimensions", {})
                    m = row.get("metrics", {})

                    campaign_id = str(dims.get("campaign_id", ""))
                    try:
                        metrics_date = date.fromisoformat(
                            dims.get("stat_time_day", date_from.isoformat())[:10]
                        )
                    except ValueError:
                        metrics_date = date_from

                    impressions = self._safe_int(m.get("impressions", 0))
                    clicks = self._safe_int(m.get("clicks", 0))
                    spend = self._safe_float(m.get("spend", 0))
                    conversions = self._safe_int(
                        m.get("conversions") or m.get("real_time_conversion", 0)
                    )
                    reach = self._safe_int(m.get("reach", 0))
                    frequency = self._safe_float(m.get("frequency", 0))
                    ctr = self._safe_float(m.get("ctr", 0))
                    cpc = self._safe_float(m.get("cpc", 0))
                    cpm = self._safe_float(m.get("cpm", 0))
                    cpa = self._safe_float(m.get("cost_per_conversion", 0))

                    purchase_value = self._safe_float(m.get("total_purchase_value", 0))
                    roas = purchase_value / spend if spend > 0 else 0.0

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

                total_count = page_info.get("total_number", 0)
                if len(metrics_list) >= total_count or not list_data:
                    break
                page += 1

        log.info(
            "tiktok_metrics_fetched",
            campaigns=len(campaign_ids),
            records=len(metrics_list),
        )
        return metrics_list

    async def verify_credentials(self, credentials: dict) -> bool:
        access_token = credentials.get("access_token") or credentials.get("ACCESS_TOKEN", "")
        account_id = credentials.get("advertiser_id") or credentials.get("account_id", "")
        if not access_token or not account_id:
            return False
        url = f"{TIKTOK_API_BASE}/advertiser/info/"
        params = {"advertiser_ids": f'["{account_id}"]'}
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers=self._build_headers(access_token),
                )
                response.raise_for_status()
                data = response.json()
                return data.get("code") == 0
            except Exception as exc:
                log.warning("tiktok_ads_credentials_invalid", error=str(exc))
                return False
