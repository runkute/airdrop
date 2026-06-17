import time
import uuid
from typing import Optional

import openai
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.core.config import settings
from app.core.logging import get_logger
from app.integrations.ai.base import AIResponse, BaseAIProvider

log = get_logger(__name__)

# Cost per 1M tokens (input, output) in USD
_COST_TABLE: dict[str, tuple[float, float]] = {
    "grok-beta": (5.0, 15.0),
    "grok-2": (2.0, 10.0),
    "grok-2-mini": (0.2, 0.4),
}
_DEFAULT_COST = (5.0, 15.0)


def _resolve_cost_key(model: str) -> str:
    for known in _COST_TABLE:
        if model.startswith(known):
            return known
    return model


class GrokProvider(BaseAIProvider):
    """xAI Grok provider using the OpenAI-compatible API."""

    provider_name = "grok"

    def __init__(self) -> None:
        self._client = AsyncOpenAI(
            api_key=settings.GROK_API_KEY,
            base_url=settings.GROK_BASE_URL,
        )
        self._default_model = settings.GROK_DEFAULT_MODEL

    def calculate_cost(
        self, prompt_tokens: int, completion_tokens: int, model: str
    ) -> float:
        key = _resolve_cost_key(model)
        input_cost_per_m, output_cost_per_m = _COST_TABLE.get(key, _DEFAULT_COST)
        return (
            prompt_tokens * input_cost_per_m + completion_tokens * output_cost_per_m
        ) / 1_000_000

    @retry(
        retry=retry_if_exception_type((openai.RateLimitError, openai.APIConnectionError)),
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
            response = await self._client.chat.completions.create(
                model=resolved_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except openai.APIError as exc:
            log.error("grok_api_error", error=str(exc), model=resolved_model)
            raise

        elapsed = self._elapsed_ms(start)
        choice = response.choices[0]
        usage = response.usage
        prompt_tokens = usage.prompt_tokens if usage else 0
        completion_tokens = usage.completion_tokens if usage else 0
        cost = self.calculate_cost(prompt_tokens, completion_tokens, resolved_model)
        request_id = response.id or str(uuid.uuid4())

        log.info(
            "grok_generation_complete",
            model=resolved_model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost_usd=cost,
            duration_ms=elapsed,
        )

        return AIResponse(
            content=choice.message.content or "",
            provider=self.provider_name,
            model=resolved_model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            cost_usd=cost,
            duration_ms=elapsed,
            request_id=request_id,
            raw_response=response.model_dump(),
        )

    async def is_available(self) -> bool:
        try:
            models = await self._client.models.list()
            return len(list(models)) > 0
        except Exception as exc:
            log.warning("grok_availability_check_failed", error=str(exc))
            return False
