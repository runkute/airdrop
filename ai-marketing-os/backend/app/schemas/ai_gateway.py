from decimal import Decimal
from enum import Enum
from typing import Dict, Optional

from pydantic import Field

from app.schemas.base import BaseSchema


class AIProvider(str, Enum):
    """Supported AI providers."""

    openai = "openai"
    anthropic = "anthropic"
    google = "google"
    grok = "grok"


class ContentTypeRouting(BaseSchema):
    """Maps content types to their preferred AI providers.

    This schema is informational and drives the auto-selection logic in the AI gateway.
    """

    routing: Dict[str, AIProvider] = Field(
        default={
            "social_post": AIProvider.anthropic,
            "seo_article": AIProvider.openai,
            "ad_copy": AIProvider.anthropic,
            "reel_script": AIProvider.openai,
            "hashtags": AIProvider.google,
            "email": AIProvider.openai,
        }
    )


class AIGenerationRequest(BaseSchema):
    """Low-level request sent to the AI gateway."""

    provider: AIProvider
    model: str
    system_prompt: str = Field(min_length=1)
    user_prompt: str = Field(min_length=1)
    max_tokens: int = Field(default=2048, gt=0, le=32000)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)


class AIGenerationResponse(BaseSchema):
    """Normalised response returned by the AI gateway regardless of provider."""

    content: str
    provider: AIProvider
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: Decimal
    duration_ms: int
    request_id: str  # provider-assigned request / completion ID


class AIProviderStatus(BaseSchema):
    """Availability and rate-limit status for a single provider."""

    provider: AIProvider
    is_available: bool
    model: str
    rate_limit_remaining: Optional[int] = None
