from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user, get_workspace_member
from app.integrations.ai.gateway import ai_gateway
from app.models.brand_voice import BrandVoice
from app.models.content import ContentPost
from app.models.user import User
from app.repositories.ai_usage_repository import AIUsageRepository
from app.repositories.brand_voice_repository import BrandVoiceRepository
from app.repositories.content_repository import ContentRepository
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.content import (
    ContentGenerationRequest,
    ContentGenerationResponse,
    ContentPostResponse,
    ContentPostUpdate,
    ContentRewriteRequest,
    ContentSummarizeRequest,
    ScheduleContentRequest,
)
from app.services.content_service import ContentService
from app.models.ai_usage import AIUsageLog

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> ContentService:
    return ContentService(
        content_repo=ContentRepository(ContentPost, db),
        brand_voice_repo=BrandVoiceRepository(BrandVoice, db),
        ai_usage_repo=AIUsageRepository(AIUsageLog, db),
        gateway=ai_gateway,
    )


@router.post(
    "/generate",
    response_model=ContentGenerationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate content with AI",
)
async def generate_content(
    body: ContentGenerationRequest,
    current_user: User = Depends(get_current_active_user),
    service: ContentService = Depends(_get_service),
    db: AsyncSession = Depends(get_db),
) -> ContentGenerationResponse:
    """Generate new content using AI. The workspace_id must be provided in the request body
    or derived from the brand_voice if specified."""
    # For the generate endpoint without a workspace_id path param, we need it in the body.
    # We'll get the workspace from the brand voice or raise.
    from app.core.exceptions import ValidationError

    if not body.brand_voice_id:
        raise ValidationError(
            message=(
                "brand_voice_id is required for content generation, "
                "or use /workspaces/{workspace_id}/content/generate"
            )
        )

    # Get workspace_id from brand voice
    from sqlalchemy import select
    result = await db.execute(
        select(BrandVoice).where(BrandVoice.id == body.brand_voice_id)
    )
    voice = result.scalar_one_or_none()
    if voice is None:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(message=f"Brand voice {body.brand_voice_id} not found.")

    workspace_id = voice.workspace_id

    post, usage = await service.generate_content(
        workspace_id=workspace_id,
        user_id=current_user.id,
        request=body,
    )
    return ContentGenerationResponse(
        post=ContentPostResponse.model_validate(post),
        usage=usage,
    )


@router.post(
    "/rewrite",
    summary="Rewrite content with AI",
)
async def rewrite_content(
    body: ContentRewriteRequest,
    current_user: User = Depends(get_current_active_user),
    service: ContentService = Depends(_get_service),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Rewrite existing content following specific instructions."""
    # We need workspace_id for usage logging; accept it as optional header or use a default
    # For now, use a placeholder approach - workspace_id from first membership
    from app.repositories.workspace_repository import WorkspaceRepository
    from app.models.workspace import Workspace

    ws_repo = WorkspaceRepository(Workspace, db)
    workspaces = await ws_repo.get_user_workspaces(current_user.id)
    if not workspaces:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(message="User has no workspace. Create a workspace first.")

    workspace_id = workspaces[0].id
    return await service.rewrite_content(
        workspace_id=workspace_id,
        user_id=current_user.id,
        content=body.content,
        instructions=body.instructions,
        provider=body.ai_provider,
        ai_model=body.ai_model,
    )


@router.post(
    "/summarize",
    summary="Summarize content with AI",
)
async def summarize_content(
    body: ContentSummarizeRequest,
    current_user: User = Depends(get_current_active_user),
    service: ContentService = Depends(_get_service),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Summarize content to a target length."""
    from app.repositories.workspace_repository import WorkspaceRepository
    from app.models.workspace import Workspace

    ws_repo = WorkspaceRepository(Workspace, db)
    workspaces = await ws_repo.get_user_workspaces(current_user.id)
    if not workspaces:
        from app.core.exceptions import NotFoundError
        raise NotFoundError(message="User has no workspace. Create a workspace first.")

    workspace_id = workspaces[0].id
    return await service.summarize_content(
        workspace_id=workspace_id,
        user_id=current_user.id,
        content=body.content,
        max_length=body.max_length,
        provider=body.ai_provider,
    )


@router.get(
    "/workspaces/{workspace_id}/posts",
    response_model=PaginatedResponse[ContentPostResponse],
    summary="List workspace posts",
)
async def list_posts(
    workspace_id: UUID,
    status: Optional[str] = Query(default=None),
    content_type: Optional[str] = Query(default=None),
    platform: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    membership=Depends(get_workspace_member),
    service: ContentService = Depends(_get_service),
) -> PaginatedResponse[ContentPostResponse]:
    """Return a paginated list of content posts for a workspace."""
    skip = (page - 1) * per_page
    posts, total = await service.list_posts(
        workspace_id=workspace_id,
        status=status,
        content_type=content_type,
        platform=platform,
        skip=skip,
        limit=per_page,
    )
    items = [ContentPostResponse.model_validate(p) for p in posts]
    return PaginatedResponse.create(items=items, total=total, page=page, per_page=per_page)


@router.get(
    "/workspaces/{workspace_id}/posts/{post_id}",
    response_model=ContentPostResponse,
    summary="Get a content post",
)
async def get_post(
    workspace_id: UUID,
    post_id: UUID,
    membership=Depends(get_workspace_member),
    service: ContentService = Depends(_get_service),
) -> ContentPostResponse:
    """Return a single content post by ID."""
    post = await service.get_post(post_id=post_id, workspace_id=workspace_id)
    return ContentPostResponse.model_validate(post)


@router.patch(
    "/workspaces/{workspace_id}/posts/{post_id}",
    response_model=ContentPostResponse,
    summary="Update a content post",
)
async def update_post(
    workspace_id: UUID,
    post_id: UUID,
    body: ContentPostUpdate,
    membership=Depends(get_workspace_member),
    service: ContentService = Depends(_get_service),
) -> ContentPostResponse:
    """Update a content post's fields."""
    update_data = body.model_dump(exclude_unset=True, exclude_none=True)
    post = await service.update_post(
        post_id=post_id,
        workspace_id=workspace_id,
        data=update_data,
    )
    return ContentPostResponse.model_validate(post)


@router.delete(
    "/workspaces/{workspace_id}/posts/{post_id}",
    response_model=MessageResponse,
    summary="Delete a content post",
)
async def delete_post(
    workspace_id: UUID,
    post_id: UUID,
    membership=Depends(get_workspace_member),
    service: ContentService = Depends(_get_service),
) -> MessageResponse:
    """Delete a content post."""
    await service.delete_post(post_id=post_id, workspace_id=workspace_id)
    return MessageResponse(message="Post deleted successfully.")


@router.post(
    "/workspaces/{workspace_id}/posts/{post_id}/schedule",
    response_model=ContentPostResponse,
    summary="Schedule a content post",
)
async def schedule_post(
    workspace_id: UUID,
    post_id: UUID,
    body: ScheduleContentRequest,
    membership=Depends(get_workspace_member),
    service: ContentService = Depends(_get_service),
) -> ContentPostResponse:
    """Schedule a content post for future publishing."""
    post = await service.schedule_post(
        post_id=post_id,
        workspace_id=workspace_id,
        scheduled_at=body.scheduled_at,
    )
    return ContentPostResponse.model_validate(post)
