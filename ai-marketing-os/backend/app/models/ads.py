import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class AdAccount(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ad_accounts"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # platform: meta / google / tiktok
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    account_id: Mapped[str] = mapped_column(String(255), nullable=False)
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Encrypted credentials stored as JSON
    credentials: Mapped[Optional[dict[str, Any]]] = mapped_column(JSON, nullable=True)

    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD")
    timezone: Mapped[str] = mapped_column(String(100), nullable=False, default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    workspace: Mapped["app.models.workspace.Workspace"] = relationship(  # type: ignore[name-defined]
        "Workspace", foreign_keys=[workspace_id]
    )
    campaigns: Mapped[list["Campaign"]] = relationship(
        "Campaign",
        back_populates="ad_account",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "workspace_id", "platform", "account_id", name="uq_ad_accounts_workspace_platform_account"
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<AdAccount id={self.id} platform={self.platform!r} "
            f"account_id={self.account_id!r}>"
        )


class Campaign(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "campaigns"

    ad_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ad_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    external_campaign_id: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(512), nullable=False)

    # status: active / paused / deleted / archived
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")

    objective: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    budget: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    daily_budget: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    metadata_: Mapped[Optional[dict[str, Any]]] = mapped_column(
        "metadata", JSON, nullable=True, default=dict
    )

    # Relationships
    ad_account: Mapped["AdAccount"] = relationship("AdAccount", back_populates="campaigns")
    workspace: Mapped["app.models.workspace.Workspace"] = relationship(  # type: ignore[name-defined]
        "Workspace", foreign_keys=[workspace_id]
    )
    metrics: Mapped[list["CampaignMetrics"]] = relationship(
        "CampaignMetrics",
        back_populates="campaign",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_campaigns_workspace_id_status", "workspace_id", "status"),
        Index("ix_campaigns_ad_account_id", "ad_account_id"),
        Index(
            "ix_campaigns_external_campaign_id",
            "ad_account_id",
            "external_campaign_id",
            unique=True,
        ),
    )

    def __repr__(self) -> str:
        return f"<Campaign id={self.id} name={self.name!r} status={self.status!r}>"


class CampaignMetrics(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "campaign_metrics"

    campaign_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="CASCADE"),
        nullable=False,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)

    impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    spend: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    conversions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reach: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    frequency: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    ctr: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cpc: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cpm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cpa: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    roas: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    video_views: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    link_clicks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relationships
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="metrics")
    workspace: Mapped["app.models.workspace.Workspace"] = relationship(  # type: ignore[name-defined]
        "Workspace", foreign_keys=[workspace_id]
    )

    __table_args__ = (
        UniqueConstraint("campaign_id", "date", name="uq_campaign_metrics_campaign_date"),
        Index("ix_campaign_metrics_campaign_id", "campaign_id"),
        Index("ix_campaign_metrics_date", "date"),
        Index("ix_campaign_metrics_workspace_id_date", "workspace_id", "date"),
    )

    def __repr__(self) -> str:
        return (
            f"<CampaignMetrics id={self.id} campaign_id={self.campaign_id} "
            f"date={self.date} spend={self.spend}>"
        )
