from typing import List, Optional
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.brand_voice import BrandVoice
from app.repositories.brand_voice_repository import BrandVoiceRepository
from app.schemas.brand_voice import BrandVoiceCreate, BrandVoiceUpdate

log = get_logger(__name__)


class BrandVoiceService:
    """Business logic for Brand Voice management."""

    def __init__(self, brand_voice_repo: BrandVoiceRepository) -> None:
        self.repo = brand_voice_repo

    async def create_voice(
        self, workspace_id: UUID, data: BrandVoiceCreate
    ) -> BrandVoice:
        """Create a new brand voice for a workspace."""
        voice_data = data.model_dump(exclude_unset=False)
        if voice_data.get("is_default"):
            # Clear existing default before creating new default
            await self.repo.set_default.__wrapped__(
                self.repo, None, workspace_id
            ) if False else None
            # Use repository method to clear defaults
            from sqlalchemy import update
            await self.repo.db.execute(
                update(BrandVoice)
                .where(
                    BrandVoice.workspace_id == workspace_id,
                    BrandVoice.is_default == True,
                )
                .values(is_default=False)
            )
            await self.repo.db.flush()

        voice = await self.repo.create_voice(workspace_id=workspace_id, **voice_data)
        log.info(
            "brand_voice_created",
            voice_id=str(voice.id),
            workspace_id=str(workspace_id),
        )
        return voice

    async def update_voice(
        self,
        voice_id: UUID,
        workspace_id: UUID,
        data: BrandVoiceUpdate,
    ) -> BrandVoice:
        """Update a brand voice."""
        voice = await self._get_or_404(voice_id, workspace_id)
        update_data = data.model_dump(exclude_unset=True, exclude_none=True)

        # If setting as default, clear others first
        if update_data.get("is_default") is True:
            from sqlalchemy import update as sql_update
            await self.repo.db.execute(
                sql_update(BrandVoice)
                .where(
                    BrandVoice.workspace_id == workspace_id,
                    BrandVoice.is_default == True,
                    BrandVoice.id != voice_id,
                )
                .values(is_default=False)
            )
            await self.repo.db.flush()

        for key, value in update_data.items():
            setattr(voice, key, value)
        await self.repo.db.flush()
        await self.repo.db.refresh(voice)

        log.info("brand_voice_updated", voice_id=str(voice_id))
        return voice

    async def delete_voice(self, voice_id: UUID, workspace_id: UUID) -> None:
        """Soft-delete (deactivate) a brand voice."""
        voice = await self._get_or_404(voice_id, workspace_id)
        voice.is_active = False
        await self.repo.db.flush()
        log.info("brand_voice_deleted", voice_id=str(voice_id))

    async def get_voice(self, voice_id: UUID, workspace_id: UUID) -> BrandVoice:
        """Get a single brand voice by ID."""
        return await self._get_or_404(voice_id, workspace_id)

    async def list_voices(self, workspace_id: UUID) -> List[BrandVoice]:
        """List all brand voices for a workspace."""
        return await self.repo.get_workspace_voices(workspace_id)

    async def set_default(self, voice_id: UUID, workspace_id: UUID) -> BrandVoice:
        """Set a brand voice as the workspace default."""
        voice = await self._get_or_404(voice_id, workspace_id)
        return await self.repo.set_default(voice_id, workspace_id)

    def build_voice_system_prompt(self, voice: BrandVoice) -> str:
        """Build a system prompt section describing brand voice constraints."""
        parts = [
            "## Brand Voice Guidelines",
            f"**Tone**: {voice.tone}",
            f"**Writing Style**: {voice.writing_style}",
        ]

        if voice.emotional_positioning:
            parts.append(f"**Emotional Positioning**: {voice.emotional_positioning}")

        if voice.cta_style:
            parts.append(f"**CTA Style**: {voice.cta_style}")

        if voice.forbidden_words:
            forbidden = ", ".join(voice.forbidden_words)
            parts.append(f"**Forbidden Words/Phrases** (NEVER use these): {forbidden}")

        if voice.keyword_preferences:
            keywords = ", ".join(voice.keyword_preferences)
            parts.append(f"**Preferred Keywords** (include naturally): {keywords}")

        if voice.example_content:
            parts.append(
                f"**Example Content** (match this style closely):\n{voice.example_content}"
            )

        parts.append(
            "\nAlways follow these guidelines strictly. "
            "Do not use any forbidden words or deviate from the specified tone and style."
        )

        return "\n\n".join(parts)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _get_or_404(self, voice_id: UUID, workspace_id: UUID) -> BrandVoice:
        result = await self.repo.db.execute(
            __import__("sqlalchemy").select(BrandVoice).where(
                BrandVoice.id == voice_id,
                BrandVoice.workspace_id == workspace_id,
            )
        )
        voice = result.scalar_one_or_none()
        if voice is None:
            raise NotFoundError(message=f"Brand voice {voice_id} not found.")
        return voice
