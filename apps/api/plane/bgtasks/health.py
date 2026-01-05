from celery import shared_task
from django.core.cache import cache
import time


@shared_task
def worker_health_check():
    """
    Simple health check task.
    Can be called periodically to keep worker warm.
    """

    timestamp = time.time()
    cache.set("worker_last_heartbeat", timestamp, timeout=300)
    return {"status": "ok", "timestamp": timestamp}


@shared_task(bind=True, max_retries=3)
def async_task_with_retry(self, task_name, *args, **kwargs):
    """
    Generic wrapper for async tasks with retry logic.
    Optimized for unreliable free tier workers.
    """

    try:
        from importlib import import_module

        module_path, func_name = task_name.rsplit(".", 1)
        module = import_module(module_path)
        func = getattr(module, func_name)
        return func(*args, **kwargs)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)
