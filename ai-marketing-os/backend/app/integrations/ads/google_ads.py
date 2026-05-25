"""Google Ads API integration.

Note: Full production use of the Google Ads API requires OAuth2 credentials
(client_id, client_secret, refresh_token) plus a developer token.
This implementation uses the Google Ads REST API (REST Endpoint v17+).
For environments where credentials are unavailable, the methods return
empty lists gracefully after logging a warning.
"""

from datetime import date
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.integrations.ads.base import BaseAdsIntegration, CampaignData, MetricsData

log = get_logger(__name__)

GOOGLE_ADS_API_VERSION = "v17"
GOOGLE_ADS_BASE = f"https://googleads.googleapis.com/{GOOGLE_ADS_API_VERSION}"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class GoogleAdsIntegration(BaseAdsIntegration):
    """Google Ads API integration using the REST-based API v17."""

    platform_name = "google"

    async def _get_access_token(self, credentials: dict) -> Optional[str]:
        """Exchange OAuth2 refresh token for a short-lived access token."""
        refresh_token = credentials.get("refresh_token")
        client_id = credentials.get("client_id") or settings.GOOGLE_ADS_CLIENT_ID
        client_secret = credentials.get("client_secret") or settings.GOOGLE_ADS_CLIENT_SECRET

        if not all([refresh_token, client_id, client_secret]):
            log.warning("google_ads_oauth_credentials_missing")
            return None

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                },
            )
            response.raise_for_status()
            return response.json().get("access_token")

    def _build_headers(self, access_token: str, credentials: dict) -> Dict[str, str]:
        developer_token = (
            credentials.get("developer_token") or settings.GOOGLE_ADS_DEVELOPER_TOKEN or ""
        )
        return {
            "Authorization": f"Bearer {access_token}",
            "developer-token": developer_token,
            "Content-Type": "application/json",
        }

    async def get_campaigns(
        self, account_id: str, credentials: dict
    ) -> List[CampaignData]:
        """Fetch all campaigns via GAQL query."""
        access_token = await self._get_access_token(credentials)
        if not access_token:
            log.warning("google_ads_get_campaigns_skipped_no_token", account_id=account_id)
            return []

        gaql = """
            SELECT
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.advertising_channel_type,
              campaign.campaign_budget,
              campaign.start_date,
              campaign.end_date
            FROM campaign
            WHERE campaign.status != 'REMOVED'
            ORDER BY campaign.name
        """

        url = f"{GOOGLE_ADS_BASE}/customers/{account_id}/googleAds:search"
        headers = self._build_headers(access_token, credentials)

        campaigns: List[CampaignData] = []
        page_token: Optional[str] = None

        async with httpx.AsyncClient(timeout=30.0) as client:
            while True:
                payload: Dict[str, Any] = {"query": gaql}
                if page_token:
                    payload["pageToken"] = page_token

                try:
                    response = await client.post(url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                except httpx.HTTPStatusError as exc:
                    log.error(
                        "google_ads_get_campaigns_error",
                        account_id=account_id,
                        status=exc.response.status_code,
                        body=exc.response.text[:500],
                    )
                    break
                except Exception as exc:
                    log.error("google_ads_get_campaigns_error", error=str(exc))
                    break

                for row in data.get("results", []):
                    c = row.get("campaign", {})
                    campaigns.append(
                        CampaignData(
                            external_id=str(c.get("id", "")),
                            name=c.get("name", ""),
                            status=c.get("status", "UNKNOWN").lower(),
                            objective=c.get("advertisingChannelType"),
                            budget=None,
                            daily_budget=None,
                            platform="google",
                        )
                    )

                page_token = data.get("nextPageToken")
                if not page_token:
                    break

        log.info("google_ads_campaigns_fetched", account_id=account_id, count=len(campaigns))
        return campaigns

    async def get_campaign_metrics(
        self,
        campaign_ids: List[str],
        date_from: date,
        date_to: date,
        credentials: dict,
    ) -> List[MetricsData]:
        """Fetch daily campaign performance metrics via GAQL."""
        access_token = await self._get_access_token(credentials)
        if not access_token:
            log.warning("google_ads_get_metrics_skipped_no_token")
            return []

        if not campaign_ids:
            return []

        # Build ID filter clause
        id_list = ", ".join(f"'{cid}'" for cid in campaign_ids)
        gaql = f"""
            SELECT
              campaign.id,
              segments.date,
              metrics.impressions,
              metrics.clicks,
              metrics.cost_micros,
              metrics.conversions,
              metrics.all_conversions_value,
              metrics.search_impression_share,
              metrics.ctr,
              metrics.average_cpc,
              metrics.average_cpm
            FROM campaign
            WHERE
              segments.date BETWEEN '{date_from.strftime("%Y-%m-%d")}' AND '{date_to.strftime("%Y-%m-%d")}'
              AND campaign.id IN ({id_list})
            ORDER BY segments.date
        """

        # Google Ads requires a single customer_id; infer from credentials
        customer_id = credentials.get("customer_id", "")
        if not customer_id:
            log.warning("google_ads_customer_id_missing")
            return []

        url = f"{GOOGLE_ADS_BASE}/customers/{customer_id}/googleAds:search"
        headers = self._build_headers(access_token, credentials)

        metrics_list: List[MetricsData] = []
        page_token: Optional[str] = None

        async with httpx.AsyncClient(timeout=60.0) as client:
            while True:
                payload: Dict[str, Any] = {"query": gaql}
                if page_token:
                    payload["pageToken"] = page_token

                try:
                    response = await client.post(url, json=payload, headers=headers)
                    response.raise_for_status()
                    data = response.json()
                except httpx.HTTPStatusError as exc:
                    log.error(
                        "google_ads_get_metrics_error",
                        status=exc.response.status_code,
                        body=exc.response.text[:500],
                    )
                    break
                except Exception as exc:
                    log.error("google_ads_get_metrics_error", error=str(exc))
                    break

                for row in data.get("results", []):
                    campaign = row.get("campaign", {})
                    metrics = row.get("metrics", {})
                    segment = row.get("segments", {})

                    campaign_id = str(campaign.get("id", ""))
                    metrics_date = date.fromisoformat(
                        segment.get("date", date_from.isoformat())
                    )

                    impressions = self._safe_int(metrics.get("impressions", 0))
                    clicks = self._safe_int(metrics.get("clicks", 0))
                    # cost_micros is in millionths of currency unit
                    cost_micros = self._safe_float(metrics.get("costMicros", 0))
                    spend = cost_micros / 1_000_000

                    conversions = self._safe_float(metrics.get("conversions", 0))
                    conversion_value = self._safe_float(
                        metrics.get("allConversionsValue", 0)
                    )

                    ctr = self._safe_float(metrics.get("ctr", 0))
                    # average_cpc is in micros
                    avg_cpc_micros = self._safe_float(metrics.get("averageCpc", 0))
                    cpc = avg_cpc_micros / 1_000_000

                    avg_cpm_micros = self._safe_float(metrics.get("averageCpm", 0))
                    cpm = avg_cpm_micros / 1_000_000

                    cpa = spend / conversions if conversions > 0 else 0.0
                    roas = conversion_value / spend if spend > 0 else 0.0

                    metrics_list.append(
                        MetricsData(
                            campaign_id=campaign_id,
                            date=metrics_date,
                            impressions=impressions,
                            clicks=clicks,
                            spend=spend,
                            conversions=int(conversions),
                            reach=0,  # Google Ads API doesn't surface reach per campaign easily
                            frequency=0.0,
                            ctr=ctr,
                            cpc=cpc,
                            cpm=cpm,
                            cpa=cpa,
                            roas=roas,
                        )
                    )

                page_token = data.get("nextPageToken")
                if not page_token:
                    break

        log.info(
            "google_ads_metrics_fetched",
            campaigns=len(campaign_ids),
            records=len(metrics_list),
        )
        return metrics_list

    async def verify_credentials(self, credentials: dict) -> bool:
        try:
            access_token = await self._get_access_token(credentials)
            if not access_token:
                return False
            customer_id = credentials.get("customer_id", "")
            if not customer_id:
                return False
            url = f"{GOOGLE_ADS_BASE}/customers/{customer_id}"
            headers = self._build_headers(access_token, credentials)
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=headers)
                return response.status_code == 200
        except Exception as exc:
            log.warning("google_ads_credentials_invalid", error=str(exc))
            return False
