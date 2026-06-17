from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema

_ALLOWED_TONES = {"professional", "casual", "playful", "authoritative", "empathetic", "bold"}
_ALLOWED_STYLES = {"concise", "detailed", "storytelling", "data-driven", "conversational"}


class BrandVoiceCreate(BaseSchema):
    """Request body for creating a brand voice."""

    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1024)
    tone: str = Field(default="professional")
    writing_style: str = Field(default="conversational")
    cta_style: str = Field(default="", max_length=255)
    forbidden_words: List[str] = Field(default_factory=list)
    emotional_positioning: str = Field(default="", max_length=512)
    keyword_preferences: List[str] = Field(default_factory=list)
    example_content: Optional[str] = None
    is_default: bool = False

    @field_validator("tone")
    @classmethod
    def valid_tone(cls, v: str) -> str:
        if v not in _ALLOWED_TONES:
            raise ValueError(f"Tone must be one of: {', '.join(sorted(_ALLOWED_TONES))}")
        return v

    @field_validator("writing_style")
    @classmethod
    def valid_writing_style(cls, v: str) -> str:
        if v not in _ALLOWED_STYLES:
            raise ValueError(f"Writing style must be one of: {', '.join(sorted(_ALLOWED_STYLES))}")
        return v


class BrandVoiceUpdate(BaseSchema):
    """All fields are optional for partial updates."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1024)
    tone: Optional[str] = None
    writing_style: Optional[str] = None
    cta_style: Optional[str] = Field(default=None, max_length=255)
    forbidden_words: Optional[List[str]] = None
    emotional_positioning: Optional[str] = Field(default=None, max_length=512)
    keyword_preferences: Optional[List[str]] = None
    example_content: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator("tone")
    @classmethod
    def valid_tone(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _ALLOWED_TONES:
            raise ValueError(f"Tone must be one of: {', '.join(sorted(_ALLOWED_TONES))}")
        return v

    @field_validator("writing_style")
    @classmethod
    def valid_writing_style(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _ALLOWED_STYLES:
            raise ValueError(
                f"Writing style must be one of: {', '.join(sorted(_ALLOWED_STYLES))}"
            )
        return v


class BrandVoiceResponse(BaseSchema):
    """Full brand voice representation returned by the API."""

    id: UUID
    workspace_id: UUID
    name: str
    description: Optional[str] = None
    tone: str
    writing_style: str
    cta_style: str
    forbidden_words: List[str]
    emotional_positioning: str
    keyword_preferences: List[str]
    example_content: Optional[str] = None
    is_active: bool
    is_default: bool
    created_at: datetime
    updated_at: datetime
