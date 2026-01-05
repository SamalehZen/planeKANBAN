import logging
import os
import ssl

from celery import Celery
from celery.schedules import crontab
from celery.signals import after_setup_logger, after_setup_task_logger
from pythonjsonlogger.jsonlogger import JsonFormatter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "plane.settings.production")

app = Celery("plane")
app.config_from_object("django.conf:settings", namespace="CELERY")

redis_url = os.environ.get("REDIS_URL") or os.environ.get("CELERY_BROKER_URL") or ""
if redis_url.startswith("rediss://"):
    app.conf.broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}
    app.conf.redis_backend_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}

app.conf.beat_schedule = {
    # Intra day recurring jobs
    "check-every-five-minutes-to-send-email-notifications": {
        "task": "plane.bgtasks.email_notification_task.stack_email_notification",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes
    },
    "run-every-6-hours-for-instance-trace": {
        "task": "plane.license.bgtasks.tracer.instance_traces",
        "schedule": crontab(hour="*/6", minute=0),  # Every 6 hours
    },
    # Occurs once every day
    "check-every-day-to-delete-hard-delete": {
        "task": "plane.bgtasks.deletion_task.hard_delete",
        "schedule": crontab(hour=0, minute=0),  # UTC 00:00
    },
    "check-every-day-to-archive-and-close": {
        "task": "plane.bgtasks.issue_automation_task.archive_and_close_old_issues",
        "schedule": crontab(hour=1, minute=0),  # UTC 01:00
    },
    "check-every-day-to-delete_exporter_history": {
        "task": "plane.bgtasks.exporter_expired_task.delete_old_s3_link",
        "schedule": crontab(hour=1, minute=30),  # UTC 01:30
    },
    "check-every-day-to-delete-file-asset": {
        "task": "plane.bgtasks.file_asset_task.delete_unuploaded_file_asset",
        "schedule": crontab(hour=2, minute=0),  # UTC 02:00
    },
    "check-every-day-to-delete-api-logs": {
        "task": "plane.bgtasks.cleanup_task.delete_api_logs",
        "schedule": crontab(hour=2, minute=30),  # UTC 02:30
    },
    "check-every-day-to-delete-email-notification-logs": {
        "task": "plane.bgtasks.cleanup_task.delete_email_notification_logs",
        "schedule": crontab(hour=2, minute=45),  # UTC 02:45
    },
    "check-every-day-to-delete-page-versions": {
        "task": "plane.bgtasks.cleanup_task.delete_page_versions",
        "schedule": crontab(hour=3, minute=0),  # UTC 03:00
    },
    "check-every-day-to-delete-issue-description-versions": {
        "task": "plane.bgtasks.cleanup_task.delete_issue_description_versions",
        "schedule": crontab(hour=3, minute=15),  # UTC 03:15
    },
    "check-every-day-to-delete-webhook-logs": {
        "task": "plane.bgtasks.cleanup_task.delete_webhook_logs",
        "schedule": crontab(hour=3, minute=30),  # UTC 03:30
    },
    "check-every-day-to-delete-exporter-history": {
        "task": "plane.bgtasks.exporter_expired_task.delete_old_s3_link",
        "schedule": crontab(hour=3, minute=45),  # UTC 03:45
    },
}


# Setup logging
@after_setup_logger.connect
def setup_loggers(logger, *args, **kwargs):
    formatter = JsonFormatter('"%(levelname)s %(asctime)s %(module)s %(name)s %(message)s')
    handler = logging.StreamHandler()
    handler.setFormatter(fmt=formatter)
    logger.addHandler(handler)


@after_setup_task_logger.connect
def setup_task_loggers(logger, *args, **kwargs):
    formatter = JsonFormatter('"%(levelname)s %(asctime)s %(module)s %(name)s %(message)s')
    handler = logging.StreamHandler()
    handler.setFormatter(fmt=formatter)
    logger.addHandler(handler)


# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

app.conf.beat_scheduler = "django_celery_beat.schedulers.DatabaseScheduler"
