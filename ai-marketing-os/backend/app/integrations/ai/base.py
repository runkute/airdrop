from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
import time


@dataclass
class AIResponse:
    """Normalised response from any AI provider."""

    content: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    duration_ms: int
    request_id: str
    raw_response: Optional[dict] = field(default=None, repr=False)


class BaseAIProvider(ABC):
    """Abstract base class that every AI provider adapter must implement."""

    provider_name: str = ""

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 2000,
        temperature: float = 0.7,
    ) -> AIResponse:
        """Call the provider's completion API and return a normalised AIResponse."""
        ...

    @abstractmethod
    def calculate_cost(
        self, prompt_tokens: int, completion_tokens: int, model: str
    ) -> float:
        """Return the estimated cost in USD for the given token usage."""
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        """Return True when the provider's API is reachable and the key is valid."""
        ...

    @staticmethod
    def _elapsed_ms(start: float) -> int:
        """Helper – returns wall-clock milliseconds since *start* (from time.perf_counter())."""
        return int((time.perf_counter() - start) * 1000)
