from typing import List, Optional

import httpx

from app.core.logging import get_logger
from app.integrations.social.base import BaseSocialPublisher, PublishResult

log = get_logger(__name__)

GRAPH_API_VERSION = "v20.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class FacebookPublisher(BaseSocialPublisher):
    """Publish to Facebook Pages via the Graph API."""

    platform_name = "facebook"

    async def publish(
        self,
        content: str,
        media_urls: Optional[List[str]] = None,
        page_id: str = "",
        page_access_token: str = "",
        **kwargs,
    ) -> PublishResult:
        if not page_id or not page_access_token:
            return PublishResult(
                success=False,
                external_post_id=None,
                post_url=None,
                error_message="page_id and page_access_token are required for Facebook publishing.",
                raw_response=None,
            )

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                if media_urls:
                    return await self._publish_photo(
                        client, content, media_urls[0], page_id, page_access_token
                    )
                else:
                    return await self._publish_text(
                        client, content, page_id, page_access_token
                    )
            except httpx.HTTPStatusError as exc:
                error_body = {}
                try:
                    error_body = exc.response.json()
                except Exception:
                    pass
                error_msg = (
                    error_body.get("error", {}).get("message", str(exc))
                    if error_body
                    else str(exc)
                )
                log.error(
                    "facebook_publish_http_error",
                    status_code=exc.response.status_code,
                    error=error_msg,
                )
                return PublishResult(
                    success=False,
                    external_post_id=None,
                    post_url=None,
                    error_message=error_msg,
                    raw_response=error_body,
                )
            except Exception as exc:
                log.error("facebook_publish_error", error=str(exc))
                return PublishResult(
                    success=False,
                    external_post_id=None,
                    post_url=None,
                    error_message=str(exc),
                    raw_response=None,
                )

    async def _publish_text(
        self,
        client: httpx.AsyncClient,
        content: str,
        page_id: str,
        page_access_token: str,
    ) -> PublishResult:
        url = f"{GRAPH_API_BASE}/{page_id}/feed"
        response = await client.post(
            url,
            params={"access_token": page_access_token},
            json={"message": content},
        )
        response.raise_for_status()
        data = response.json()
        post_id = data.get("id", "")
        post_url = f"https://www.facebook.com/{post_id}" if post_id else None
        log.info("facebook_post_published", post_id=post_id)
        return PublishResult(
            success=True,
            external_post_id=post_id,
            post_url=post_url,
            error_message=None,
            raw_response=data,
        )

    async def _publish_photo(
        self,
        client: httpx.AsyncClient,
        caption: str,
        photo_url: str,
        page_id: str,
        page_access_token: str,
    ) -> PublishResult:
        url = f"{GRAPH_API_BASE}/{page_id}/photos"
        response = await client.post(
            url,
            params={"access_token": page_access_token},
            json={"url": photo_url, "caption": caption, "published": True},
        )
        response.raise_for_status()
        data = response.json()
        post_id = data.get("post_id") or data.get("id", "")
        post_url = f"https://www.facebook.com/{post_id}" if post_id else None
        log.info("facebook_photo_published", post_id=post_id)
        return PublishResult(
            success=True,
            external_post_id=post_id,
            post_url=post_url,
            error_message=None,
            raw_response=data,
        )

    async def verify_credentials(
        self,
        page_access_token: str = "",
        page_id: str = "",
        **kwargs,
    ) -> bool:
        if not page_access_token:
            return False
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                url = f"{GRAPH_API_BASE}/me"
                response = await client.get(
                    url,
                    params={"access_token": page_access_token, "fields": "id,name"},
                )
                response.raise_for_status()
                data = response.json()
                return "id" in data
            except Exception as exc:
                log.warning("facebook_credentials_invalid", error=str(exc))
                return False
