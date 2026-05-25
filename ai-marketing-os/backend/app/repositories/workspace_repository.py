from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.workspace import Workspace, WorkspaceMembership
from app.repositories.base_repository import BaseRepository


class WorkspaceRepository(BaseRepository[Workspace]):
    """Repository for Workspace and WorkspaceMembership operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(Workspace, db)

    async def get_by_slug(self, slug: str) -> Optional[Workspace]:
        """Fetch a workspace by its unique slug."""
        result = await self.db.execute(select(Workspace).where(Workspace.slug == slug))
        return result.scalar_one_or_none()

    async def get_user_workspaces(self, user_id: UUID) -> List[Workspace]:
        """Return all active workspaces the user belongs to."""
        result = await self.db.execute(
            select(Workspace)
            .join(WorkspaceMembership, WorkspaceMembership.workspace_id == Workspace.id)
            .where(
                WorkspaceMembership.user_id == user_id,
                Workspace.is_active.is_(True),
            )
            .order_by(Workspace.created_at.desc())
        )
        return list(result.scalars().all())

    async def create_workspace(self, name: str, slug: str, user_id: UUID) -> Workspace:
        """Create a workspace and assign the creator as admin."""
        workspace = Workspace(name=name, slug=slug)
        self.db.add(workspace)
        await self.db.flush()
        await self.db.refresh(workspace)

        membership = WorkspaceMembership(
            user_id=user_id,
            workspace_id=workspace.id,
            role="admin",
            joined_at=datetime.now(timezone.utc),
        )
        self.db.add(membership)
        await self.db.flush()
        return workspace

    async def get_membership(
        self, user_id: UUID, workspace_id: UUID
    ) -> Optional[WorkspaceMembership]:
        """Return the membership record for a user/workspace pair."""
        result = await self.db.execute(
            select(WorkspaceMembership).where(
                WorkspaceMembership.user_id == user_id,
                WorkspaceMembership.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_workspace_members(self, workspace_id: UUID) -> List[WorkspaceMembership]:
        """Return all memberships for a workspace, eager-loading user objects."""
        result = await self.db.execute(
            select(WorkspaceMembership)
            .options(selectinload(WorkspaceMembership.user))
            .where(WorkspaceMembership.workspace_id == workspace_id)
            .order_by(WorkspaceMembership.joined_at.asc())
        )
        return list(result.scalars().all())

    async def add_member(
        self,
        workspace_id: UUID,
        user_id: UUID,
        role: str,
        invited_by: Optional[UUID] = None,
    ) -> WorkspaceMembership:
        """Add a user to a workspace with the given role."""
        membership = WorkspaceMembership(
            workspace_id=workspace_id,
            user_id=user_id,
            role=role,
            invited_by=invited_by,
            joined_at=datetime.now(timezone.utc),
        )
        self.db.add(membership)
        await self.db.flush()
        await self.db.refresh(membership)
        return membership

    async def update_member_role(
        self, membership_id: UUID, role: str
    ) -> WorkspaceMembership:
        """Change the role of an existing membership."""
        result = await self.db.execute(
            select(WorkspaceMembership).where(WorkspaceMembership.id == membership_id)
        )
        membership = result.scalar_one_or_none()
        if membership is None:
            raise ValueError(f"Membership {membership_id} not found.")
        membership.role = role
        await self.db.flush()
        await self.db.refresh(membership)
        return membership

    async def remove_member(self, workspace_id: UUID, user_id: UUID) -> None:
        """Remove a user from a workspace."""
        await self.db.execute(
            delete(WorkspaceMembership).where(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.user_id == user_id,
            )
        )
        await self.db.flush()
