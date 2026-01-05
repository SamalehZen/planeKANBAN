# Python imports
from datetime import timedelta

# Django imports
from django.utils import timezone
from django.db.models import Q

# Third party imports
from celery import shared_task

# Module imports
from plane.db.models import ExporterHistory
from plane.utils.file_storage import delete_file


@shared_task
def delete_old_s3_link():
    # Get a list of keys and IDs to process
    expired_exporter_history = ExporterHistory.objects.filter(
        Q(url__isnull=False) & Q(created_at__lte=timezone.now() - timedelta(days=8))
    ).values_list("key", "id")
    for file_name, exporter_id in expired_exporter_history:
        if file_name:
            delete_file(file_name)

        ExporterHistory.objects.filter(id=exporter_id).update(url=None)
