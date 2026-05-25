import time
import uuid
from typing import Optional

import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import get_logger
from app.integrations.ai.base import AIResponse, BaseAIProvider

log = get_logger(__name__)

# Cost per 1M tokens (input, output) in USD
# Gemini 1.5 Pro: $1.25/$5 under 128k, $3.5/$10.5 over 128k
# Gemini 1.5 Flash: $0.075/$0.30 under 128k
# Gemini 1.0 Pro: $0.5/$1.5
_COST_TABLE: dict[str, tuple[float, float]] = {
    "gemini-1.5-pro": (1.25, 5.0),       # standard (under 128k)
    "gemini-1.5-flash": (0.075, 0.30),
    "gemini-1.0-pro": (0.5, 1.5),
    "gemini-pro": (0.5, 1.5),
}
_DEFAULT_COST = (1.25, 5.0)

# Token threshold above which Gemini 1.5 Pro uses higher pricing
_GEMINI_PRO_THRESHOLD = 128_000
_GEMINI_PRO_HIGH_COST = (3.5, 10.5)


def _resolve_cost_key(model: str) -> str:
    for known in _COST_TABLE:
        if model.startswith(known):
            return known
    return model


class GeminiProvider(BaseAIProvider):
    """Google Gemini generative AI provider (sync SDK wrapped in thread executor)."""

    provider_name = "google"

    def __init__(self) -> None:
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        self._default_model = settings.GOOGLE_DEFAULT_MODEL

    def calculate_cost(
        self, prompt_tokens: int, completion_tokens: int, model: str
    ) -> float:
        key = _resolve_cost_key(model)
        # Gemini 1.5 Pro has tiered pricing
        if key == "gemini-1.5-pro" and prompt_tokens > _GEMINI_PRO_THRESHOLD:
            input_cost_per_m, output_cost_per_m = _GEMINI_PRO_HIGH_COST
        else:
            input_cost_per_m, output_cost_per_m = _COST_TABLE.get(key, _DEFAULT_COST)
        return (
            prompt_tokens * input_cost_per_m + completion_tokens * output_cost_per_m
        ) / 1_000_000

    def _build_model(self, model_name: str, system_prompt: str) -> genai.GenerativeModel:
        return genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_prompt,
        )

    @retry(
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
        import asyncio

        resolved_model = model or self._default_model
        start = time.perf_counter()

        generation_config = genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )

        try:
            gemini_model = self._build_model(resolved_model, system_prompt)
            # The google-generativeai SDK uses blocking I/O; run in executor to avoid blocking event loop
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: gemini_model.generate_content(
                    user_prompt,
                    generation_config=generation_config,
                ),
            )
        except Exception as exc:
            log.error("gemini_api_error", error=str(exc), model=resolved_model)
            raise

        elapsed = self._elapsed_ms(start)

        content_text = ""
        try:
            content_text = response.text
        except Exception:
            if response.parts:
                content_text = "".join(
                    part.text for part in response.parts if hasattr(part, "text")
                )

        # Extract token usage from response metadata
        prompt_tokens = 0
        completion_tokens = 0
        try:
            usage = response.usage_metadata
            if usage:
                prompt_tokens = usage.prompt_token_count or 0
                completion_tokens = usage.candidates_token_count or 0
        except Exception:
            pass

        cost = self.calculate_cost(prompt_tokens, completion_tokens, resolved_model)
        request_id = str(uuid.uuid4())

        log.info(
            "gemini_generation_complete",
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
        )

    async def is_available(self) -> bool:
        try:
            import asyncio
            loop = asyncio.get_running_loop()
            models = await loop.run_in_executor(None, lambda: list(genai.list_models()))
            return len(models) > 0
        except Exception as exc:
            log.warning("gemini_availability_check_failed", error=str(exc))
            return False
