from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user, get_workspace_member, require_role
from app.core.exceptions import AuthorizationError
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.base import MessageResponse
from app.schemas.workspace import (
    InviteMemberRequest,
    UpdateMemberRoleRequest,
    WorkspaceCreate,
    WorkspaceMemberResponse,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter()


def _get_service(db: AsyncSession = Depends(get_db)) -> WorkspaceService:
    return WorkspaceService(
        workspace_repo=WorkspaceRepository(Workspace, db),
        user_repo=UserRepository(User, db),
    )


@router.get("", response_model=List[WorkspaceResponse], summary="List user's workspaces")
async def list_workspaces(
    current_user: User = Depends(get_current_active_user),
    service: WorkspaceService = Depends(_get_service),
) -> List[WorkspaceResponse]:
    """Return all workspaces the authenticated user belongs to."""
    workspaces = await service.get_user_workspaces(current_user.id)
    return [WorkspaceResponse.model_validate(w) for w in workspaces]


@router.post(
    "",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace",
)
async def create_workspace(
    body: WorkspaceCreate,
    current_user: User = Depends(get_current_active_user),
    service: WorkspaceService = Depends(_get_service),
) -> WorkspaceResponse:
    """Create a new workspace and assign the creator as admin."""
    workspace = await service.create_workspace(name=body.name, user_id=current_user.id)
    return WorkspaceResponse.model_validate(workspace)


@router.get(
    "/{workspace_id}",
    response_model=WorkspaceResponse,
    summary="Get workspace by ID",
)
async def get_workspace(
    workspace_id: UUID,
    membership=Depends(get_workspace_member),
    service: WorkspaceService = Depends(_get_service),
) -> WorkspaceResponse:
    """Return workspace details. Requires membership."""
    workspace = await service.get_workspace_by_id(workspace_id)
    return WorkspaceResponse.model_validate(workspace)


@router.patch(
    "/{workspace_id}",
    response_model=WorkspaceResponse,
    summary="Update workspace (admin only)",
)
async def update_workspace(
    workspace_id: UUID,
    body: WorkspaceUpdate,
    current_user: User = Depends(get_current_active_user),
    membership=Depends(require_role("admin")),
    service: WorkspaceService = Depends(_get_service),
) -> WorkspaceResponse:
    """Update workspace details. Requires admin role."""
    update_data = body.model_dump(exclude_unset=True, exclude_none=True)
    workspace = await service.update_workspace(
        workspace_id=workspace_id,
        requesting_user_id=current_user.id,
        data=update_data,
    )
    return WorkspaceResponse.model_validate(workspace)


@router.delete(
    "/{workspace_id}",
    response_model=MessageResponse,
    summary="Deactivate workspace (admin only)",
)
async def deactivate_workspace(
    workspace_id: UUID,
    membership=Depends(require_role("admin")),
    service: WorkspaceService = Depends(_get_service),
) -> MessageResponse:
    """Deactivate (soft-delete) a workspace. Requires admin role."""
    await service.deactivate_workspace(workspace_id)
    return MessageResponse(message="Workspace deactivated successfully.")


@router.get(
    "/{workspace_id}/members",
    response_model=List[WorkspaceMemberResponse],
    summary="List workspace members",
)
async def list_members(
    workspace_id: UUID,
    membership=Depends(get_workspace_member),
    service: WorkspaceService = Depends(_get_service),
) -> List[WorkspaceMemberResponse]:
    """Return all members of a workspace."""
    members = await service.get_members(workspace_id)
    return [WorkspaceMemberResponse.model_validate(m) for m in members]


@router.post(
    "/{workspace_id}/members",
    response_model=WorkspaceMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Invite member (admin only)",
)
async def invite_member(
    workspace_id: UUID,
    body: InviteMemberRequest,
    current_user: User = Depends(get_current_active_user),
    membership=Depends(require_role("admin")),
    service: WorkspaceService = Depends(_get_service),
) -> WorkspaceMemberResponse:
    """Invite a registered user to the workspace by email. Requires admin role."""
    new_membership = await service.invite_member(
        workspace_id=workspace_id,
        email=body.email,
        role=body.role,
        invited_by=current_user.id,
    )
    return WorkspaceMemberResponse.model_validate(new_membership)


@router.patch(
    "/{workspace_id}/members/{user_id}",
    response_model=WorkspaceMemberResponse,
    summary="Update member role (admin only)",
)
async def update_member_role(
    workspace_id: UUID,
    user_id: UUID,
    body: UpdateMemberRoleRequest,
    current_user: User = Depends(get_current_active_user),
    membership=Depends(require_role("admin")),
    service: WorkspaceService = Depends(_get_service),
) -> WorkspaceMemberResponse:
    """Change a workspace member's role. Requires admin role."""
    updated = await service.update_member_role(
        workspace_id=workspace_id,
        target_user_id=user_id,
        new_role=body.role,
        requesting_user_id=current_user.id,
    )
    return WorkspaceMemberResponse.model_validate(updated)


@router.delete(
    "/{workspace_id}/members/{user_id}",
    response_model=MessageResponse,
    summary="Remove member (admin only)",
)
async def remove_member(
    workspace_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    membership=Depends(require_role("admin")),
    service: WorkspaceService = Depends(_get_service),
) -> MessageResponse:
    """Remove a member from the workspace. Requires admin role."""
    await service.remove_member(
        workspace_id=workspace_id,
        target_user_id=user_id,
        requesting_user_id=current_user.id,
    )
    return MessageResponse(message="Member removed successfully.")
