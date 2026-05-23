"""Lập lịch đăng bài tự động."""

import time
import json
import threading
from datetime import datetime, timedelta
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, Callable
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger


SCHEDULE_FILE = Path("scheduled_posts.json")


@dataclass
class ScheduledPost:
    id: str
    page_name: str
    topic: str
    tone: str
    language: str
    schedule_type: str  # "once", "daily", "weekly", "cron"
    schedule_value: str  # ISO datetime hoặc cron expression
    extra_context: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    last_run: Optional[str] = None
    status: str = "pending"  # pending, running, done, failed


class PostScheduler:
    def __init__(self, post_callback: Callable[[ScheduledPost], None]):
        self._callback = post_callback
        self._scheduler = BackgroundScheduler()
        self._scheduler.start()
        self._posts: dict[str, ScheduledPost] = {}
        self._load_from_file()

    def _load_from_file(self):
        if SCHEDULE_FILE.exists():
            with open(SCHEDULE_FILE) as f:
                data = json.load(f)
            for item in data:
                post = ScheduledPost(**item)
                self._posts[post.id] = post
                if post.status == "pending":
                    self._add_to_scheduler(post)

    def _save_to_file(self):
        with open(SCHEDULE_FILE, "w", encoding="utf-8") as f:
            json.dump([asdict(p) for p in self._posts.values()], f, ensure_ascii=False, indent=2)

    def _run_post(self, post_id: str):
        post = self._posts.get(post_id)
        if not post:
            return
        post.status = "running"
        post.last_run = datetime.now().isoformat()
        try:
            self._callback(post)
            # Nếu là "once" thì đánh dấu done
            if post.schedule_type == "once":
                post.status = "done"
            else:
                post.status = "pending"
        except Exception as e:
            post.status = "failed"
        finally:
            self._save_to_file()

    def _add_to_scheduler(self, post: ScheduledPost):
        if post.schedule_type == "once":
            run_time = datetime.fromisoformat(post.schedule_value)
            if run_time > datetime.now():
                self._scheduler.add_job(
                    self._run_post,
                    trigger=DateTrigger(run_date=run_time),
                    args=[post.id],
                    id=post.id,
                    replace_existing=True,
                )
        elif post.schedule_type == "daily":
            hour, minute = map(int, post.schedule_value.split(":"))
            self._scheduler.add_job(
                self._run_post,
                trigger=CronTrigger(hour=hour, minute=minute),
                args=[post.id],
                id=post.id,
                replace_existing=True,
            )
        elif post.schedule_type == "weekly":
            # format: "monday,09:00"
            day, time_str = post.schedule_value.split(",")
            hour, minute = map(int, time_str.split(":"))
            self._scheduler.add_job(
                self._run_post,
                trigger=CronTrigger(day_of_week=day.lower(), hour=hour, minute=minute),
                args=[post.id],
                id=post.id,
                replace_existing=True,
            )
        elif post.schedule_type == "cron":
            self._scheduler.add_job(
                self._run_post,
                trigger=CronTrigger.from_crontab(post.schedule_value),
                args=[post.id],
                id=post.id,
                replace_existing=True,
            )

    def add_schedule(self, post: ScheduledPost):
        self._posts[post.id] = post
        self._add_to_scheduler(post)
        self._save_to_file()

    def remove_schedule(self, post_id: str) -> bool:
        if post_id not in self._posts:
            return False
        try:
            self._scheduler.remove_job(post_id)
        except Exception:
            pass
        del self._posts[post_id]
        self._save_to_file()
        return True

    def list_schedules(self) -> list[ScheduledPost]:
        return list(self._posts.values())

    def shutdown(self):
        self._scheduler.shutdown(wait=False)
