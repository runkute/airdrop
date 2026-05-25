from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_workspace_member
from app.models.ads import AdAccount, Campaign, CampaignMetrics
from app.models.ai_usage import AIAlert, AIUsageLog
from app.repositories.ads_repository import CampaignMetricsRepository, CampaignRepository
from app.repositories.ai_usage_repository import AIAlertRepository
from app.schemas.alerts import AIAlertResponse, AlertsListResponse, MarkAlertReadRequest
from app.schemas.base import MessageResponse
from app.services.alert_service import AlertService

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> AlertService:
    return AlertService(
        alert_repo=AIAlertRepository(AIAlert, db),
        metrics_repo=CampaignMetricsRepository(CampaignMetrics, db),
        campaign_repo=CampaignRepository(Campaign, db),
    )


@router.get("", response_model=AlertsListResponse, summary="List workspace alerts")
async def list_alerts(
    workspace_id: UUID,
    is_read: Optional[bool] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    membership=Depends(get_workspace_member),
    service: AlertService = Depends(_get_service),
) -> AlertsListResponse:
    """Return workspace alerts with optional filters."""
    skip = (page - 1) * per_page
    alerts, total = await service.get_workspace_alerts(
        workspace_id=workspace_id,
        is_read=is_read,
        severity=severity,
        skip=skip,
        limit=per_page,
    )
    unread_count = await service.get_unread_count(workspace_id)
    alert_responses = [AIAlertResponse.model_validate(a) for a in alerts]
    return AlertsListResponse(alerts=alert_responses, unread_count=unread_count)


@router.post(
    "/mark-read",
    response_model=MessageResponse,
    summary="Mark alerts as read",
)
async def mark_alerts_read(
    workspace_id: UUID,
    body: MarkAlertReadRequest,
    membership=Depends(get_workspace_member),
    service: AlertService = Depends(_get_service),
) -> MessageResponse:
    """Mark one or more alerts as read."""
    count = await service.mark_alerts_read(
        alert_ids=body.alert_ids,
        workspace_id=workspace_id,
    )
    return MessageResponse(message=f"{count} alert(s) marked as read.")


@router.post(
    "/{alert_id}/dismiss",
    response_model=AIAlertResponse,
    summary="Dismiss an alert",
)
async def dismiss_alert(
    workspace_id: UUID,
    alert_id: UUID,
    membership=Depends(get_workspace_member),
    service: AlertService = Depends(_get_service),
) -> AIAlertResponse:
    """Dismiss an alert so it no longer appears in the workspace feed."""
    alert = await service.dismiss_alert(
        alert_id=alert_id, workspace_id=workspace_id
    )
    return AIAlertResponse.model_validate(alert)


@router.get(
    "/unread-count",
    summary="Get count of unread alerts",
)
async def get_unread_count(
    workspace_id: UUID,
    membership=Depends(get_workspace_member),
    service: AlertService = Depends(_get_service),
) -> dict:
    """Return the number of unread alerts for the workspace."""
    count = await service.get_unread_count(workspace_id)
    return {"unread_count": count, "workspace_id": str(workspace_id)}
