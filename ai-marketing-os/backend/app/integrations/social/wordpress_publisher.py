import base64
from typing import List, Optional

import httpx

from app.core.logging import get_logger
from app.integrations.social.base import BaseSocialPublisher, PublishResult

log = get_logger(__name__)


class WordPressPublisher(BaseSocialPublisher):
    """Publish posts to WordPress via the REST API.

    Supports Basic Authentication using Application Passwords
    (WordPress 5.6+) or standard username/password.
    """

    platform_name = "wordpress"

    def _build_auth_header(self, username: str, password: str) -> str:
        credentials = f"{username}:{password}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    async def publish(
        self,
        content: str,
        media_urls: Optional[List[str]] = None,
        title: str = "New Post",
        wordpress_url: str = "",
        username: str = "",
        password: str = "",
        status: str = "publish",
        categories: Optional[List[int]] = None,
        tags: Optional[List[int]] = None,
        excerpt: str = "",
        **kwargs,
    ) -> PublishResult:
        if not wordpress_url or not username or not password:
            return PublishResult(
                success=False,
                external_post_id=None,
                post_url=None,
                error_message=(
                    "wordpress_url, username, and password are required."
                ),
                raw_response=None,
            )

        # Ensure URL doesn't end with slash
        base_url = wordpress_url.rstrip("/")
        api_url = f"{base_url}/wp-json/wp/v2/posts"

        payload: dict = {
            "title": title,
            "content": content,
            "status": status,
            "excerpt": excerpt,
        }
        if categories:
            payload["categories"] = categories
        if tags:
            payload["tags"] = tags

        # Handle featured image upload if media_urls provided
        featured_media_id = None
        if media_urls:
            featured_media_id = await self._upload_media(
                media_urls[0], base_url, username, password
            )
            if featured_media_id:
                payload["featured_media"] = featured_media_id

        headers = {
            "Authorization": self._build_auth_header(username, password),
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(api_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                post_id = str(data.get("id", ""))
                post_url = data.get("link") or data.get("guid", {}).get("rendered")
                log.info(
                    "wordpress_post_published",
                    post_id=post_id,
                    post_url=post_url,
                )
                return PublishResult(
                    success=True,
                    external_post_id=post_id,
                    post_url=post_url,
                    error_message=None,
                    raw_response=data,
                )
            except httpx.HTTPStatusError as exc:
                error_body = {}
                try:
                    error_body = exc.response.json()
                except Exception:
                    pass
                error_msg = error_body.get("message", str(exc)) if error_body else str(exc)
                log.error(
                    "wordpress_publish_http_error",
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
                log.error("wordpress_publish_error", error=str(exc))
                return PublishResult(
                    success=False,
                    external_post_id=None,
                    post_url=None,
                    error_message=str(exc),
                    raw_response=None,
                )

    async def _upload_media(
        self, media_url: str, base_url: str, username: str, password: str
    ) -> Optional[int]:
        """Download a remote image and upload it to the WordPress media library."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Download the image
                img_response = await client.get(media_url)
                img_response.raise_for_status()
                image_data = img_response.content
                content_type = img_response.headers.get("Content-Type", "image/jpeg")
                filename = media_url.split("/")[-1].split("?")[0] or "image.jpg"

                # Upload to WordPress media library
                media_url_wp = f"{base_url}/wp-json/wp/v2/media"
                headers = {
                    "Authorization": self._build_auth_header(username, password),
                    "Content-Disposition": f'attachment; filename="{filename}"',
                    "Content-Type": content_type,
                }
                upload_response = await client.post(
                    media_url_wp, content=image_data, headers=headers
                )
                upload_response.raise_for_status()
                media_data = upload_response.json()
                return media_data.get("id")
        except Exception as exc:
            log.warning("wordpress_media_upload_failed", error=str(exc))
            return None

    async def verify_credentials(
        self,
        wordpress_url: str = "",
        username: str = "",
        password: str = "",
        **kwargs,
    ) -> bool:
        if not wordpress_url or not username or not password:
            return False
        base_url = wordpress_url.rstrip("/")
        api_url = f"{base_url}/wp-json/wp/v2/users/me"
        headers = {"Authorization": self._build_auth_header(username, password)}
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(api_url, headers=headers)
                response.raise_for_status()
                data = response.json()
                return "id" in data
            except Exception as exc:
                log.warning("wordpress_credentials_invalid", error=str(exc))
                return False
