import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class AIUsageLog(Base, UUIDMixin):
    __tablename__ = "ai_usage_logs"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    content_post_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("content_posts.id", ondelete="SET NULL"),
        nullable=True,
    )

    # provider: openai / anthropic / google / grok
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)

    prompt_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cost_usd: Mapped[Decimal] = mapped_column(
        Numeric(10, 6), nullable=False, default=Decimal("0")
    )

    content_type: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    request_id: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    workspace: Mapped["app.models.workspace.Workspace"] = relationship(  # type: ignore[name-defined]
        "Workspace", foreign_keys=[workspace_id]
    )
    user: Mapped[Optional["app.models.user.User"]] = relationship(  # type: ignore[name-defined]
        "User", foreign_keys=[user_id]
    )
    content_post: Mapped[Optional["app.models.content.ContentPost"]] = relationship(  # type: ignore[name-defined]
        "ContentPost", foreign_keys=[content_post_id]
    )

    __table_args__ = (
        Index("ix_ai_usage_logs_workspace_id", "workspace_id"),
        Index("ix_ai_usage_logs_provider", "provider"),
        Index("ix_ai_usage_logs_created_at", "created_at"),
        Index("ix_ai_usage_logs_workspace_created", "workspace_id", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<AIUsageLog id={self.id} provider={self.provider!r} "
            f"model={self.model!r} total_tokens={self.total_tokens}>"
        )


class AIAlert(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ai_alerts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    campaign_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
    )
    ad_account_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )

    # alert_type: ctr_drop / cpm_spike / high_frequency / cpa_increase /
    #             creative_fatigue / budget_depleted / roas_drop
    alert_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # severity: low / medium / high / critical
    severity: Mapped[str] = mapped_column(String(50), nullable=False, default="medium")

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)

    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    workspace: Mapped["app.models.workspace.Workspace"] = relationship(  # type: ignore[name-defined]
        "Workspace", foreign_keys=[workspace_id]
    )
    campaign: Mapped[Optional["app.models.ads.Campaign"]] = relationship(  # type: ignore[name-defined]
        "Campaign", foreign_keys=[campaign_id]
    )
    ad_account: Mapped[Optional["app.models.ads.AdAccount"]] = relationship(  # type: ignore[name-defined]
        "AdAccount", foreign_keys=[ad_account_id]
    )

    __table_args__ = (
        Index("ix_ai_alerts_workspace_id", "workspace_id"),
        Index("ix_ai_alerts_is_read", "is_read"),
        Index("ix_ai_alerts_severity", "severity"),
        Index("ix_ai_alerts_created_at", "created_at"),
        Index("ix_ai_alerts_workspace_read", "workspace_id", "is_read"),
    )

    def __repr__(self) -> str:
        return (
            f"<AIAlert id={self.id} type={self.alert_type!r} "
            f"severity={self.severity!r} is_read={self.is_read}>"
        )
