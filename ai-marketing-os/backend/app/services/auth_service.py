from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AuthenticationError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_token,
)
from app.models.user import RefreshToken, User
from app.models.workspace import Workspace, WorkspaceMembership
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository

log = get_logger(__name__)


def _generate_workspace_slug(name: str) -> str:
    from slugify import slugify
    import uuid as _uuid

    slug = slugify(name)
    if not slug:
        slug = str(_uuid.uuid4())[:8]
    return slug


class AuthService:
    """Business logic for authentication and token management."""

    def __init__(
        self,
        user_repo: UserRepository,
        workspace_repo: WorkspaceRepository,
    ) -> None:
        self.user_repo = user_repo
        self.workspace_repo = workspace_repo

    async def register(
        self,
        email: str,
        password: str,
        full_name: str,
        workspace_name: str,
    ) -> Tuple[User, Workspace, str, str]:
        """Register a new user, create their first workspace, and return tokens.

        Returns:
            Tuple of (user, workspace, access_token, refresh_token).
        """
        # Check for existing email
        existing = await self.user_repo.get_by_email(email)
        if existing is not None:
            raise ConflictError(
                message=f"An account with email '{email}' already exists."
            )

        # Create user
        user = await self.user_repo.create_user(
            email=email,
            password=password,
            full_name=full_name,
        )

        # Create workspace
        slug = _generate_workspace_slug(workspace_name)
        # Ensure slug uniqueness
        base_slug = slug
        counter = 1
        while await self.workspace_repo.get_by_slug(slug) is not None:
            slug = f"{base_slug}-{counter}"
            counter += 1

        workspace = await self.workspace_repo.create_workspace(
            name=workspace_name,
            slug=slug,
            user_id=user.id,
        )

        # Generate tokens
        access_token, refresh_token = await self._issue_tokens(user.id)

        log.info("user_registered", user_id=str(user.id), email=email)
        return user, workspace, access_token, refresh_token

    async def login(
        self, email: str, password: str
    ) -> Tuple[User, str, str]:
        """Authenticate a user and return tokens.

        Returns:
            Tuple of (user, access_token, refresh_token).
        """
        user = await self.user_repo.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise AuthenticationError(message="Invalid email or password.")
        if not user.is_active:
            raise AuthenticationError(message="Your account has been deactivated.")

        # Update last login timestamp
        await self.user_repo.update_last_login(user.id)

        access_token, refresh_token = await self._issue_tokens(user.id)
        log.info("user_logged_in", user_id=str(user.id))
        return user, access_token, refresh_token

    async def refresh_access_token(
        self, refresh_token_str: str
    ) -> Tuple[str, str]:
        """Exchange a valid refresh token for new access + refresh tokens.

        Returns:
            Tuple of (new_access_token, new_refresh_token).
        """
        from app.core.exceptions import AuthenticationError

        credentials_exc = AuthenticationError(message="Invalid or expired refresh token.")

        # Decode token
        token_data = verify_token(refresh_token_str, credentials_exc)
        if token_data.token_type != "refresh":
            raise credentials_exc

        # Look up token in DB
        stored_token = await self.user_repo.get_refresh_token(refresh_token_str)
        if stored_token is None:
            raise credentials_exc
        if stored_token.is_revoked:
            raise credentials_exc
        if stored_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
            raise credentials_exc

        user_id = UUID(token_data.sub)

        # Revoke old token and issue new pair
        await self.user_repo.revoke_refresh_token(refresh_token_str)
        new_access_token, new_refresh_token = await self._issue_tokens(user_id)

        log.info("tokens_refreshed", user_id=str(user_id))
        return new_access_token, new_refresh_token

    async def logout(self, refresh_token_str: str) -> None:
        """Revoke the provided refresh token."""
        await self.user_repo.revoke_refresh_token(refresh_token_str)
        log.info("user_logged_out")

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        """Update the user's password after verifying the current one."""
        if not verify_password(current_password, user.hashed_password):
            raise AuthenticationError(message="Current password is incorrect.")
        user.hashed_password = get_password_hash(new_password)
        # Revoke all existing refresh tokens to force re-login on all devices
        await self.user_repo.revoke_all_user_tokens(user.id)
        log.info("password_changed", user_id=str(user.id))

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _issue_tokens(self, user_id: UUID) -> Tuple[str, str]:
        """Create an access token and a persisted refresh token for a user."""
        access_token = create_access_token(data={"sub": str(user_id)})
        refresh_token_str = create_refresh_token(data={"sub": str(user_id)})
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        await self.user_repo.create_refresh_token(
            user_id=user_id,
            token=refresh_token_str,
            expires_at=expires_at,
        )
        return access_token, refresh_token_str
