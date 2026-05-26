"""CLI chính cho Fanpage Auto Post Tool."""

import sys
import uuid
import click
import anthropic
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.markdown import Markdown
from rich import print as rprint
from datetime import datetime

from .config import load_config, get_page
from .content_generator import generate_post, generate_series
from .facebook_poster import post_to_page, get_page_info, verify_token, PostResult
from .scheduler import PostScheduler, ScheduledPost

console = Console()


def _get_client_and_config():
    try:
        cfg = load_config()
        client = anthropic.Anthropic(api_key=cfg.anthropic_api_key)
        return client, cfg
    except ValueError as e:
        console.print(f"[red]Lỗi cấu hình:[/red] {e}")
        sys.exit(1)


@click.group()
@click.version_option("1.0.0")
def cli():
    """Fanpage Auto Post Tool - Tự động viết và đăng bài lên các fanpage."""
    pass


# ─── Lệnh: tạo nội dung ───────────────────────────────────────────────────────

@cli.command("generate")
@click.argument("topic")
@click.option("--tone", "-t", default="professional",
              type=click.Choice(["professional", "friendly", "exciting", "informative", "promotional"]),
              help="Giọng điệu bài viết")
@click.option("--lang", "-l", default="vi", type=click.Choice(["vi", "en"]), help="Ngôn ngữ")
@click.option("--context", "-c", default="", help="Thông tin bổ sung về công ty/sản phẩm")
@click.option("--count", "-n", default=1, help="Số bài muốn tạo (tạo chuỗi nếu > 1)")
def cmd_generate(topic: str, tone: str, lang: str, context: str, count: int):
    """Tạo nội dung bài đăng từ chủ đề cho trước."""
    client, cfg = _get_client_and_config()

    with console.status("[bold cyan]Đang tạo nội dung với AI...[/bold cyan]"):
        if count == 1:
            posts = [generate_post(client, topic, tone=tone, language=lang,
                                   extra_context=context, model=cfg.default_model)]
        else:
            posts = generate_series(client, topic, count=count, language=lang, model=cfg.default_model)

    for i, post in enumerate(posts, 1):
        if count > 1:
            console.print(f"\n[bold blue]── Bài {i}/{count} ──[/bold blue]")
        console.print(Panel(post.full_text, title="[green]Nội dung bài đăng[/green]", expand=False))
        if post.image_prompt:
            console.print(f"[dim]Gợi ý ảnh: {post.image_prompt}[/dim]")


# ─── Lệnh: đăng bài ngay ─────────────────────────────────────────────────────

@cli.command("post")
@click.argument("topic")
@click.argument("pages", nargs=-1)
@click.option("--tone", "-t", default="professional",
              type=click.Choice(["professional", "friendly", "exciting", "informative", "promotional"]))
@click.option("--lang", "-l", default="vi", type=click.Choice(["vi", "en"]))
@click.option("--context", "-c", default="", help="Thông tin bổ sung")
@click.option("--preview", is_flag=True, help="Xem trước nội dung trước khi đăng")
@click.option("--all-pages", "all_pages", is_flag=True, help="Đăng lên tất cả các page đã cấu hình")
def cmd_post(topic: str, pages: tuple, tone: str, lang: str, context: str, preview: bool, all_pages: bool):
    """Tạo và đăng bài lên một hoặc nhiều fanpage.

    PAGES: tên các page cần đăng (khớp với PAGE_TOKEN_<TÊN> trong .env)

    Ví dụ: fanpage post "Ra mắt sản phẩm mới" COMPANY_PAGE PRODUCT_PAGE
    """
    client, cfg = _get_client_and_config()

    if not cfg.pages:
        console.print("[red]Chưa cấu hình page nào. Kiểm tra lại file .env[/red]")
        sys.exit(1)

    target_pages = cfg.pages if all_pages else [get_page(cfg, p) for p in pages]
    target_pages = [p for p in target_pages if p is not None]

    if not target_pages:
        console.print(f"[red]Không tìm thấy page: {', '.join(pages)}[/red]")
        console.print("Các page đã cấu hình: " + ", ".join(p.name for p in cfg.pages))
        sys.exit(1)

    # Tạo nội dung
    with console.status("[bold cyan]Đang tạo nội dung...[/bold cyan]"):
        post_content = generate_post(
            client, topic, tone=tone, language=lang,
            extra_context=context, model=cfg.default_model,
        )

    console.print(Panel(post_content.full_text, title="[green]Nội dung bài đăng[/green]", expand=False))
    if post_content.image_prompt:
        console.print(f"[dim]Gợi ý ảnh: {post_content.image_prompt}[/dim]\n")

    if preview:
        if not click.confirm("Tiếp tục đăng bài?", default=True):
            console.print("[yellow]Đã hủy.[/yellow]")
            return

    # Đăng lên từng page
    for page in target_pages:
        with console.status(f"[bold cyan]Đang đăng lên {page.name}...[/bold cyan]"):
            result: PostResult = post_to_page(page, post_content)

        if result.success:
            console.print(f"[green]✓[/green] {page.name}: {result.post_url}")
        else:
            console.print(f"[red]✗[/red] {page.name}: {result.error}")


# ─── Lệnh: lên lịch đăng bài ─────────────────────────────────────────────────

@cli.command("schedule")
@click.argument("topic")
@click.argument("page_name")
@click.option("--type", "schedule_type", default="once",
              type=click.Choice(["once", "daily", "weekly", "cron"]),
              help="Loại lịch")
@click.option("--when", required=True,
              help="Thời điểm: ISO datetime (once), HH:MM (daily), day,HH:MM (weekly), cron expr (cron)")
@click.option("--tone", "-t", default="professional")
@click.option("--lang", "-l", default="vi")
@click.option("--context", "-c", default="")
def cmd_schedule(topic: str, page_name: str, schedule_type: str, when: str,
                 tone: str, lang: str, context: str):
    """Lên lịch tự động đăng bài.

    Ví dụ:
      fanpage schedule "Tip hàng ngày" COMPANY_PAGE --type daily --when 09:00

      fanpage schedule "Post thứ 2" COMPANY_PAGE --type weekly --when monday,08:30

      fanpage schedule "Event" COMPANY_PAGE --type once --when 2025-06-01T10:00:00
    """
    client, cfg = _get_client_and_config()

    page = get_page(cfg, page_name)
    if not page:
        console.print(f"[red]Không tìm thấy page: {page_name}[/red]")
        sys.exit(1)

    def run_scheduled_post(scheduled: ScheduledPost):
        post_content = generate_post(
            client, scheduled.topic, tone=scheduled.tone,
            language=scheduled.language, extra_context=scheduled.extra_context,
            model=cfg.default_model,
        )
        target_page = get_page(cfg, scheduled.page_name)
        if target_page:
            result = post_to_page(target_page, post_content)
            if result.success:
                console.print(f"[green]✓ Đã đăng lên {scheduled.page_name}:[/green] {result.post_url}")
            else:
                console.print(f"[red]✗ Lỗi đăng {scheduled.page_name}:[/red] {result.error}")

    scheduled_post = ScheduledPost(
        id=str(uuid.uuid4())[:8],
        page_name=page_name.upper(),
        topic=topic,
        tone=tone,
        language=lang,
        schedule_type=schedule_type,
        schedule_value=when,
        extra_context=context,
    )

    scheduler = PostScheduler(run_scheduled_post)
    scheduler.add_schedule(scheduled_post)

    console.print(f"[green]✓[/green] Đã lên lịch thành công! ID: [bold]{scheduled_post.id}[/bold]")
    console.print(f"  Page: {page_name} | Loại: {schedule_type} | Khi nào: {when}")

    # Giữ scheduler chạy nếu là "once"
    if schedule_type == "once":
        console.print("[dim]Đang chờ đến giờ đăng bài... (Ctrl+C để hủy)[/dim]")
        try:
            import time
            while True:
                time.sleep(5)
                post = next((p for p in scheduler.list_schedules() if p.id == scheduled_post.id), None)
                if post and post.status in ("done", "failed"):
                    break
        except KeyboardInterrupt:
            scheduler.shutdown()
            console.print("\n[yellow]Đã hủy lịch.[/yellow]")
    else:
        console.print("[dim]Lịch đã lưu vào scheduled_posts.json. Chạy 'fanpage run-scheduler' để kích hoạt.[/dim]")
        scheduler.shutdown()


@cli.command("run-scheduler")
def cmd_run_scheduler():
    """Chạy scheduler để xử lý tất cả bài đã lên lịch."""
    client, cfg = _get_client_and_config()

    def run_scheduled_post(scheduled: ScheduledPost):
        post_content = generate_post(
            client, scheduled.topic, tone=scheduled.tone,
            language=scheduled.language, extra_context=scheduled.extra_context,
            model=cfg.default_model,
        )
        target_page = get_page(cfg, scheduled.page_name)
        if target_page:
            result = post_to_page(target_page, post_content)
            timestamp = datetime.now().strftime("%H:%M:%S")
            if result.success:
                console.print(f"[{timestamp}] [green]✓[/green] {scheduled.page_name}: {result.post_url}")
            else:
                console.print(f"[{timestamp}] [red]✗[/red] {scheduled.page_name}: {result.error}")

    scheduler = PostScheduler(run_scheduled_post)
    schedules = scheduler.list_schedules()

    if not schedules:
        console.print("[yellow]Chưa có lịch nào. Dùng 'fanpage schedule' để thêm.[/yellow]")
        return

    _print_schedule_table(schedules)
    console.print("\n[bold green]Scheduler đang chạy...[/bold green] (Ctrl+C để dừng)\n")

    try:
        import time
        while True:
            time.sleep(30)
    except KeyboardInterrupt:
        scheduler.shutdown()
        console.print("\n[yellow]Đã dừng scheduler.[/yellow]")


# ─── Lệnh: quản lý lịch ──────────────────────────────────────────────────────

@cli.command("list-schedules")
def cmd_list_schedules():
    """Xem danh sách các bài đã lên lịch."""
    from .scheduler import SCHEDULE_FILE, ScheduledPost
    import json

    if not SCHEDULE_FILE.exists():
        console.print("[yellow]Chưa có lịch nào.[/yellow]")
        return

    with open(SCHEDULE_FILE) as f:
        data = json.load(f)
    posts = [ScheduledPost(**item) for item in data]
    _print_schedule_table(posts)


@cli.command("cancel-schedule")
@click.argument("post_id")
def cmd_cancel_schedule(post_id: str):
    """Hủy một lịch đã đặt theo ID."""
    _, cfg = _get_client_and_config()

    def noop(p): pass
    scheduler = PostScheduler(noop)
    if scheduler.remove_schedule(post_id):
        console.print(f"[green]✓[/green] Đã hủy lịch ID: {post_id}")
    else:
        console.print(f"[red]Không tìm thấy lịch ID: {post_id}[/red]")
    scheduler.shutdown()


# ─── Lệnh: kiểm tra pages ────────────────────────────────────────────────────

@cli.command("pages")
def cmd_pages():
    """Xem danh sách các page đã cấu hình và trạng thái token."""
    _, cfg = _get_client_and_config()

    if not cfg.pages:
        console.print("[yellow]Chưa cấu hình page nào. Xem .env.example để biết cách thêm.[/yellow]")
        return

    table = Table(title="Danh sách Fanpages", show_header=True, header_style="bold magenta")
    table.add_column("Tên Page", style="cyan")
    table.add_column("Page ID")
    table.add_column("Trạng thái Token")
    table.add_column("Tên trên Facebook")

    for page in cfg.pages:
        with console.status(f"Kiểm tra {page.name}..."):
            info = get_page_info(page)

        if "error" in info:
            table.add_row(page.name, page.page_id, "[red]✗ Token hết hạn[/red]", "-")
        else:
            fb_name = info.get("name", "N/A")
            followers = info.get("followers_count", info.get("fan_count", "N/A"))
            table.add_row(
                page.name, page.page_id,
                "[green]✓ Hợp lệ[/green]",
                f"{fb_name} ({followers:,} followers)" if isinstance(followers, int) else fb_name,
            )

    console.print(table)


# ─── Helper ───────────────────────────────────────────────────────────────────

def _print_schedule_table(posts):
    table = Table(title="Lịch đăng bài", show_header=True, header_style="bold magenta")
    table.add_column("ID", style="cyan", width=10)
    table.add_column("Page")
    table.add_column("Chủ đề")
    table.add_column("Loại lịch")
    table.add_column("Khi nào")
    table.add_column("Trạng thái")

    status_colors = {
        "pending": "yellow",
        "running": "cyan",
        "done": "green",
        "failed": "red",
    }
    for p in posts:
        color = status_colors.get(p.status, "white")
        table.add_row(
            p.id, p.page_name, p.topic[:40],
            p.schedule_type, p.schedule_value,
            f"[{color}]{p.status}[/{color}]",
        )
    console.print(table)
