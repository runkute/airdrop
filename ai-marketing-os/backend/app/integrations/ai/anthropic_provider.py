import time
import uuid
from typing import Optional

import anthropic
from anthropic import AsyncAnthropic
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings
from app.core.logging import get_logger
from app.integrations.ai.base import AIResponse, BaseAIProvider

log = get_logger(__name__)

# Cost per 1M tokens (input, output) in USD
_COST_TABLE: dict[str, tuple[float, float]] = {
    "claude-3-5-sonnet": (3.0, 15.0),
    "claude-3-5-haiku": (0.80, 4.0),
    "claude-3-opus": (15.0, 75.0),
    "claude-3-sonnet": (3.0, 15.0),
    "claude-3-haiku": (0.25, 1.25),
    "claude-2": (8.0, 24.0),
}
_DEFAULT_COST = (3.0, 15.0)


def _resolve_cost_key(model: str) -> str:
    for known in _COST_TABLE:
        if model.startswith(known):
            return known
    return model


class AnthropicProvider(BaseAIProvider):
    """Async Anthropic messages provider."""

    provider_name = "anthropic"

    def __init__(self) -> None:
        self._client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._default_model = settings.ANTHROPIC_DEFAULT_MODEL

    def calculate_cost(
        self, prompt_tokens: int, completion_tokens: int, model: str
    ) -> float:
        key = _resolve_cost_key(model)
        input_cost_per_m, output_cost_per_m = _COST_TABLE.get(key, _DEFAULT_COST)
        return (
            prompt_tokens * input_cost_per_m + completion_tokens * output_cost_per_m
        ) / 1_000_000

    @retry(
        retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APIConnectionError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        reraise=True,
    )
    async def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        max_tokens: int = 2000,
        temperature: float = 0.7,
    ) -> AIResponse:
        resolved_model = model or self._default_model
        start = time.perf_counter()
        try:
            response = await self._client.messages.create(
                model=resolved_model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
        except anthropic.APIError as exc:
            log.error("anthropic_api_error", error=str(exc), model=resolved_model)
            raise

        elapsed = self._elapsed_ms(start)
        content_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                content_text += block.text

        usage = response.usage
        prompt_tokens = usage.input_tokens if usage else 0
        completion_tokens = usage.output_tokens if usage else 0
        cost = self.calculate_cost(prompt_tokens, completion_tokens, resolved_model)
        request_id = response.id or str(uuid.uuid4())

        log.info(
            "anthropic_generation_complete",
            model=resolved_model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=cost,
            duration_ms=elapsed,
        )

        return AIResponse(
            content=content_text,
            provider=self.provider_name,
            model=resolved_model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost_usd=cost,
            duration_ms=elapsed,
            request_id=request_id,
            raw_response={
                "id": response.id,
                "model": response.model,
                "stop_reason": response.stop_reason,
            },
        )

    async def is_available(self) -> bool:
        try:
            # Minimal call to check connectivity
            await self._client.messages.create(
                model=self._default_model,
                max_tokens=1,
                messages=[{"role": "user", "content": "ping"}],
            )
            return True
        except anthropic.AuthenticationError:
            return False
        except Exception as exc:
            log.warning("anthropic_availability_check_failed", error=str(exc))
            return False
