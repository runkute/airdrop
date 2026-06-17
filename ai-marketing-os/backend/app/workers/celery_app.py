from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "ai_marketing_os",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.publishing_tasks",
        "app.workers.ads_tasks",
        "app.workers.alert_tasks",
    ],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Time zone
    timezone="UTC",
    enable_utc=True,
    # Task execution
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Result expiry
    result_expires=3600,
    # Periodic tasks (Celery Beat)
    beat_schedule={
        "process-scheduled-posts": {
            "task": "app.workers.publishing_tasks.process_scheduled_posts",
            "schedule": 60.0,  # every 60 seconds
            "options": {"queue": "publishing"},
        },
        "sync-all-ads": {
            "task": "app.workers.ads_tasks.sync_all_ads",
            "schedule": 3600.0,  # every hour
            "options": {"queue": "ads"},
        },
        "run-alert-detection": {
            "task": "app.workers.alert_tasks.run_alert_detection",
            "schedule": 1800.0,  # every 30 minutes
            "options": {"queue": "alerts"},
        },
    },
    # Queue routing
    task_routes={
        "app.workers.publishing_tasks.*": {"queue": "publishing"},
        "app.workers.ads_tasks.*": {"queue": "ads"},
        "app.workers.alert_tasks.*": {"queue": "alerts"},
    },
)
