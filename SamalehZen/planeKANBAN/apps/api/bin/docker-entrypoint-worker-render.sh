#!/bin/bash
set -e

echo "Starting Celery Worker with Beat (Render optimized)..."

python manage.py wait_for_db
python manage.py migrate --noinput || true

exec celery -A plane worker \
    --loglevel=info \
    --beat \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler \
    --concurrency=2 \
    --pool=prefork \
    --without-gossip \
    --without-mingle \
    --without-heartbeat
