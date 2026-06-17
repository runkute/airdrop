from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import List, Optional


@dataclass
class CampaignData:
    """Normalised campaign data from any ad platform."""

    external_id: str
    name: str
    status: str
    objective: Optional[str]
    budget: Optional[float]
    daily_budget: Optional[float]
    platform: str


@dataclass
class MetricsData:
    """Normalised daily campaign metrics from any ad platform."""

    campaign_id: str
    date: date
    impressions: int
    clicks: int
    spend: float
    conversions: int
    reach: int
    frequency: float
    ctr: float
    cpc: float
    cpm: float
    cpa: float
    roas: float


class BaseAdsIntegration(ABC):
    """Abstract base class for ad platform integrations."""

    platform_name: str = ""

    @abstractmethod
    async def get_campaigns(
        self, account_id: str, credentials: dict
    ) -> List[CampaignData]:
        """Fetch all campaigns for the given account."""
        ...

    @abstractmethod
    async def get_campaign_metrics(
        self,
        campaign_ids: List[str],
        date_from: date,
        date_to: date,
        credentials: dict,
    ) -> List[MetricsData]:
        """Fetch daily metrics for the specified campaigns over a date range."""
        ...

    @abstractmethod
    async def verify_credentials(self, credentials: dict) -> bool:
        """Return True if the credentials are valid and the account is accessible."""
        ...

    @staticmethod
    def _safe_float(value, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _safe_int(value, default: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default
