from dataclasses import dataclass
from typing import Callable
from uuid import UUID

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError, NotFoundError
from app.core.security import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """Decode JWT and return the corresponding User ORM object."""
    from app.models.user import User
    from app.repositories.user_repository import UserRepository

    credentials_exception = AuthenticationError(message="Could not validate credentials.")
    token_data = verify_token(token, credentials_exception)

    if token_data.token_type != "access":
        raise credentials_exception

    repo = UserRepository(User, db)
    user = await repo.get_by_id(UUID(token_data.sub))
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user=Depends(get_current_user),
):
    """Ensure the authenticated user is active."""
    if not current_user.is_active:
        raise AuthorizationError(message="Inactive user account.")
    return current_user


async def get_workspace_member(
    workspace_id: UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the WorkspaceMembership for the current user in the given workspace."""
    from app.models.workspace import Workspace, WorkspaceMembership
    from app.repositories.workspace_repository import WorkspaceRepository

    repo = WorkspaceRepository(Workspace, db)
    workspace = await repo.get_by_id(workspace_id)
    if workspace is None:
        raise NotFoundError(message="Workspace not found.")

    membership = await repo.get_membership(current_user.id, workspace_id)
    if membership is None and not current_user.is_superuser:
        raise AuthorizationError(message="You are not a member of this workspace.")

    return membership


@dataclass
class WorkspaceContext:
    workspace: object  # Workspace ORM instance
    membership: object  # WorkspaceMembership ORM instance
    user: object  # User ORM instance


def require_role(*roles: str) -> Callable:
    """Return a FastAPI dependency that enforces membership role requirements.

    Usage::

        @router.get("/admin")
        async def admin_route(ctx = Depends(require_role("admin"))):
            ...
    """

    async def _check_role(
        membership=Depends(get_workspace_member),
        current_user=Depends(get_current_active_user),
    ):
        # Superusers bypass role checks
        if current_user.is_superuser:
            return membership
        if membership is None or membership.role not in roles:
            raise AuthorizationError(
                message=f"This action requires one of the following roles: {', '.join(roles)}."
            )
        return membership

    return _check_role


async def get_workspace_context(
    workspace_id: UUID,
    current_user=Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> WorkspaceContext:
    """Build a WorkspaceContext for the current user and workspace."""
    from app.models.workspace import Workspace
    from app.repositories.workspace_repository import WorkspaceRepository

    repo = WorkspaceRepository(Workspace, db)
    workspace = await repo.get_by_id(workspace_id)
    if workspace is None:
        raise NotFoundError(message="Workspace not found.")

    membership = await repo.get_membership(current_user.id, workspace_id)
    if membership is None and not current_user.is_superuser:
        raise AuthorizationError(message="You are not a member of this workspace.")

    return WorkspaceContext(workspace=workspace, membership=membership, user=current_user)
