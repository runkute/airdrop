from typing import Any, Generic, List, Optional, Type, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic async CRUD repository using SQLAlchemy 2.0 select/execute style."""

    def __init__(self, model: Type[ModelType], db: AsyncSession) -> None:
        self.model = model
        self.db = db

    async def get_by_id(self, id: UUID) -> Optional[ModelType]:
        """Fetch a single record by its primary-key UUID."""
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100, **filters: Any) -> List[ModelType]:
        """Fetch a list of records with optional equality filters, skip and limit."""
        stmt = select(self.model)
        for field, value in filters.items():
            column = getattr(self.model, field, None)
            if column is not None and value is not None:
                stmt = stmt.where(column == value)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **kwargs: Any) -> ModelType:
        """Create and persist a new model instance."""
        instance = self.model(**kwargs)
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def update(self, instance: ModelType, **kwargs: Any) -> ModelType:
        """Update an existing model instance with the supplied keyword arguments."""
        for key, value in kwargs.items():
            if hasattr(instance, key):
                setattr(instance, key, value)
        self.db.add(instance)
        await self.db.flush()
        await self.db.refresh(instance)
        return instance

    async def delete(self, instance: ModelType) -> None:
        """Delete a model instance from the database."""
        await self.db.delete(instance)
        await self.db.flush()

    async def count(self, **filters: Any) -> int:
        """Count records matching optional equality filters."""
        stmt = select(func.count()).select_from(self.model)
        for field, value in filters.items():
            column = getattr(self.model, field, None)
            if column is not None and value is not None:
                stmt = stmt.where(column == value)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def exists(self, **filters: Any) -> bool:
        """Return True if at least one record matches the given filters."""
        count = await self.count(**filters)
        return count > 0
