#!/bin/bash
set -e

python manage.py wait_for_db
python manage.py migrate --noinput

gunicorn -w "${GUNICORN_WORKERS:-2}" -k uvicorn.workers.UvicornWorker plane.asgi:application --bind 0.0.0.0:"${PORT:-8000}" --max-requests 1200 --max-requests-jitter 1000 --access-logfile - &
server_pid=$!

(
  set +e

  HOSTNAME=$(hostname)
  MAC_ADDRESS=$(ip link show | awk '/ether/ {print $2}' | head -n 1)
  CPU_INFO=$(cat /proc/cpuinfo)
  MEMORY_INFO=$(free -h)
  DISK_INFO=$(df -h)

  SIGNATURE=$(echo "$HOSTNAME$MAC_ADDRESS$CPU_INFO$MEMORY_INFO$DISK_INFO" | sha256sum | awk '{print $1}')
  export MACHINE_SIGNATURE=$SIGNATURE

  python manage.py register_instance "$MACHINE_SIGNATURE" || true
  python manage.py configure_instance || true
  python manage.py create_bucket || true
  python manage.py clear_cache || true
  python manage.py collectstatic --noinput || true
) &

wait "$server_pid"
