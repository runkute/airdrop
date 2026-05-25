from typing import Any, AsyncGenerator, Optional

import redis.asyncio as aioredis

from app.core.config import settings


# Module-level singleton – initialized lazily on first use via get_redis()
_redis_pool: Optional[aioredis.Redis] = None


def _get_pool() -> aioredis.Redis:
    """Return (or create) the shared Redis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_pool


# Convenience singleton exposed at module level
redis_client: aioredis.Redis = _get_pool()


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """FastAPI dependency that yields the shared Redis client."""
    client = _get_pool()
    try:
        yield client
    finally:
        # The pool is shared; we do NOT close it here.
        pass


async def set_with_expiry(key: str, value: Any, expiry_seconds: int) -> bool:
    """Set a key with an expiry (TTL) in seconds.  Returns True on success."""
    client = _get_pool()
    result = await client.setex(key, expiry_seconds, value)
    return bool(result)


async def get_value(key: str) -> Optional[str]:
    """Get the string value stored at *key*, or None if missing."""
    client = _get_pool()
    return await client.get(key)


async def delete_key(key: str) -> int:
    """Delete *key* and return the number of keys removed (0 or 1)."""
    client = _get_pool()
    return await client.delete(key)


async def exists(key: str) -> bool:
    """Return True if *key* exists in Redis."""
    client = _get_pool()
    count: int = await client.exists(key)
    return count > 0
