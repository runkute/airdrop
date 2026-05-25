from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class PublishResult:
    """Normalised result from a social publishing operation."""

    success: bool
    external_post_id: Optional[str]
    post_url: Optional[str]
    error_message: Optional[str]
    raw_response: Optional[dict]


class BaseSocialPublisher(ABC):
    """Abstract base class for social media publishing adapters."""

    platform_name: str = ""

    @abstractmethod
    async def publish(
        self,
        content: str,
        media_urls: Optional[List[str]] = None,
        **kwargs,
    ) -> PublishResult:
        """Publish content to the platform and return a normalised PublishResult."""
        ...

    @abstractmethod
    async def verify_credentials(self, **kwargs) -> bool:
        """Validate that the provided credentials are functional."""
        ...
