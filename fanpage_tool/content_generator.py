"""Tạo nội dung bài đăng bằng Claude AI."""

import anthropic
from dataclasses import dataclass
from typing import Optional


@dataclass
class PostContent:
    text: str
    hashtags: list[str]
    image_prompt: Optional[str] = None

    @property
    def full_text(self) -> str:
        """Trả về text + hashtags."""
        if self.hashtags:
            return f"{self.text}\n\n{' '.join(self.hashtags)}"
        return self.text


SYSTEM_PROMPT = """Bạn là chuyên gia viết nội dung mạng xã hội cho doanh nghiệp.
Hãy tạo bài đăng Facebook hấp dẫn, phù hợp với thương hiệu công ty.
Phong cách: chuyên nghiệp nhưng gần gũi, dễ đọc, tạo tương tác cao.
Luôn trả về JSON với định dạng:
{
  "text": "nội dung bài đăng",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "image_prompt": "mô tả hình ảnh phù hợp (tiếng Anh)"
}"""


def generate_post(
    client: anthropic.Anthropic,
    topic: str,
    tone: str = "professional",
    language: str = "vi",
    extra_context: str = "",
    max_length: int = 2000,
    model: str = "claude-sonnet-4-6",
) -> PostContent:
    """Tạo nội dung bài đăng từ chủ đề."""

    lang_map = {"vi": "tiếng Việt", "en": "English"}
    lang_label = lang_map.get(language, language)

    tone_map = {
        "professional": "chuyên nghiệp, uy tín",
        "friendly": "thân thiện, gần gũi",
        "exciting": "sôi nổi, hứng khởi",
        "informative": "thông tin, giáo dục",
        "promotional": "quảng bá, kêu gọi hành động",
    }
    tone_label = tone_map.get(tone, tone)

    user_prompt = f"""Viết bài đăng Facebook về chủ đề: "{topic}"

Yêu cầu:
- Ngôn ngữ: {lang_label}
- Giọng điệu: {tone_label}
- Độ dài tối đa: {max_length} ký tự
- Có 3-5 hashtags phù hợp
{f'- Thông tin thêm: {extra_context}' if extra_context else ''}

Trả về JSON theo đúng format đã quy định."""

    message = client.messages.create(
        model=model,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    import json
    import re

    raw = message.content[0].text.strip()

    # Trích xuất JSON từ response (có thể có markdown code block)
    json_match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not json_match:
        raise ValueError(f"Không thể parse JSON từ response AI: {raw}")

    data = json.loads(json_match.group())
    return PostContent(
        text=data.get("text", ""),
        hashtags=data.get("hashtags", []),
        image_prompt=data.get("image_prompt"),
    )


def generate_series(
    client: anthropic.Anthropic,
    theme: str,
    count: int = 5,
    language: str = "vi",
    model: str = "claude-sonnet-4-6",
) -> list[PostContent]:
    """Tạo một chuỗi bài đăng theo chủ đề."""

    user_prompt = f"""Tạo {count} bài đăng Facebook khác nhau về chủ đề: "{theme}"

Yêu cầu:
- Ngôn ngữ: {"tiếng Việt" if language == "vi" else "English"}
- Mỗi bài có góc độ/nội dung khác nhau
- Mỗi bài có 3-5 hashtags
- Trả về JSON array: [{{"text": "...", "hashtags": [...], "image_prompt": "..."}}]"""

    message = client.messages.create(
        model=model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )

    import json
    import re

    raw = message.content[0].text.strip()
    array_match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not array_match:
        raise ValueError(f"Không thể parse JSON array: {raw}")

    items = json.loads(array_match.group())
    return [
        PostContent(
            text=item.get("text", ""),
            hashtags=item.get("hashtags", []),
            image_prompt=item.get("image_prompt"),
        )
        for item in items
    ]
