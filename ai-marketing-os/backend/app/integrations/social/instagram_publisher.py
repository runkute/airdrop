import asyncio
from typing import List, Optional

import httpx

from app.core.logging import get_logger
from app.integrations.social.base import BaseSocialPublisher, PublishResult

log = get_logger(__name__)

GRAPH_API_VERSION = "v20.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

# Maximum time to wait for Instagram container status (seconds)
_CONTAINER_POLL_TIMEOUT = 60
_CONTAINER_POLL_INTERVAL = 3


class InstagramPublisher(BaseSocialPublisher):
    """Publish to Instagram Business accounts via the Instagram Graph API.

    Requires an Instagram Business account connected to a Facebook Page.
    Two-step process:
      1. Create a media container.
      2. Publish the container.
    """

    platform_name = "instagram"

    async def publish(
        self,
        content: str,
        media_urls: Optional[List[str]] = None,
        instagram_account_id: str = "",
        access_token: str = "",
        **kwargs,
    ) -> PublishResult:
        if not instagram_account_id or not access_token:
            return PublishResult(
                success=False,
                external_post_id=None,
                post_url=None,
                error_message=(
                    "instagram_account_id and access_token are required."
                ),
                raw_response=None,
            )

        media_url = media_urls[0] if media_urls else None

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Step 1: Create container
                container_id = await self._create_container(
                    client, instagram_account_id, access_token, content, media_url
                )

                # Step 2: Poll until container is ready
                await self._wait_for_container(
                    client, instagram_account_id, access_token, container_id
                )

                # Step 3: Publish container
                return await self._publish_container(
                    client, instagram_account_id, access_token, container_id
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
                    "instagram_publish_http_error",
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
                log.error("instagram_publish_error", error=str(exc))
                return PublishResult(
                    success=False,
                    external_post_id=None,
                    post_url=None,
                    error_message=str(exc),
                    raw_response=None,
                )

    async def _create_container(
        self,
        client: httpx.AsyncClient,
        ig_account_id: str,
        access_token: str,
        caption: str,
        image_url: Optional[str],
    ) -> str:
        url = f"{GRAPH_API_BASE}/{ig_account_id}/media"
        payload: dict = {
            "caption": caption,
            "access_token": access_token,
        }
        if image_url:
            payload["image_url"] = image_url
            payload["media_type"] = "IMAGE"
        else:
            # Text-only posts are not supported on Instagram; use a placeholder approach
            raise ValueError(
                "Instagram requires at least one image. "
                "Text-only posts are not supported by the Instagram Graph API."
            )

        response = await client.post(url, params=payload)
        response.raise_for_status()
        data = response.json()
        container_id = data.get("id")
        if not container_id:
            raise ValueError(f"No container ID in response: {data}")
        log.info("instagram_container_created", container_id=container_id)
        return container_id

    async def _wait_for_container(
        self,
        client: httpx.AsyncClient,
        ig_account_id: str,
        access_token: str,
        container_id: str,
    ) -> None:
        url = f"{GRAPH_API_BASE}/{container_id}"
        elapsed = 0
        while elapsed < _CONTAINER_POLL_TIMEOUT:
            response = await client.get(
                url,
                params={
                    "fields": "status_code,status",
                    "access_token": access_token,
                },
            )
            response.raise_for_status()
            data = response.json()
            status_code = data.get("status_code", "")
            if status_code == "FINISHED":
                return
            if status_code in ("ERROR", "EXPIRED"):
                raise ValueError(
                    f"Instagram container failed with status: {status_code}"
                )
            await asyncio.sleep(_CONTAINER_POLL_INTERVAL)
            elapsed += _CONTAINER_POLL_INTERVAL

        raise TimeoutError(
            f"Instagram container {container_id} did not become ready within "
            f"{_CONTAINER_POLL_TIMEOUT}s."
        )

    async def _publish_container(
        self,
        client: httpx.AsyncClient,
        ig_account_id: str,
        access_token: str,
        container_id: str,
    ) -> PublishResult:
        url = f"{GRAPH_API_BASE}/{ig_account_id}/media_publish"
        response = await client.post(
            url,
            params={
                "creation_id": container_id,
                "access_token": access_token,
            },
        )
        response.raise_for_status()
        data = response.json()
        post_id = data.get("id", "")
        post_url = (
            f"https://www.instagram.com/p/{post_id}/" if post_id else None
        )
        log.info("instagram_post_published", post_id=post_id)
        return PublishResult(
            success=True,
            external_post_id=post_id,
            post_url=post_url,
            error_message=None,
            raw_response=data,
        )

    async def verify_credentials(
        self,
        instagram_account_id: str = "",
        access_token: str = "",
        **kwargs,
    ) -> bool:
        if not instagram_account_id or not access_token:
            return False
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                url = f"{GRAPH_API_BASE}/{instagram_account_id}"
                response = await client.get(
                    url,
                    params={
                        "fields": "id,name,username",
                        "access_token": access_token,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return "id" in data
            except Exception as exc:
                log.warning("instagram_credentials_invalid", error=str(exc))
                return False
