from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user, get_workspace_member, require_role
from app.models.brand_voice import BrandVoice
from app.repositories.brand_voice_repository import BrandVoiceRepository
from app.schemas.base import MessageResponse
from app.schemas.brand_voice import BrandVoiceCreate, BrandVoiceResponse, BrandVoiceUpdate
from app.services.brand_voice_service import BrandVoiceService

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> BrandVoiceService:
    return BrandVoiceService(brand_voice_repo=BrandVoiceRepository(BrandVoice, db))


@router.get("", response_model=List[BrandVoiceResponse], summary="List brand voices")
async def list_brand_voices(
    workspace_id: UUID,
    membership=Depends(get_workspace_member),
    service: BrandVoiceService = Depends(_get_service),
) -> List[BrandVoiceResponse]:
    """Return all brand voices for a workspace."""
    voices = await service.list_voices(workspace_id)
    return [BrandVoiceResponse.model_validate(v) for v in voices]


@router.post(
    "",
    response_model=BrandVoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create brand voice (editor+)",
)
async def create_brand_voice(
    workspace_id: UUID,
    body: BrandVoiceCreate,
    membership=Depends(require_role("admin", "editor")),
    service: BrandVoiceService = Depends(_get_service),
) -> BrandVoiceResponse:
    """Create a new brand voice. Requires editor or admin role."""
    voice = await service.create_voice(workspace_id=workspace_id, data=body)
    return BrandVoiceResponse.model_validate(voice)


@router.get("/{voice_id}", response_model=BrandVoiceResponse, summary="Get brand voice")
async def get_brand_voice(
    workspace_id: UUID,
    voice_id: UUID,
    membership=Depends(get_workspace_member),
    service: BrandVoiceService = Depends(_get_service),
) -> BrandVoiceResponse:
    """Return a specific brand voice by ID."""
    voice = await service.get_voice(voice_id=voice_id, workspace_id=workspace_id)
    return BrandVoiceResponse.model_validate(voice)


@router.patch(
    "/{voice_id}",
    response_model=BrandVoiceResponse,
    summary="Update brand voice (editor+)",
)
async def update_brand_voice(
    workspace_id: UUID,
    voice_id: UUID,
    body: BrandVoiceUpdate,
    membership=Depends(require_role("admin", "editor")),
    service: BrandVoiceService = Depends(_get_service),
) -> BrandVoiceResponse:
    """Update a brand voice. Requires editor or admin role."""
    voice = await service.update_voice(
        voice_id=voice_id,
        workspace_id=workspace_id,
        data=body,
    )
    return BrandVoiceResponse.model_validate(voice)


@router.delete(
    "/{voice_id}",
    response_model=MessageResponse,
    summary="Delete brand voice (admin only)",
)
async def delete_brand_voice(
    workspace_id: UUID,
    voice_id: UUID,
    membership=Depends(require_role("admin")),
    service: BrandVoiceService = Depends(_get_service),
) -> MessageResponse:
    """Deactivate a brand voice. Requires admin role."""
    await service.delete_voice(voice_id=voice_id, workspace_id=workspace_id)
    return MessageResponse(message="Brand voice deleted successfully.")


@router.post(
    "/{voice_id}/set-default",
    response_model=BrandVoiceResponse,
    summary="Set brand voice as workspace default (admin only)",
)
async def set_default_voice(
    workspace_id: UUID,
    voice_id: UUID,
    membership=Depends(require_role("admin")),
    service: BrandVoiceService = Depends(_get_service),
) -> BrandVoiceResponse:
    """Set a brand voice as the workspace default. Requires admin role."""
    voice = await service.set_default(voice_id=voice_id, workspace_id=workspace_id)
    return BrandVoiceResponse.model_validate(voice)
