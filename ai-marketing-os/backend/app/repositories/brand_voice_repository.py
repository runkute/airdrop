from typing import Any, List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand_voice import BrandVoice
from app.repositories.base_repository import BaseRepository


class BrandVoiceRepository(BaseRepository[BrandVoice]):
    """Repository for BrandVoice model operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(BrandVoice, db)

    async def get_workspace_voices(self, workspace_id: UUID) -> List[BrandVoice]:
        """Return all brand voices for a workspace ordered newest first."""
        result = await self.db.execute(
            select(BrandVoice)
            .where(BrandVoice.workspace_id == workspace_id)
            .order_by(BrandVoice.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_default_voice(self, workspace_id: UUID) -> Optional[BrandVoice]:
        """Return the active default brand voice for a workspace."""
        result = await self.db.execute(
            select(BrandVoice).where(
                BrandVoice.workspace_id == workspace_id,
                BrandVoice.is_default.is_(True),
                BrandVoice.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def set_default(self, voice_id: UUID, workspace_id: UUID) -> BrandVoice:
        """Set a brand voice as the default, unsetting any previous default."""
        # Unset all existing defaults in the workspace
        await self.db.execute(
            update(BrandVoice)
            .where(
                BrandVoice.workspace_id == workspace_id,
                BrandVoice.is_default.is_(True),
            )
            .values(is_default=False)
        )
        await self.db.flush()

        # Set the target voice as default
        result = await self.db.execute(
            select(BrandVoice).where(
                BrandVoice.id == voice_id,
                BrandVoice.workspace_id == workspace_id,
            )
        )
        voice = result.scalar_one_or_none()
        if voice is None:
            raise ValueError(f"BrandVoice {voice_id} not found in workspace {workspace_id}.")
        voice.is_default = True
        await self.db.flush()
        await self.db.refresh(voice)
        return voice

    async def create_voice(self, workspace_id: UUID, **data: Any) -> BrandVoice:
        """Create a new brand voice for the given workspace."""
        voice = BrandVoice(workspace_id=workspace_id, **data)
        self.db.add(voice)
        await self.db.flush()
        await self.db.refresh(voice)
        return voice
