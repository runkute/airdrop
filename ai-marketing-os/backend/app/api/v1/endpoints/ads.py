from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_workspace_member, require_role
from app.models.ads import AdAccount, Campaign, CampaignMetrics
from app.repositories.ads_repository import (
    AdAccountRepository,
    CampaignMetricsRepository,
    CampaignRepository,
)
from app.schemas.ads import (
    AdAccountCreate,
    AdAccountResponse,
    CampaignMetricsResponse,
    CampaignResponse,
)
from app.schemas.base import MessageResponse
from app.services.ads_service import AdsService

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> AdsService:
    return AdsService(
        account_repo=AdAccountRepository(AdAccount, db),
        campaign_repo=CampaignRepository(Campaign, db),
        metrics_repo=CampaignMetricsRepository(CampaignMetrics, db),
    )


@router.get(
    "/accounts",
    response_model=List[AdAccountResponse],
    summary="List ad accounts",
)
async def list_accounts(
    workspace_id: UUID,
    membership=Depends(get_workspace_member),
    service: AdsService = Depends(_get_service),
) -> List[AdAccountResponse]:
    """Return all ad accounts connected to a workspace."""
    accounts = await service.get_workspace_accounts(workspace_id)
    return [AdAccountResponse.model_validate(a) for a in accounts]


@router.post(
    "/accounts",
    response_model=AdAccountResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Connect an ad account",
)
async def connect_account(
    workspace_id: UUID,
    body: AdAccountCreate,
    membership=Depends(require_role("admin")),
    service: AdsService = Depends(_get_service),
) -> AdAccountResponse:
    """Connect a new ad account to the workspace. Requires admin role."""
    account = await service.connect_ad_account(
        workspace_id=workspace_id,
        platform=body.platform,
        account_id=body.account_id,
        account_name=body.account_name,
        credentials=body.credentials or {},
        currency=body.currency,
        timezone_str=body.timezone,
    )
    return AdAccountResponse.model_validate(account)


@router.delete(
    "/accounts/{account_id}",
    response_model=MessageResponse,
    summary="Disconnect an ad account",
)
async def disconnect_account(
    workspace_id: UUID,
    account_id: UUID,
    membership=Depends(require_role("admin")),
    service: AdsService = Depends(_get_service),
) -> MessageResponse:
    """Disconnect (deactivate) an ad account. Requires admin role."""
    await service.disconnect_account(account_id=account_id, workspace_id=workspace_id)
    return MessageResponse(message="Ad account disconnected successfully.")


@router.post(
    "/accounts/{account_id}/sync",
    summary="Trigger ad account sync",
)
async def sync_account(
    workspace_id: UUID,
    account_id: UUID,
    date_from: date = Query(
        default_factory=lambda: (datetime.now(timezone.utc) - timedelta(days=30)).date()
    ),
    date_to: date = Query(default_factory=lambda: datetime.now(timezone.utc).date()),
    membership=Depends(require_role("admin", "editor")),
    service: AdsService = Depends(_get_service),
) -> Dict[str, Any]:
    """Trigger a sync for an ad account. Fetches campaigns and metrics from the platform."""
    return await service.sync_ads_data(
        ad_account_id=account_id,
        workspace_id=workspace_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/campaigns",
    response_model=List[CampaignResponse],
    summary="List campaigns",
)
async def list_campaigns(
    workspace_id: UUID,
    platform: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    membership=Depends(get_workspace_member),
    service: AdsService = Depends(_get_service),
) -> List[CampaignResponse]:
    """Return campaigns for a workspace with optional filters."""
    campaigns = await service.get_workspace_campaigns(
        workspace_id=workspace_id,
        platform=platform,
        status=status_filter,
    )
    return [CampaignResponse.model_validate(c) for c in campaigns]


@router.get(
    "/campaigns/{campaign_id}/metrics",
    response_model=List[CampaignMetricsResponse],
    summary="Get campaign metrics",
)
async def get_campaign_metrics(
    workspace_id: UUID,
    campaign_id: UUID,
    date_from: date = Query(
        default_factory=lambda: (datetime.now(timezone.utc) - timedelta(days=30)).date()
    ),
    date_to: date = Query(default_factory=lambda: datetime.now(timezone.utc).date()),
    membership=Depends(get_workspace_member),
    service: AdsService = Depends(_get_service),
) -> List[CampaignMetricsResponse]:
    """Return daily metrics for a specific campaign."""
    metrics = await service.get_campaign_metrics(
        campaign_id=campaign_id,
        workspace_id=workspace_id,
        date_from=date_from,
        date_to=date_to,
    )
    return [CampaignMetricsResponse.model_validate(m) for m in metrics]


@router.get(
    "/dashboard",
    summary="Get ads dashboard data",
)
async def get_dashboard(
    workspace_id: UUID,
    date_from: date = Query(
        default_factory=lambda: (datetime.now(timezone.utc) - timedelta(days=30)).date()
    ),
    date_to: date = Query(default_factory=lambda: datetime.now(timezone.utc).date()),
    membership=Depends(get_workspace_member),
    service: AdsService = Depends(_get_service),
) -> Dict[str, Any]:
    """Return aggregated dashboard data for all ad accounts in a workspace."""
    return await service.get_dashboard_data(
        workspace_id=workspace_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/performance",
    summary="Get workspace performance metrics",
)
async def get_performance(
    workspace_id: UUID,
    date_from: date = Query(
        default_factory=lambda: (datetime.now(timezone.utc) - timedelta(days=30)).date()
    ),
    date_to: date = Query(default_factory=lambda: datetime.now(timezone.utc).date()),
    membership=Depends(get_workspace_member),
    service: AdsService = Depends(_get_service),
) -> Dict[str, Any]:
    """Return aggregated performance metrics for a date range."""
    from app.models.ads import CampaignMetrics as CM
    summary = await service.metrics_repo.get_workspace_metrics_summary(
        workspace_id=workspace_id,
        date_from=date_from,
        date_to=date_to,
    )
    by_date = await service.metrics_repo.get_metrics_by_date(
        workspace_id=workspace_id,
        date_from=date_from,
        date_to=date_to,
    )
    return {
        "summary": summary,
        "by_date": by_date,
        "date_from": str(date_from),
        "date_to": str(date_to),
    }
