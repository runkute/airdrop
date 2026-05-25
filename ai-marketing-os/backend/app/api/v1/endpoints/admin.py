from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.exceptions import AuthorizationError
from app.models.ai_usage import AIUsageLog
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.ai_usage_repository import AIUsageRepository
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.auth import UserResponse
from app.schemas.base import MessageResponse, PaginatedResponse
from app.schemas.workspace import WorkspaceResponse
from app.services.admin_service import AdminService

router = APIRouter()


def _require_superuser(current_user: User = Depends(get_current_active_user)) -> User:
    if not current_user.is_superuser:
        raise AuthorizationError(message="Superuser access required.")
    return current_user


def _get_service(db: AsyncSession = Depends(get_db)) -> AdminService:
    return AdminService(
        user_repo=UserRepository(User, db),
        workspace_repo=WorkspaceRepository(Workspace, db),
        ai_usage_repo=AIUsageRepository(AIUsageLog, db),
        db=db,
    )


@router.get(
    "/users",
    response_model=PaginatedResponse[UserResponse],
    summary="List all users (superuser only)",
)
async def list_users(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(_require_superuser),
    service: AdminService = Depends(_get_service),
) -> PaginatedResponse[UserResponse]:
    """Return a paginated list of all users. Superuser only."""
    skip = (page - 1) * per_page
    users, total = await service.get_all_users(skip=skip, limit=per_page)
    items = [UserResponse.model_validate(u) for u in users]
    return PaginatedResponse.create(items=items, total=total, page=page, per_page=per_page)


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Activate/deactivate user (superuser only)",
)
async def update_user_status(
    user_id: UUID,
    is_active: bool = Query(...),
    current_user: User = Depends(_require_superuser),
    service: AdminService = Depends(_get_service),
) -> UserResponse:
    """Activate or deactivate a user account. Superuser only."""
    if not is_active:
        user = await service.deactivate_user(user_id)
    else:
        user = await service.user_repo.get_by_id(user_id)
        if user is None:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(message=f"User {user_id} not found.")
        user.is_active = True
        await service.db.flush()
        await service.db.refresh(user)
    return UserResponse.model_validate(user)


@router.get(
    "/workspaces",
    response_model=PaginatedResponse[WorkspaceResponse],
    summary="List all workspaces (superuser only)",
)
async def list_workspaces(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(_require_superuser),
    service: AdminService = Depends(_get_service),
) -> PaginatedResponse[WorkspaceResponse]:
    """Return a paginated list of all workspaces. Superuser only."""
    skip = (page - 1) * per_page
    workspaces, total = await service.get_all_workspaces(skip=skip, limit=per_page)
    items = [WorkspaceResponse.model_validate(w) for w in workspaces]
    return PaginatedResponse.create(items=items, total=total, page=page, per_page=per_page)


@router.get(
    "/ai-usage",
    summary="AI usage statistics (superuser only)",
)
async def get_ai_usage_stats(
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    current_user: User = Depends(_require_superuser),
    service: AdminService = Depends(_get_service),
) -> Dict[str, Any]:
    """Return AI usage statistics with optional date range filter. Superuser only."""
    return await service.get_ai_usage_stats(date_from=date_from, date_to=date_to)


@router.get(
    "/system-health",
    summary="System health check (superuser only)",
)
async def get_system_health(
    current_user: User = Depends(_require_superuser),
    service: AdminService = Depends(_get_service),
) -> Dict[str, Any]:
    """Return detailed system health status. Superuser only."""
    return await service.get_system_health()


@router.get(
    "/stats",
    summary="Platform-wide statistics (superuser only)",
)
async def get_platform_stats(
    current_user: User = Depends(_require_superuser),
    service: AdminService = Depends(_get_service),
) -> Dict[str, Any]:
    """Return platform-wide statistics. Superuser only."""
    return await service.get_platform_stats()
