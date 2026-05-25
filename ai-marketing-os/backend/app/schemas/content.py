from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema

ContentTypeEnum = Literal[
    "social_post", "seo_article", "ad_copy", "reel_script", "hashtags", "email"
]


class ContentGenerationRequest(BaseSchema):
    """Request body for AI content generation."""

    content_type: ContentTypeEnum
    platform: str = Field(min_length=1, max_length=50)
    topic: str = Field(min_length=1, max_length=1024)
    target_audience: str = Field(min_length=1, max_length=512)
    tone: Optional[str] = None
    cta: Optional[str] = Field(default=None, max_length=512)
    keywords: Optional[List[str]] = None
    word_count: Optional[int] = Field(default=None, gt=0, le=10000)
    brand_voice_id: Optional[UUID] = None
    # If None the service layer will auto-select the best provider for the content_type
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None
    additional_context: Optional[str] = Field(default=None, max_length=2048)


class ContentRewriteRequest(BaseSchema):
    """Request body to rewrite existing content."""

    content: str = Field(min_length=1)
    instructions: str = Field(min_length=1, max_length=1024)
    ai_provider: Optional[str] = None
    ai_model: Optional[str] = None


class ContentSummarizeRequest(BaseSchema):
    """Request body to summarize content."""

    content: str = Field(min_length=1)
    max_length: int = Field(default=150, gt=0, le=2000)
    ai_provider: Optional[str] = None


class ContentPostCreate(BaseSchema):
    """Request body for saving a content post manually."""

    title: str = Field(min_length=1, max_length=512)
    content: str = Field(min_length=1)
    content_type: ContentTypeEnum
    platform: str = Field(min_length=1, max_length=50)
    brand_voice_id: Optional[UUID] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None
    scheduled_at: Optional[datetime] = None


class ContentPostUpdate(BaseSchema):
    """Partial update for a content post."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=512)
    content: Optional[str] = Field(default=None, min_length=1)
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"draft", "review", "scheduled", "published", "failed"}
            if v not in allowed:
                raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")
        return v


class ContentPostResponse(BaseSchema):
    """Full content post representation."""

    id: UUID
    workspace_id: UUID
    user_id: Optional[UUID] = None
    brand_voice_id: Optional[UUID] = None
    title: str
    content: str
    content_type: str
    platform: str
    status: str
    ai_provider: str
    ai_model: str
    word_count: Optional[int] = None
    character_count: Optional[int] = None
    tags: List[str]
    metadata_: Optional[Dict[str, Any]] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    external_post_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ContentGenerationResponse(BaseSchema):
    """Response from AI content generation – includes the saved post and token usage."""

    post: ContentPostResponse
    usage: Dict[str, Any]  # tokens, cost_usd, provider, model, duration_ms


class ScheduleContentRequest(BaseSchema):
    """Request body to schedule a content post for publishing."""

    scheduled_at: datetime
