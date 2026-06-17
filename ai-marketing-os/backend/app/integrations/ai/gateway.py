from typing import Dict, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.integrations.ai.base import AIResponse, BaseAIProvider

log = get_logger(__name__)

# Routing: content_type -> preferred provider name
CONTENT_TYPE_ROUTING: Dict[str, str] = {
    "seo_article": "anthropic",    # Claude for long-form SEO content
    "ad_copy": "openai",           # GPT-4o for ad copy
    "hashtags": "openai",
    "reel_script": "openai",
    "email": "anthropic",
    "social_post": "openai",
}

# Special routing for research/trend tasks
SPECIAL_ROUTING: Dict[str, str] = {
    "trend_analysis": "grok",
    "research": "google",
}

# Fallback chain when preferred provider is unavailable
FALLBACK_CHAIN = ["anthropic", "openai", "google", "grok"]


class AIGateway:
    """Unified AI gateway that routes requests to the appropriate provider."""

    def __init__(self) -> None:
        self._providers: Dict[str, BaseAIProvider] = {}
        self._initialize_providers()

    def _initialize_providers(self) -> None:
        """Initialise each provider whose API key is configured."""
        from app.integrations.ai.openai_provider import OpenAIProvider
        from app.integrations.ai.anthropic_provider import AnthropicProvider
        from app.integrations.ai.gemini_provider import GeminiProvider
        from app.integrations.ai.grok_provider import GrokProvider

        if settings.OPENAI_API_KEY:
            try:
                self._providers["openai"] = OpenAIProvider()
                log.info("ai_provider_initialized", provider="openai")
            except Exception as exc:
                log.warning("ai_provider_init_failed", provider="openai", error=str(exc))

        if settings.ANTHROPIC_API_KEY:
            try:
                self._providers["anthropic"] = AnthropicProvider()
                log.info("ai_provider_initialized", provider="anthropic")
            except Exception as exc:
                log.warning("ai_provider_init_failed", provider="anthropic", error=str(exc))

        if settings.GOOGLE_API_KEY:
            try:
                self._providers["google"] = GeminiProvider()
                log.info("ai_provider_initialized", provider="google")
            except Exception as exc:
                log.warning("ai_provider_init_failed", provider="google", error=str(exc))

        if settings.GROK_API_KEY:
            try:
                self._providers["grok"] = GrokProvider()
                log.info("ai_provider_initialized", provider="grok")
            except Exception as exc:
                log.warning("ai_provider_init_failed", provider="grok", error=str(exc))

        if not self._providers:
            log.warning("no_ai_providers_configured")

    def get_provider_for_content_type(
        self, content_type: str, preferred: Optional[str] = None
    ) -> str:
        """Return the provider name to use for a given content type.

        Priority:
        1. Explicitly requested *preferred* provider (if available).
        2. Content-type routing table.
        3. Fallback chain.
        """
        if preferred and preferred in self._providers:
            return preferred

        routing = CONTENT_TYPE_ROUTING.get(content_type) or SPECIAL_ROUTING.get(content_type)
        if routing and routing in self._providers:
            return routing

        for fallback in FALLBACK_CHAIN:
            if fallback in self._providers:
                return fallback

        raise ValueError(
            "No AI providers are configured. Set at least one provider API key."
        )

    def get_provider(self, name: str) -> BaseAIProvider:
        provider = self._providers.get(name)
        if provider is None:
            raise ValueError(f"AI provider '{name}' is not configured or unavailable.")
        return provider

    async def generate(
        self,
        user_prompt: str,
        system_prompt: str,
        content_type: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        fallback: bool = True,
    ) -> AIResponse:
        """Generate content, optionally falling back to other providers on error."""
        provider_name = self.get_provider_for_content_type(content_type, provider)
        provider_instance = self._providers[provider_name]

        try:
            return await provider_instance.generate(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except Exception as primary_exc:
            log.warning(
                "ai_primary_provider_failed",
                provider=provider_name,
                error=str(primary_exc),
                fallback_enabled=fallback,
            )
            if not fallback:
                raise

            # Try remaining providers in fallback order
            for fallback_name in FALLBACK_CHAIN:
                if fallback_name == provider_name:
                    continue
                fallback_instance = self._providers.get(fallback_name)
                if fallback_instance is None:
                    continue
                try:
                    log.info("ai_fallback_attempt", provider=fallback_name)
                    return await fallback_instance.generate(
                        system_prompt=system_prompt,
                        user_prompt=user_prompt,
                        model=None,
                        max_tokens=max_tokens,
                        temperature=temperature,
                    )
                except Exception as fallback_exc:
                    log.warning(
                        "ai_fallback_failed",
                        provider=fallback_name,
                        error=str(fallback_exc),
                    )
                    continue

            # All providers failed – re-raise original error
            raise primary_exc

    async def get_providers_status(self) -> Dict[str, bool]:
        """Return availability status for every configured provider."""
        statuses: Dict[str, bool] = {}
        for name, provider in self._providers.items():
            try:
                statuses[name] = await provider.is_available()
            except Exception:
                statuses[name] = False
        return statuses

    @property
    def available_providers(self) -> list[str]:
        return list(self._providers.keys())


# Module-level singleton
ai_gateway = AIGateway()
