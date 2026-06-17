from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, AuthorizationError
from app.core.logging import get_logger
from app.models.workspace import Workspace, WorkspaceMembership
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository

log = get_logger(__name__)


def _generate_slug(name: str) -> str:
    from slugify import slugify
    import uuid as _uuid
    slug = slugify(name)
    return slug or str(_uuid.uuid4())[:8]


class WorkspaceService:
    """Business logic for workspace and membership management."""

    def __init__(
        self,
        workspace_repo: WorkspaceRepository,
        user_repo: UserRepository,
    ) -> None:
        self.workspace_repo = workspace_repo
        self.user_repo = user_repo

    async def create_workspace(
        self, name: str, user_id: UUID
    ) -> Workspace:
        """Create a new workspace and assign the creator as admin."""
        slug = _generate_slug(name)
        base_slug = slug
        counter = 1
        while await self.workspace_repo.get_by_slug(slug) is not None:
            slug = f"{base_slug}-{counter}"
            counter += 1

        workspace = await self.workspace_repo.create_workspace(
            name=name, slug=slug, user_id=user_id
        )
        log.info("workspace_created", workspace_id=str(workspace.id), name=name)
        return workspace

    async def get_user_workspaces(self, user_id: UUID) -> List[Workspace]:
        """Return all active workspaces for which the user has membership."""
        return await self.workspace_repo.get_user_workspaces(user_id)

    async def get_workspace_by_id(self, workspace_id: UUID) -> Optional[Workspace]:
        return await self.workspace_repo.get_by_id(workspace_id)

    async def update_workspace(
        self,
        workspace_id: UUID,
        requesting_user_id: UUID,
        data: dict,
    ) -> Workspace:
        """Update workspace fields. Caller must verify admin permission beforehand."""
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if workspace is None:
            raise NotFoundError(message="Workspace not found.")
        for key, value in data.items():
            if value is not None:
                setattr(workspace, key, value)
        log.info(
            "workspace_updated",
            workspace_id=str(workspace_id),
            updated_by=str(requesting_user_id),
        )
        return workspace

    async def invite_member(
        self,
        workspace_id: UUID,
        email: str,
        role: str,
        invited_by: UUID,
    ) -> WorkspaceMembership:
        """Invite an existing user to a workspace by email."""
        target_user = await self.user_repo.get_by_email(email)
        if target_user is None:
            raise NotFoundError(
                message=f"No user found with email '{email}'. "
                "They must register before being invited."
            )

        existing = await self.workspace_repo.get_membership(target_user.id, workspace_id)
        if existing is not None:
            raise ConflictError(
                message=f"User '{email}' is already a member of this workspace."
            )

        membership = await self.workspace_repo.add_member(
            workspace_id=workspace_id,
            user_id=target_user.id,
            role=role,
            invited_by=invited_by,
        )
        log.info(
            "member_invited",
            workspace_id=str(workspace_id),
            user_id=str(target_user.id),
            role=role,
        )
        return membership

    async def update_member_role(
        self,
        workspace_id: UUID,
        target_user_id: UUID,
        new_role: str,
        requesting_user_id: UUID,
    ) -> WorkspaceMembership:
        """Change a workspace member's role."""
        # Prevent removing the last admin
        if new_role != "admin":
            membership = await self.workspace_repo.get_membership(
                target_user_id, workspace_id
            )
            if membership and membership.role == "admin":
                from sqlalchemy import select, func
                admin_count = await self._count_admins(workspace_id)
                if admin_count <= 1:
                    raise AuthorizationError(
                        message="Cannot downgrade the only admin of this workspace."
                    )

        membership = await self.workspace_repo.get_membership(target_user_id, workspace_id)
        if membership is None:
            raise NotFoundError(message="Membership not found.")

        updated = await self.workspace_repo.update_member_role(membership.id, new_role)
        log.info(
            "member_role_updated",
            workspace_id=str(workspace_id),
            user_id=str(target_user_id),
            new_role=new_role,
        )
        return updated

    async def remove_member(
        self,
        workspace_id: UUID,
        target_user_id: UUID,
        requesting_user_id: UUID,
    ) -> None:
        """Remove a member from a workspace."""
        # Can't remove yourself if you're the sole admin
        if target_user_id == requesting_user_id:
            membership = await self.workspace_repo.get_membership(
                target_user_id, workspace_id
            )
            if membership and membership.role == "admin":
                admin_count = await self._count_admins(workspace_id)
                if admin_count <= 1:
                    raise AuthorizationError(
                        message="You are the only admin of this workspace. "
                        "Assign another admin before leaving."
                    )

        await self.workspace_repo.remove_member(workspace_id, target_user_id)
        log.info(
            "member_removed",
            workspace_id=str(workspace_id),
            user_id=str(target_user_id),
        )

    async def get_members(self, workspace_id: UUID) -> List[WorkspaceMembership]:
        """Return all members (with user objects) for a workspace."""
        return await self.workspace_repo.get_workspace_members(workspace_id)

    async def deactivate_workspace(self, workspace_id: UUID) -> Workspace:
        workspace = await self.workspace_repo.get_by_id(workspace_id)
        if workspace is None:
            raise NotFoundError(message="Workspace not found.")
        workspace.is_active = False
        log.info("workspace_deactivated", workspace_id=str(workspace_id))
        return workspace

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _count_admins(self, workspace_id: UUID) -> int:
        members = await self.workspace_repo.get_workspace_members(workspace_id)
        return sum(1 for m in members if m.role == "admin")
