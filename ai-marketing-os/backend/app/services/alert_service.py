from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from app.core.logging import get_logger
from app.models.ai_usage import AIAlert
from app.repositories.ads_repository import CampaignMetricsRepository, CampaignRepository
from app.repositories.ai_usage_repository import AIAlertRepository

log = get_logger(__name__)


class AlertService:
    """Service for detecting performance anomalies and creating AI alerts."""

    THRESHOLDS: Dict[str, float] = {
        "ctr_drop_pct": 20.0,           # Alert if CTR drops > 20% vs prior period
        "cpm_spike_pct": 30.0,          # Alert if CPM increases > 30%
        "max_frequency": 3.5,           # Alert if frequency > 3.5
        "cpa_increase_pct": 25.0,       # Alert if CPA increases > 25%
        "roas_drop_pct": 20.0,          # Alert if ROAS drops > 20%
        "creative_fatigue_freq": 4.0,   # Creative fatigue threshold
    }

    def __init__(
        self,
        alert_repo: AIAlertRepository,
        metrics_repo: CampaignMetricsRepository,
        campaign_repo: CampaignRepository,
    ) -> None:
        self.alert_repo = alert_repo
        self.metrics_repo = metrics_repo
        self.campaign_repo = campaign_repo

    async def run_alerts_for_workspace(
        self, workspace_id: UUID
    ) -> List[AIAlert]:
        """Run all alert detection rules for a workspace."""
        today = datetime.now(timezone.utc).date()
        current_start = today - timedelta(days=7)
        prior_end = current_start - timedelta(days=1)
        prior_start = prior_end - timedelta(days=6)

        campaigns = await self.campaign_repo.get_workspace_campaigns(workspace_id)
        alerts_created: List[AIAlert] = []

        for campaign in campaigns:
            current_metrics = await self.metrics_repo.get_campaign_metrics(
                campaign_id=campaign.id,
                date_from=current_start,
                date_to=today,
            )
            prior_metrics = await self.metrics_repo.get_campaign_metrics(
                campaign_id=campaign.id,
                date_from=prior_start,
                date_to=prior_end,
            )

            if not current_metrics:
                continue

            current_agg = self._aggregate_metrics(current_metrics)
            prior_agg = self._aggregate_metrics(prior_metrics) if prior_metrics else None

            # Run detection methods
            detections = [
                await self._detect_high_frequency(campaign.id, workspace_id, current_agg),
                await self._detect_creative_fatigue(campaign.id, workspace_id, current_agg),
            ]

            if prior_agg:
                detections.extend([
                    await self._detect_ctr_drop(campaign.id, workspace_id, current_agg, prior_agg),
                    await self._detect_cpm_spike(campaign.id, workspace_id, current_agg, prior_agg),
                    await self._detect_cpa_increase(campaign.id, workspace_id, current_agg, prior_agg),
                    await self._detect_roas_drop(campaign.id, workspace_id, current_agg, prior_agg),
                ])

            for alert in detections:
                if alert is not None:
                    alerts_created.append(alert)

        log.info(
            "alerts_run",
            workspace_id=str(workspace_id),
            campaigns=len(campaigns),
            alerts=len(alerts_created),
        )
        return alerts_created

    async def _detect_ctr_drop(
        self,
        campaign_id: UUID,
        workspace_id: UUID,
        current: Dict[str, Any],
        prior: Dict[str, Any],
    ) -> Optional[AIAlert]:
        current_ctr = current.get("avg_ctr", 0)
        prior_ctr = prior.get("avg_ctr", 0)
        if prior_ctr <= 0:
            return None

        drop_pct = ((prior_ctr - current_ctr) / prior_ctr) * 100
        if drop_pct < self.THRESHOLDS["ctr_drop_pct"]:
            return None

        # Dedup: skip if recent alert exists
        existing = await self.alert_repo.get_recent_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="ctr_drop",
        )
        if existing:
            return None

        return await self.alert_repo.create_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="ctr_drop",
            severity="high" if drop_pct >= 40 else "medium",
            title="CTR Drop Detected",
            message=(
                f"Click-through rate dropped by {drop_pct:.1f}% "
                f"(from {prior_ctr:.2f}% to {current_ctr:.2f}%) compared to the prior 7-day period."
            ),
            details={
                "current_ctr": current_ctr,
                "prior_ctr": prior_ctr,
                "drop_pct": round(drop_pct, 1),
            },
        )

    async def _detect_cpm_spike(
        self,
        campaign_id: UUID,
        workspace_id: UUID,
        current: Dict[str, Any],
        prior: Dict[str, Any],
    ) -> Optional[AIAlert]:
        current_cpm = current.get("avg_cpm", 0)
        prior_cpm = prior.get("avg_cpm", 0)
        if prior_cpm <= 0:
            return None

        increase_pct = ((current_cpm - prior_cpm) / prior_cpm) * 100
        if increase_pct < self.THRESHOLDS["cpm_spike_pct"]:
            return None

        existing = await self.alert_repo.get_recent_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="cpm_spike",
        )
        if existing:
            return None

        return await self.alert_repo.create_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="cpm_spike",
            severity="high" if increase_pct >= 60 else "medium",
            title="CPM Spike Detected",
            message=(
                f"Cost per thousand impressions increased by {increase_pct:.1f}% "
                f"(from ${prior_cpm:.2f} to ${current_cpm:.2f}). "
                "This may indicate increased competition or audience saturation."
            ),
            details={
                "current_cpm": current_cpm,
                "prior_cpm": prior_cpm,
                "increase_pct": round(increase_pct, 1),
            },
        )

    async def _detect_high_frequency(
        self,
        campaign_id: UUID,
        workspace_id: UUID,
        current: Dict[str, Any],
    ) -> Optional[AIAlert]:
        avg_frequency = current.get("avg_frequency", 0)
        threshold = self.THRESHOLDS["max_frequency"]
        if avg_frequency < threshold:
            return None

        existing = await self.alert_repo.get_recent_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="high_frequency",
        )
        if existing:
            return None

        severity = "critical" if avg_frequency >= 5.0 else "high"
        return await self.alert_repo.create_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="high_frequency",
            severity=severity,
            title="High Ad Frequency",
            message=(
                f"Average frequency is {avg_frequency:.1f}x (threshold: {threshold}x). "
                "Users are seeing your ads too often, which may cause ad fatigue and "
                "increased costs. Consider expanding your audience or refreshing creatives."
            ),
            details={"avg_frequency": avg_frequency, "threshold": threshold},
        )

    async def _detect_cpa_increase(
        self,
        campaign_id: UUID,
        workspace_id: UUID,
        current: Dict[str, Any],
        prior: Dict[str, Any],
    ) -> Optional[AIAlert]:
        current_cpa = current.get("avg_cpa", 0)
        prior_cpa = prior.get("avg_cpa", 0)
        if prior_cpa <= 0 or current_cpa <= 0:
            return None

        increase_pct = ((current_cpa - prior_cpa) / prior_cpa) * 100
        if increase_pct < self.THRESHOLDS["cpa_increase_pct"]:
            return None

        existing = await self.alert_repo.get_recent_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="cpa_increase",
        )
        if existing:
            return None

        return await self.alert_repo.create_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="cpa_increase",
            severity="high" if increase_pct >= 50 else "medium",
            title="CPA Increase Detected",
            message=(
                f"Cost per acquisition increased by {increase_pct:.1f}% "
                f"(from ${prior_cpa:.2f} to ${current_cpa:.2f}). "
                "Review bidding strategy and audience targeting."
            ),
            details={
                "current_cpa": current_cpa,
                "prior_cpa": prior_cpa,
                "increase_pct": round(increase_pct, 1),
            },
        )

    async def _detect_roas_drop(
        self,
        campaign_id: UUID,
        workspace_id: UUID,
        current: Dict[str, Any],
        prior: Dict[str, Any],
    ) -> Optional[AIAlert]:
        current_roas = current.get("avg_roas", 0)
        prior_roas = prior.get("avg_roas", 0)
        if prior_roas <= 0:
            return None

        drop_pct = ((prior_roas - current_roas) / prior_roas) * 100
        if drop_pct < self.THRESHOLDS["roas_drop_pct"]:
            return None

        existing = await self.alert_repo.get_recent_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="roas_drop",
        )
        if existing:
            return None

        return await self.alert_repo.create_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="roas_drop",
            severity="critical" if drop_pct >= 40 else "high",
            title="ROAS Drop Detected",
            message=(
                f"Return on ad spend dropped by {drop_pct:.1f}% "
                f"(from {prior_roas:.2f}x to {current_roas:.2f}x). "
                "Campaign profitability is declining. Review creatives, audience, and offers."
            ),
            details={
                "current_roas": current_roas,
                "prior_roas": prior_roas,
                "drop_pct": round(drop_pct, 1),
            },
        )

    async def _detect_creative_fatigue(
        self,
        campaign_id: UUID,
        workspace_id: UUID,
        current: Dict[str, Any],
    ) -> Optional[AIAlert]:
        avg_frequency = current.get("avg_frequency", 0)
        ctr_trend = current.get("avg_ctr", 0)
        threshold = self.THRESHOLDS["creative_fatigue_freq"]

        # Creative fatigue = high frequency + declining CTR
        if avg_frequency < threshold:
            return None

        existing = await self.alert_repo.get_recent_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="creative_fatigue",
            hours=48,
        )
        if existing:
            return None

        return await self.alert_repo.create_alert(
            workspace_id=workspace_id,
            campaign_id=campaign_id,
            alert_type="creative_fatigue",
            severity="high",
            title="Creative Fatigue Warning",
            message=(
                f"Ad frequency of {avg_frequency:.1f}x exceeds the fatigue threshold of {threshold}x. "
                "Your audience is over-exposed to current creatives. "
                "Rotate or refresh ad creatives to maintain engagement."
            ),
            details={
                "avg_frequency": avg_frequency,
                "threshold": threshold,
                "avg_ctr": ctr_trend,
            },
        )

    async def get_workspace_alerts(
        self,
        workspace_id: UUID,
        is_read: Optional[bool] = None,
        severity: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[AIAlert], int]:
        """Return workspace alerts with total count."""
        alerts = await self.alert_repo.get_workspace_alerts(
            workspace_id=workspace_id,
            is_read=is_read,
            severity=severity,
            skip=skip,
            limit=limit,
        )
        # Count total
        from sqlalchemy import func, select, and_
        from app.models.ai_usage import AIAlert as AIAlertModel

        conditions = [
            AIAlertModel.workspace_id == workspace_id,
            AIAlertModel.is_dismissed == False,
        ]
        if is_read is not None:
            conditions.append(AIAlertModel.is_read == is_read)
        if severity:
            conditions.append(AIAlertModel.severity == severity)

        count_result = await self.alert_repo.db.execute(
            select(func.count()).select_from(AIAlertModel).where(and_(*conditions))
        )
        total = count_result.scalar_one()
        return alerts, total

    async def mark_alerts_read(
        self, alert_ids: List[UUID], workspace_id: UUID
    ) -> int:
        """Mark alerts as read and return count of updated records."""
        return await self.alert_repo.mark_as_read(alert_ids, workspace_id)

    async def dismiss_alert(self, alert_id: UUID, workspace_id: UUID) -> AIAlert:
        """Dismiss an alert."""
        from sqlalchemy import select

        result = await self.alert_repo.db.execute(
            select(AIAlert).where(
                AIAlert.id == alert_id,
                AIAlert.workspace_id == workspace_id,
            )
        )
        alert = result.scalar_one_or_none()
        if alert is None:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(message=f"Alert {alert_id} not found.")
        alert.is_dismissed = True
        alert.is_read = True
        await self.alert_repo.db.flush()
        await self.alert_repo.db.refresh(alert)
        return alert

    async def get_unread_count(self, workspace_id: UUID) -> int:
        """Return the count of unread alerts for a workspace."""
        return await self.alert_repo.get_unread_count(workspace_id)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _aggregate_metrics(self, metrics: list) -> Dict[str, Any]:
        """Compute aggregate stats from a list of CampaignMetrics records."""
        if not metrics:
            return {}
        count = len(metrics)
        return {
            "total_spend": sum(float(m.spend) for m in metrics),
            "total_impressions": sum(m.impressions for m in metrics),
            "total_clicks": sum(m.clicks for m in metrics),
            "total_conversions": sum(m.conversions for m in metrics),
            "avg_ctr": sum(m.ctr for m in metrics) / count,
            "avg_cpm": sum(m.cpm for m in metrics) / count,
            "avg_cpc": sum(m.cpc for m in metrics) / count,
            "avg_cpa": sum(m.cpa for m in metrics) / count,
            "avg_roas": sum(m.roas for m in metrics) / count,
            "avg_frequency": sum(m.frequency for m in metrics) / count,
        }
