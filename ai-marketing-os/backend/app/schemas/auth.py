from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.schemas.base import BaseSchema


class RegisterRequest(BaseSchema):
    """Request body for new user registration."""

    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters")
    full_name: str = Field(min_length=1, max_length=255)
    workspace_name: str = Field(min_length=1, max_length=255)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return v


class LoginRequest(BaseSchema):
    """Request body for user login."""

    email: EmailStr
    password: str


class TokenResponse(BaseSchema):
    """JWT token pair returned after successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until the access token expires


class RefreshTokenRequest(BaseSchema):
    """Request body to exchange a refresh token for a new access token."""

    refresh_token: str


class UserResponse(BaseSchema):
    """Public user representation."""

    id: UUID
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: datetime


class UserUpdateRequest(BaseSchema):
    """Fields the user may update on their own profile."""

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    avatar_url: Optional[str] = Field(default=None, max_length=2048)


class ChangePasswordRequest(BaseSchema):
    """Request body for changing the authenticated user's password."""

    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters long.")
        return v
