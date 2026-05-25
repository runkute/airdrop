import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class ContentPost(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "content_posts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    brand_voice_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brand_voices.id", ondelete="SET NULL"),
        nullable=True,
    )

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # content_type: social_post / seo_article / ad_copy / reel_script / hashtags / email
    content_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # platform: facebook / instagram / twitter / linkedin / wordpress / tiktok / google
    platform: Mapped[str] = mapped_column(String(50), nullable=False)

    # status: draft / review / scheduled / published / failed
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")

    ai_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    ai_model: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    generation_prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")

    word_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    character_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    metadata_: Mapped[Optional[dict[str, Any]]] = mapped_column(
        "metadata", JSON, nullable=True, default=dict
    )

    scheduled_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    external_post_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    workspace: Mapped["app.models.workspace.Workspace"] = relationship(  # type: ignore[name-defined]
        "Workspace", foreign_keys=[workspace_id]
    )
    user: Mapped[Optional["app.models.user.User"]] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[user_id]
    )
    brand_voice: Mapped[Optional["app.models.brand_voice.BrandVoice"]] = relationship(  # type: ignore[name-defined]
        "BrandVoice", foreign_keys=[brand_voice_id]
    )
    publishing_logs: Mapped[list["PublishingLog"]] = relationship(
        "PublishingLog",
        back_populates="content_post",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_content_posts_workspace_id", "workspace_id"),
        Index("ix_content_posts_status", "status"),
        Index("ix_content_posts_scheduled_at", "scheduled_at"),
        Index("ix_content_posts_content_type", "content_type"),
        Index("ix_content_posts_workspace_status", "workspace_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<ContentPost id={self.id} title={self.title!r} "
            f"platform={self.platform!r} status={self.status!r}>"
        )


class PublishingLog(Base, UUIDMixin):
    __tablename__ = "publishing_logs"

    content_post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("content_posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)

    # status: pending / success / failed / retrying
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")

    response_data: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    attempted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    content_post: Mapped["ContentPost"] = relationship(
        "ContentPost", back_populates="publishing_logs"
    )

    def __repr__(self) -> str:
        return (
            f"<PublishingLog id={self.id} content_post_id={self.content_post_id} "
            f"platform={self.platform!r} status={self.status!r}>"
        )
