from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_workspace_member
from app.models.content import ContentPost
from app.repositories.content_repository import ContentRepository
from app.schemas.base import MessageResponse
from app.services.publishing_service import PublishingService

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> PublishingService:
    return PublishingService(content_repo=ContentRepository(ContentPost, db))


@router.get("", summary="List publishing logs for workspace")
async def list_publishing_logs(
    workspace_id: UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    membership=Depends(get_workspace_member),
    service: PublishingService = Depends(_get_service),
) -> dict:
    """Return all publishing logs for a workspace."""
    skip = (page - 1) * per_page
    logs = await service.get_workspace_logs(
        workspace_id=workspace_id, skip=skip, limit=per_page
    )
    return {
        "logs": [
            {
                "id": str(log.id),
                "content_post_id": str(log.content_post_id),
                "platform": log.platform,
                "status": log.status,
                "error_message": log.error_message,
                "retry_count": log.retry_count,
                "attempted_at": log.attempted_at.isoformat(),
                "completed_at": log.completed_at.isoformat() if log.completed_at else None,
            }
            for log in logs
        ],
        "page": page,
        "per_page": per_page,
    }


@router.get("/calendar", summary="Get content calendar")
async def get_calendar(
    workspace_id: UUID,
    date_from: datetime = Query(...),
    date_to: datetime = Query(...),
    membership=Depends(get_workspace_member),
    service: PublishingService = Depends(_get_service),
) -> Dict[str, Any]:
    """Return calendar view of scheduled content."""
    return await service.get_calendar_view(
        workspace_id=workspace_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.post("/{post_id}/publish", summary="Publish a post immediately")
async def publish_now(
    workspace_id: UUID,
    post_id: UUID,
    credentials: dict,
    membership=Depends(get_workspace_member),
    service: PublishingService = Depends(_get_service),
) -> dict:
    """Immediately publish a content post to its target platform."""
    log = await service.publish_now(
        post_id=post_id,
        workspace_id=workspace_id,
        credentials=credentials,
    )
    return {
        "id": str(log.id),
        "content_post_id": str(log.content_post_id),
        "platform": log.platform,
        "status": log.status,
        "error_message": log.error_message,
        "attempted_at": log.attempted_at.isoformat(),
        "completed_at": log.completed_at.isoformat() if log.completed_at else None,
        "response_data": log.response_data,
    }


@router.post("/{post_id}/retry", summary="Retry a failed post")
async def retry_post(
    workspace_id: UUID,
    post_id: UUID,
    credentials: dict,
    membership=Depends(get_workspace_member),
    service: PublishingService = Depends(_get_service),
) -> dict:
    """Retry publishing a previously failed post."""
    log = await service.retry_failed_post(
        post_id=post_id,
        workspace_id=workspace_id,
        credentials=credentials,
    )
    return {
        "id": str(log.id),
        "content_post_id": str(log.content_post_id),
        "platform": log.platform,
        "status": log.status,
        "error_message": log.error_message,
        "retry_count": log.retry_count,
        "attempted_at": log.attempted_at.isoformat(),
    }


@router.get("/{post_id}/logs", summary="Get publishing logs for a post")
async def get_post_logs(
    workspace_id: UUID,
    post_id: UUID,
    membership=Depends(get_workspace_member),
    service: PublishingService = Depends(_get_service),
) -> dict:
    """Return publishing logs for a specific content post."""
    logs = await service.get_publishing_logs(
        post_id=post_id, workspace_id=workspace_id
    )
    return {
        "logs": [
            {
                "id": str(log.id),
                "platform": log.platform,
                "status": log.status,
                "error_message": log.error_message,
                "retry_count": log.retry_count,
                "attempted_at": log.attempted_at.isoformat(),
                "completed_at": log.completed_at.isoformat() if log.completed_at else None,
                "response_data": log.response_data,
            }
            for log in logs
        ]
    }
