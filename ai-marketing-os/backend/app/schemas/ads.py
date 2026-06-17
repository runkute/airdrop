from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema

_ALLOWED_PLATFORMS = {"meta", "google", "tiktok"}


class AdAccountCreate(BaseSchema):
    """Request body for connecting an ad account."""

    platform: str = Field(description="Ad platform: meta / google / tiktok")
    account_id: str = Field(min_length=1, max_length=255, description="External platform account ID")
    account_name: str = Field(min_length=1, max_length=255)
    # Credentials are stored encrypted; the raw dict is accepted here and encrypted in the service
    credentials: Optional[Dict[str, Any]] = None
    currency: str = Field(default="USD", max_length=10)
    timezone: str = Field(default="UTC", max_length=100)

    @field_validator("platform")
    @classmethod
    def valid_platform(cls, v: str) -> str:
        if v not in _ALLOWED_PLATFORMS:
            raise ValueError(f"Platform must be one of: {', '.join(sorted(_ALLOWED_PLATFORMS))}")
        return v


class AdAccountResponse(BaseSchema):
    """Public ad account representation (credentials excluded)."""

    id: UUID
    workspace_id: UUID
    platform: str
    account_id: str
    account_name: str
    currency: str
    timezone: str
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class CampaignResponse(BaseSchema):
    """Campaign representation."""

    id: UUID
    ad_account_id: UUID
    workspace_id: UUID
    external_campaign_id: str
    name: str
    status: str
    objective: Optional[str] = None
    budget: Optional[Decimal] = None
    daily_budget: Optional[Decimal] = None
    platform: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime


class CampaignMetricsResponse(BaseSchema):
    """Daily campaign metrics."""

    id: UUID
    campaign_id: UUID
    date: date
    impressions: int
    clicks: int
    spend: Decimal
    conversions: int
    reach: int
    frequency: float
    ctr: float
    cpc: float
    cpm: float
    cpa: float
    roas: float
    video_views: Optional[int] = None
    link_clicks: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class AdsDashboardResponse(BaseSchema):
    """Aggregated ads dashboard data."""

    accounts: List[AdAccountResponse]
    campaigns: List[CampaignResponse]
    total_spend: Decimal
    total_impressions: int
    total_clicks: int
    avg_ctr: float
    avg_roas: float
    metrics_by_date: List[Dict[str, Any]]  # date-keyed aggregated metrics


class SyncAdsRequest(BaseSchema):
    """Request body to trigger an ad account sync."""

    ad_account_id: UUID
    date_from: date
    date_to: date

    @field_validator("date_to")
    @classmethod
    def date_range_valid(cls, v: date, info: Any) -> date:
        date_from = info.data.get("date_from")
        if date_from and v < date_from:
            raise ValueError("date_to must be on or after date_from")
        return v
