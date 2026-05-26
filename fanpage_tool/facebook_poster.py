"""Đăng bài lên Facebook Page qua Graph API."""

import requests
from dataclasses import dataclass
from typing import Optional
from .config import PageConfig
from .content_generator import PostContent


GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


@dataclass
class PostResult:
    success: bool
    post_id: Optional[str] = None
    post_url: Optional[str] = None
    error: Optional[str] = None


def post_to_page(
    page: PageConfig,
    content: PostContent,
    link: Optional[str] = None,
    published: bool = True,
    scheduled_publish_time: Optional[int] = None,
) -> PostResult:
    """Đăng bài text lên Facebook Page."""
    url = f"{GRAPH_API_BASE}/{page.page_id}/feed"

    payload: dict = {
        "access_token": page.access_token,
        "message": content.full_text,
    }

    if link:
        payload["link"] = link

    if not published and scheduled_publish_time:
        payload["published"] = "false"
        payload["scheduled_publish_time"] = str(scheduled_publish_time)
    else:
        payload["published"] = "true"

    try:
        resp = requests.post(url, data=payload, timeout=30)
        data = resp.json()

        if resp.status_code == 200 and "id" in data:
            post_id = data["id"]
            page_name = page.page_id
            return PostResult(
                success=True,
                post_id=post_id,
                post_url=f"https://www.facebook.com/{post_id}",
            )

        error_msg = data.get("error", {}).get("message", str(data))
        return PostResult(success=False, error=error_msg)

    except requests.exceptions.RequestException as e:
        return PostResult(success=False, error=str(e))


def post_with_photo(
    page: PageConfig,
    content: PostContent,
    image_path: str,
) -> PostResult:
    """Đăng bài kèm ảnh lên Facebook Page."""
    url = f"{GRAPH_API_BASE}/{page.page_id}/photos"

    try:
        with open(image_path, "rb") as img_file:
            resp = requests.post(
                url,
                data={
                    "access_token": page.access_token,
                    "caption": content.full_text,
                    "published": "true",
                },
                files={"source": img_file},
                timeout=60,
            )

        data = resp.json()
        if resp.status_code == 200 and "id" in data:
            post_id = data["id"]
            return PostResult(
                success=True,
                post_id=post_id,
                post_url=f"https://www.facebook.com/{post_id}",
            )

        error_msg = data.get("error", {}).get("message", str(data))
        return PostResult(success=False, error=error_msg)

    except (requests.exceptions.RequestException, IOError) as e:
        return PostResult(success=False, error=str(e))


def get_page_info(page: PageConfig) -> dict:
    """Lấy thông tin cơ bản của Page."""
    url = f"{GRAPH_API_BASE}/{page.page_id}"
    params = {
        "fields": "name,fan_count,followers_count,about",
        "access_token": page.access_token,
    }
    resp = requests.get(url, params=params, timeout=10)
    return resp.json()


def verify_token(page: PageConfig) -> bool:
    """Kiểm tra access token còn hợp lệ không."""
    info = get_page_info(page)
    return "error" not in info
