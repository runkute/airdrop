from datetime import datetime
from typing import List, Optional
from uuid import UUID

from app.schemas.base import BaseSchema


class AIAlertResponse(BaseSchema):
    """Full alert representation."""

    id: UUID
    workspace_id: UUID
    campaign_id: Optional[UUID] = None
    ad_account_id: Optional[UUID] = None
    alert_type: str
    severity: str
    title: str
    message: str
    details: Optional[dict] = None
    is_read: bool
    is_dismissed: bool
    triggered_at: datetime
    created_at: datetime
    updated_at: datetime


class AlertsListResponse(BaseSchema):
    """Paginated alerts list with unread counter."""

    alerts: List[AIAlertResponse]
    unread_count: int


class MarkAlertReadRequest(BaseSchema):
    """Request body to mark one or more alerts as read."""

    alert_ids: List[UUID]
