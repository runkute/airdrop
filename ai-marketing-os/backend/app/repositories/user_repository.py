from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import RefreshToken, User
from app.repositories.base_repository import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User and RefreshToken model operations."""

    def __init__(self, model: type, db: AsyncSession) -> None:
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Look up a user by email address (case-insensitive)."""
        result = await self.db.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def create_user(
        self,
        email: str,
        password: str,
        full_name: str,
        is_superuser: bool = False,
    ) -> User:
        """Create a new user, hashing the plain-text password before storage."""
        hashed = get_password_hash(password)
        user = User(
            email=email.lower(),
            hashed_password=hashed,
            full_name=full_name,
            is_active=True,
            is_superuser=is_superuser,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """Return the user if credentials are valid, otherwise None."""
        user = await self.get_by_email(email)
        if user is None:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def update_last_login(self, user_id: UUID) -> None:
        """Stamp the user's last_login_at with the current UTC time."""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(last_login_at=datetime.now(timezone.utc))
        )
        await self.db.flush()

    async def create_refresh_token(
        self, user_id: UUID, token: str, expires_at: datetime
    ) -> RefreshToken:
        """Persist a new refresh token for a user."""
        refresh_token = RefreshToken(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            is_revoked=False,
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(refresh_token)
        await self.db.flush()
        await self.db.refresh(refresh_token)
        return refresh_token

    async def get_refresh_token(self, token: str) -> Optional[RefreshToken]:
        """Fetch a refresh token record by its token string."""
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token == token)
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token: str) -> None:
        """Mark a single refresh token as revoked."""
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token == token)
        )
        refresh_token = result.scalar_one_or_none()
        if refresh_token is not None:
            refresh_token.is_revoked = True
            await self.db.flush()

    async def revoke_all_user_tokens(self, user_id: UUID) -> None:
        """Revoke all active refresh tokens belonging to a user."""
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked.is_(False))
            .values(is_revoked=True)
        )
        await self.db.flush()
