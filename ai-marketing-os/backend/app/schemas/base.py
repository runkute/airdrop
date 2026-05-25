import math
from typing import Generic, List, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """All response schemas inherit from this to enable ORM mode."""

    model_config = ConfigDict(from_attributes=True)


T = TypeVar("T")


class PaginatedResponse(BaseSchema, Generic[T]):
    """Generic paginated list response."""

    items: List[T]
    total: int
    page: int
    per_page: int
    pages: int

    @classmethod
    def create(cls, items: List[T], total: int, page: int, per_page: int) -> "PaginatedResponse[T]":
        pages = math.ceil(total / per_page) if per_page > 0 else 0
        return cls(items=items, total=total, page=page, per_page=per_page, pages=pages)


class MessageResponse(BaseModel):
    """Simple success message response."""

    message: str


class IDResponse(BaseModel):
    """Response containing only a resource ID."""

    id: UUID
