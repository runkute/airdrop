from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import Field, field_validator
from slugify import slugify

from app.schemas.auth import UserResponse
from app.schemas.base import BaseSchema


class WorkspaceCreate(BaseSchema):
    """Request body for creating a new workspace."""

    name: str = Field(min_length=1, max_length=255)
    slug: Optional[str] = Field(default=None, max_length=255)

    @field_validator("slug", mode="before")
    @classmethod
    def auto_slug(cls, v: Optional[str], info: Any) -> Optional[str]:
        if v:
            return slugify(v)
        # If slug is not provided it will be derived from name in the service layer
        return v


class WorkspaceUpdate(BaseSchema):
    """Fields that can be updated on an existing workspace."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    logo_url: Optional[str] = Field(default=None, max_length=2048)
    settings: Optional[dict[str, Any]] = None


class WorkspaceResponse(BaseSchema):
    """Public workspace representation."""

    id: UUID
    name: str
    slug: str
    plan: str
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime


class WorkspaceMemberResponse(BaseSchema):
    """Workspace membership with embedded user info."""

    id: UUID
    user_id: UUID
    workspace_id: UUID
    role: str
    user: UserResponse
    joined_at: datetime


class InviteMemberRequest(BaseSchema):
    """Request body to invite a user to a workspace."""

    email: str = Field(description="Email address of the user to invite")
    role: str = Field(default="viewer", description="Role to assign: admin/editor/analyst/viewer")

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        allowed = {"admin", "editor", "analyst", "viewer"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return v


class UpdateMemberRoleRequest(BaseSchema):
    """Request body to change a workspace member's role."""

    role: str = Field(description="New role: admin/editor/analyst/viewer")

    @field_validator("role")
    @classmethod
    def valid_role(cls, v: str) -> str:
        allowed = {"admin", "editor", "analyst", "viewer"}
        if v not in allowed:
            raise ValueError(f"Role must be one of: {', '.join(sorted(allowed))}")
        return v
