from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    UserUpdateRequest,
)
from app.schemas.base import MessageResponse
from app.services.auth_service import AuthService

router = APIRouter()


def _get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    user_repo = UserRepository(User, db)
    workspace_repo = WorkspaceRepository(None, db)
    return AuthService(user_repo=user_repo, workspace_repo=workspace_repo)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    body: RegisterRequest,
    service: AuthService = Depends(_get_auth_service),
) -> TokenResponse:
    """Register a new user and create their initial workspace."""
    user, workspace, access_token, refresh_token = await service.register(
        email=body.email,
        password=body.password,
        full_name=body.full_name,
        workspace_name=body.workspace_name,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive tokens",
)
async def login(
    body: LoginRequest,
    service: AuthService = Depends(_get_auth_service),
) -> TokenResponse:
    """Authenticate with email and password, returning JWT tokens."""
    user, access_token, refresh_token = await service.login(
        email=body.email,
        password=body.password,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
async def refresh_token(
    body: RefreshTokenRequest,
    service: AuthService = Depends(_get_auth_service),
) -> TokenResponse:
    """Exchange a valid refresh token for a new token pair."""
    new_access, new_refresh = await service.refresh_access_token(body.refresh_token)
    return TokenResponse(
        access_token=new_access,
        refresh_token=new_refresh,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout and revoke refresh token",
)
async def logout(
    body: RefreshTokenRequest,
    service: AuthService = Depends(_get_auth_service),
) -> MessageResponse:
    """Revoke the provided refresh token."""
    await service.logout(body.refresh_token)
    return MessageResponse(message="Logged out successfully.")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """Return the authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user profile",
)
async def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Update the authenticated user's profile fields."""
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    await db.flush()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post(
    "/me/change-password",
    response_model=MessageResponse,
    summary="Change current user's password",
)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    service: AuthService = Depends(_get_auth_service),
) -> MessageResponse:
    """Change the authenticated user's password."""
    await service.change_password(
        user=current_user,
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return MessageResponse(message="Password changed successfully.")
