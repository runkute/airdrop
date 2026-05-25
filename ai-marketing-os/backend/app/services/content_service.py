from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.integrations.ai.gateway import AIGateway
from app.models.brand_voice import BrandVoice
from app.models.content import ContentPost, PublishingLog
from app.repositories.ai_usage_repository import AIUsageRepository
from app.repositories.brand_voice_repository import BrandVoiceRepository
from app.repositories.content_repository import ContentRepository
from app.schemas.content import ContentGenerationRequest

log = get_logger(__name__)


class ContentService:
    """Core content generation and management service."""

    PLATFORM_LIMITS: Dict[str, int] = {
        "twitter": 280,
        "instagram": 2200,
        "facebook": 63206,
        "linkedin": 3000,
        "tiktok": 2200,
        "youtube": 5000,
    }

    SYSTEM_PROMPTS: Dict[str, str] = {
        "social_post": (
            "You are an expert social media copywriter. Create engaging, "
            "platform-optimized social media posts that drive engagement and action. "
            "Follow the brand voice guidelines exactly. Be concise, punchy, and scroll-stopping."
        ),
        "seo_article": (
            "You are an expert SEO content writer. Create comprehensive, search-optimized "
            "articles with proper heading structure (H1, H2, H3), strategic keyword placement, "
            "engaging introductions, and clear conclusions. Include a suggested meta description "
            "at the top wrapped in [META: ...]. Focus on E-E-A-T signals."
        ),
        "ad_copy": (
            "You are an expert direct response copywriter specializing in paid advertising. "
            "Create compelling ad copy with attention-grabbing headlines, benefits-focused body "
            "copy, strong social proof, objection handling, and powerful CTAs that convert. "
            "Structure: Headline | Body | CTA."
        ),
        "reel_script": (
            "You are an expert video script writer for social media short-form content. "
            "Create engaging, punchy scripts with a powerful hook in the first 3 seconds, "
            "value delivery in the middle, and a clear CTA at the end. "
            "Format as: [HOOK] [BODY] [CTA]. Include suggested B-roll notes in brackets."
        ),
        "hashtags": (
            "You are a social media hashtag strategist. Generate optimized hashtag sets "
            "that maximize reach, relevance, and discoverability. "
            "Mix popular, mid-range, and niche hashtags. "
            "Group them as: #Popular (1-3) #MidRange (5-8) #Niche (3-5). "
            "Output only the hashtags, no explanations."
        ),
        "email": (
            "You are an expert email copywriter specializing in conversion-focused campaigns. "
            "Create compelling email content with: Subject Line (< 50 chars), "
            "Preview Text (< 100 chars), and Body Copy. "
            "Focus on value, urgency, and personalization. "
            "Format: [SUBJECT: ...] [PREVIEW: ...] [BODY: ...]"
        ),
    }

    def __init__(
        self,
        content_repo: ContentRepository,
        brand_voice_repo: BrandVoiceRepository,
        ai_usage_repo: AIUsageRepository,
        gateway: AIGateway,
    ) -> None:
        self.content_repo = content_repo
        self.brand_voice_repo = brand_voice_repo
        self.ai_usage_repo = ai_usage_repo
        self.gateway = gateway

    async def generate_content(
        self,
        workspace_id: UUID,
        user_id: UUID,
        request: ContentGenerationRequest,
    ) -> Tuple[ContentPost, Dict[str, Any]]:
        """Generate content with AI, save it, log usage, and return the post + stats."""
        # 1. Load brand voice if specified
        brand_voice: Optional[BrandVoice] = None
        if request.brand_voice_id:
            brand_voice = await self.brand_voice_repo.get_by_id(request.brand_voice_id)
            if brand_voice is None or brand_voice.workspace_id != workspace_id:
                raise NotFoundError(message=f"Brand voice {request.brand_voice_id} not found.")

        # 2. Build prompts
        system_prompt = self._build_system_prompt(request.content_type, brand_voice)
        user_prompt = self._build_user_prompt(request, brand_voice)

        # 3. Call AI gateway
        ai_response = await self.gateway.generate(
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            content_type=request.content_type,
            provider=request.ai_provider,
            model=request.ai_model,
            max_tokens=self._get_max_tokens(request),
            temperature=0.7,
        )

        # 4. Post-process content
        content_text = self._post_process(
            ai_response.content, request.content_type, request.platform
        )

        # 5. Build title
        title = self._build_title(request)

        # 6. Compute word/char counts
        word_count = len(content_text.split())
        char_count = len(content_text)

        # 7. Save ContentPost
        post = ContentPost(
            workspace_id=workspace_id,
            user_id=user_id,
            brand_voice_id=request.brand_voice_id,
            title=title,
            content=content_text,
            content_type=request.content_type,
            platform=request.platform,
            status="draft",
            ai_provider=ai_response.provider,
            ai_model=ai_response.model,
            generation_prompt=user_prompt,
            word_count=word_count,
            character_count=char_count,
            tags=request.keywords or [],
            metadata_={
                "topic": request.topic,
                "target_audience": request.target_audience,
                "cta": request.cta,
                "ai_request_id": ai_response.request_id,
                "duration_ms": ai_response.duration_ms,
            },
        )
        self.content_repo.db.add(post)
        await self.content_repo.db.flush()
        await self.content_repo.db.refresh(post)

        # 8. Log AI usage
        await self.ai_usage_repo.log_usage(
            workspace_id=workspace_id,
            user_id=user_id,
            content_post_id=post.id,
            provider=ai_response.provider,
            model=ai_response.model,
            prompt_tokens=ai_response.prompt_tokens,
            completion_tokens=ai_response.completion_tokens,
            cost_usd=Decimal(str(round(ai_response.cost_usd, 6))),
            content_type=request.content_type,
            request_id=ai_response.request_id,
            duration_ms=ai_response.duration_ms,
        )

        usage_stats = {
            "provider": ai_response.provider,
            "model": ai_response.model,
            "prompt_tokens": ai_response.prompt_tokens,
            "completion_tokens": ai_response.completion_tokens,
            "total_tokens": ai_response.total_tokens,
            "cost_usd": round(ai_response.cost_usd, 6),
            "duration_ms": ai_response.duration_ms,
        }

        log.info(
            "content_generated",
            post_id=str(post.id),
            provider=ai_response.provider,
            content_type=request.content_type,
            tokens=ai_response.total_tokens,
        )
        return post, usage_stats

    async def rewrite_content(
        self,
        workspace_id: UUID,
        user_id: UUID,
        content: str,
        instructions: str,
        provider: Optional[str] = None,
        ai_model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Rewrite existing content following specific instructions."""
        system_prompt = (
            "You are an expert content editor. Rewrite the provided content according "
            "to the given instructions. Preserve the original intent and key information "
            "unless explicitly told to change them."
        )
        user_prompt = (
            f"Instructions: {instructions}\n\n"
            f"Original Content:\n{content}\n\n"
            "Rewritten Content:"
        )

        ai_response = await self.gateway.generate(
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            content_type="social_post",  # generic routing
            provider=provider,
            model=ai_model,
            max_tokens=4000,
            temperature=0.6,
        )

        await self.ai_usage_repo.log_usage(
            workspace_id=workspace_id,
            user_id=user_id,
            provider=ai_response.provider,
            model=ai_response.model,
            prompt_tokens=ai_response.prompt_tokens,
            completion_tokens=ai_response.completion_tokens,
            cost_usd=Decimal(str(round(ai_response.cost_usd, 6))),
            content_type="rewrite",
            request_id=ai_response.request_id,
            duration_ms=ai_response.duration_ms,
        )

        return {
            "content": ai_response.content,
            "provider": ai_response.provider,
            "model": ai_response.model,
            "total_tokens": ai_response.total_tokens,
            "cost_usd": round(ai_response.cost_usd, 6),
        }

    async def summarize_content(
        self,
        workspace_id: UUID,
        user_id: UUID,
        content: str,
        max_length: int = 150,
        provider: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Summarize content to a target length."""
        system_prompt = (
            "You are an expert content summarizer. Create concise, accurate summaries "
            "that capture the key points of the original content."
        )
        user_prompt = (
            f"Summarize the following content in approximately {max_length} words. "
            f"Focus on the most important points.\n\nContent:\n{content}\n\nSummary:"
        )

        ai_response = await self.gateway.generate(
            user_prompt=user_prompt,
            system_prompt=system_prompt,
            content_type="seo_article",
            provider=provider,
            max_tokens=max_length * 2,
            temperature=0.4,
        )

        await self.ai_usage_repo.log_usage(
            workspace_id=workspace_id,
            user_id=user_id,
            provider=ai_response.provider,
            model=ai_response.model,
            prompt_tokens=ai_response.prompt_tokens,
            completion_tokens=ai_response.completion_tokens,
            cost_usd=Decimal(str(round(ai_response.cost_usd, 6))),
            content_type="summarize",
            request_id=ai_response.request_id,
            duration_ms=ai_response.duration_ms,
        )

        return {
            "summary": ai_response.content,
            "provider": ai_response.provider,
            "model": ai_response.model,
            "total_tokens": ai_response.total_tokens,
            "cost_usd": round(ai_response.cost_usd, 6),
        }

    async def list_posts(
        self,
        workspace_id: UUID,
        status: Optional[str] = None,
        content_type: Optional[str] = None,
        platform: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> Tuple[List[ContentPost], int]:
        """Return a filtered, paginated list of content posts."""
        posts = await self.content_repo.get_workspace_posts(
            workspace_id=workspace_id,
            status=status,
            content_type=content_type,
            platform=platform,
            skip=skip,
            limit=limit,
        )
        # Count total matching posts
        from sqlalchemy import func, select
        from app.models.content import ContentPost as CP
        conditions = [CP.workspace_id == workspace_id]
        if status:
            conditions.append(CP.status == status)
        if content_type:
            conditions.append(CP.content_type == content_type)
        if platform:
            conditions.append(CP.platform == platform)

        from sqlalchemy import and_
        count_result = await self.content_repo.db.execute(
            select(func.count()).select_from(CP).where(and_(*conditions))
        )
        total = count_result.scalar_one()
        return posts, total

    async def get_post(self, post_id: UUID, workspace_id: UUID) -> ContentPost:
        """Get a single post by ID within a workspace."""
        from sqlalchemy import select
        result = await self.content_repo.db.execute(
            select(ContentPost).where(
                ContentPost.id == post_id,
                ContentPost.workspace_id == workspace_id,
            )
        )
        post = result.scalar_one_or_none()
        if post is None:
            raise NotFoundError(message=f"Content post {post_id} not found.")
        return post

    async def update_post(
        self,
        post_id: UUID,
        workspace_id: UUID,
        data: dict,
    ) -> ContentPost:
        """Update a content post."""
        post = await self.get_post(post_id, workspace_id)
        for key, value in data.items():
            if value is not None:
                # Handle metadata_ field name mapping
                if key == "metadata":
                    setattr(post, "metadata_", value)
                else:
                    setattr(post, key, value)
        if data.get("content"):
            post.word_count = len(post.content.split())
            post.character_count = len(post.content)
        await self.content_repo.db.flush()
        await self.content_repo.db.refresh(post)
        return post

    async def delete_post(self, post_id: UUID, workspace_id: UUID) -> None:
        """Delete a content post."""
        post = await self.get_post(post_id, workspace_id)
        await self.content_repo.db.delete(post)
        await self.content_repo.db.flush()

    async def schedule_post(
        self,
        post_id: UUID,
        workspace_id: UUID,
        scheduled_at: datetime,
    ) -> ContentPost:
        """Schedule a content post for publishing at a future time."""
        now = datetime.now(timezone.utc)
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        if scheduled_at <= now:
            raise ValidationError(
                message="scheduled_at must be a future date/time."
            )

        post = await self.get_post(post_id, workspace_id)
        post.status = "scheduled"
        post.scheduled_at = scheduled_at
        await self.content_repo.db.flush()
        await self.content_repo.db.refresh(post)
        log.info(
            "post_scheduled",
            post_id=str(post_id),
            scheduled_at=scheduled_at.isoformat(),
        )
        return post

    async def get_calendar(
        self,
        workspace_id: UUID,
        date_from: datetime,
        date_to: datetime,
    ) -> List[ContentPost]:
        """Return all posts with scheduled_at in the given date range."""
        return await self.content_repo.get_calendar_posts(
            workspace_id=workspace_id,
            date_from=date_from,
            date_to=date_to,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_system_prompt(
        self, content_type: str, brand_voice: Optional[BrandVoice]
    ) -> str:
        base_prompt = self.SYSTEM_PROMPTS.get(
            content_type,
            "You are an expert content writer. Create high-quality, engaging content.",
        )
        if brand_voice is None:
            return base_prompt

        from app.services.brand_voice_service import BrandVoiceService
        voice_service = BrandVoiceService(None)  # type: ignore
        voice_prompt = voice_service.build_voice_system_prompt(brand_voice)
        return f"{base_prompt}\n\n{voice_prompt}"

    def _build_user_prompt(
        self,
        request: ContentGenerationRequest,
        brand_voice: Optional[BrandVoice] = None,
    ) -> str:
        parts = [
            f"Content Type: {request.content_type}",
            f"Platform: {request.platform}",
            f"Topic: {request.topic}",
            f"Target Audience: {request.target_audience}",
        ]

        if request.tone:
            parts.append(f"Tone: {request.tone}")

        if request.cta:
            parts.append(f"Call to Action: {request.cta}")

        if request.keywords:
            parts.append(f"Keywords to include: {', '.join(request.keywords)}")

        if request.word_count:
            parts.append(f"Target Length: approximately {request.word_count} words")

        # Platform-specific character limit guidance
        limit = self.PLATFORM_LIMITS.get(request.platform.lower())
        if limit:
            parts.append(f"Character Limit: {limit} characters maximum")

        if request.additional_context:
            parts.append(f"Additional Context: {request.additional_context}")

        parts.append("\nGenerate the content now:")
        return "\n".join(parts)

    def _build_title(self, request: ContentGenerationRequest) -> str:
        topic_words = request.topic[:60] if request.topic else request.content_type
        return f"{request.content_type.replace('_', ' ').title()}: {topic_words}"

    def _get_max_tokens(self, request: ContentGenerationRequest) -> int:
        if request.word_count:
            # Rough estimate: 1 word ≈ 1.3 tokens
            return min(int(request.word_count * 1.5) + 200, 8000)
        defaults = {
            "social_post": 500,
            "hashtags": 200,
            "ad_copy": 600,
            "reel_script": 1000,
            "email": 1500,
            "seo_article": 4000,
        }
        return defaults.get(request.content_type, 2000)

    def _post_process(
        self, content: str, content_type: str, platform: str
    ) -> str:
        """Apply platform-specific formatting and truncation."""
        # Strip leading/trailing whitespace
        content = content.strip()

        # Apply character limit for platforms that have strict limits
        limit = self.PLATFORM_LIMITS.get(platform.lower())
        if limit and content_type == "social_post" and len(content) > limit:
            # Truncate intelligently at sentence or word boundary
            truncated = content[:limit]
            last_period = truncated.rfind(".")
            last_newline = truncated.rfind("\n")
            cutoff = max(last_period, last_newline)
            if cutoff > limit * 0.7:
                content = truncated[:cutoff + 1]
            else:
                last_space = truncated.rfind(" ")
                content = truncated[:last_space] + "…" if last_space > 0 else truncated

        return content
