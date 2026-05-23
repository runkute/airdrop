"""Quản lý cấu hình cho fanpage tool."""

import os
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


@dataclass
class PageConfig:
    name: str
    page_id: str
    access_token: str


@dataclass
class AppConfig:
    anthropic_api_key: str
    pages: list[PageConfig] = field(default_factory=list)
    default_model: str = "claude-sonnet-4-6"
    default_language: str = "vi"
    max_post_length: int = 2000


def load_config() -> AppConfig:
    """Đọc cấu hình từ biến môi trường."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY chưa được thiết lập trong file .env")

    pages: list[PageConfig] = []

    # Quét tất cả env vars có dạng PAGE_TOKEN_<NAME>
    for key, token in os.environ.items():
        if key.startswith("PAGE_TOKEN_"):
            page_name = key[len("PAGE_TOKEN_"):]
            page_id = os.getenv(f"PAGE_ID_{page_name}")
            if page_id and token:
                pages.append(PageConfig(
                    name=page_name,
                    page_id=page_id,
                    access_token=token,
                ))

    return AppConfig(
        anthropic_api_key=api_key,
        pages=pages,
        default_model=os.getenv("AI_MODEL", "claude-sonnet-4-6"),
        default_language=os.getenv("DEFAULT_LANGUAGE", "vi"),
    )


def get_page(config: AppConfig, page_name: str) -> Optional[PageConfig]:
    """Tìm page theo tên (không phân biệt hoa thường)."""
    page_name_upper = page_name.upper()
    for page in config.pages:
        if page.name.upper() == page_name_upper:
            return page
    return None
