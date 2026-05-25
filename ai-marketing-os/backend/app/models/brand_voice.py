import uuid
from typing import Any, Optional

from sqlalchemy import Boolean, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class BrandVoice(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "brand_voices"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # Tone: professional / casual / playful / authoritative / empathetic / bold
    tone: Mapped[str] = mapped_column(String(50), nullable=False, default="professional")

    # Writing style: concise / detailed / storytelling / data-driven / conversational
    writing_style: Mapped[str] = mapped_column(String(50), nullable=False, default="conversational")

    cta_style: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    forbidden_words: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    emotional_positioning: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    keyword_preferences: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    example_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    workspace: Mapped["app.models.workspace.Workspace"] = relationship(  # type: ignore[name-defined]
        "Workspace",
        foreign_keys=[workspace_id],
    )

    __table_args__ = (
        Index("ix_brand_voices_workspace_id_is_active", "workspace_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<BrandVoice id={self.id} name={self.name!r} workspace_id={self.workspace_id}>"
