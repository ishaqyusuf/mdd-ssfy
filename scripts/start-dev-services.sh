#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

COMPOSE_FILE="${GND_COMPOSE_FILE:-$ROOT_DIR/apps/www/docker-compose.yml}"
MYSQL_SERVICE="${GND_MYSQL_SERVICE:-mysql}"
REDIS_SERVICE="${GND_REDIS_SERVICE:-redis}"
MYSQL_USER="${GND_MYSQL_USER:-root}"
MYSQL_HOST="${GND_MYSQL_HOST:-127.0.0.1}"
MYSQL_WAIT_ATTEMPTS="${GND_MYSQL_WAIT_ATTEMPTS:-40}"
REDIS_WAIT_ATTEMPTS="${GND_REDIS_WAIT_ATTEMPTS:-30}"
SLEEP_SECONDS="${GND_DEV_SERVICES_WAIT_SECONDS:-1}"
DOCKER_MAX_ATTEMPTS="${GND_DOCKER_WAIT_ATTEMPTS:-60}"
DOCKER_SLEEP_SECONDS="${GND_DOCKER_WAIT_SECONDS:-2}"

wait_for_docker() {
  attempt=1
  while [ "$attempt" -le "$DOCKER_MAX_ATTEMPTS" ]; do
    if docker info >/dev/null 2>&1; then
      return 0
    fi

    echo "Waiting for Docker Engine... ($attempt/$DOCKER_MAX_ATTEMPTS)"
    attempt=$((attempt + 1))
    sleep "$DOCKER_SLEEP_SECONDS"
  done

  return 1
}

if ! docker info >/dev/null 2>&1; then
  if [ "$(uname -s)" = "Darwin" ] && command -v open >/dev/null 2>&1; then
    echo "Docker Engine is not reachable. Opening Docker Desktop..."
    open -gj -a Docker || true

    if wait_for_docker; then
      echo "Docker Engine is ready."
    else
      cat >&2 <<'EOF'
Docker Desktop was opened, but Docker Engine did not become reachable in time.

Check that Docker Desktop finished starting, then rerun your command.

Useful checks:
  docker context ls
  docker context use desktop-linux
EOF
      exit 1
    fi
  else
    cat >&2 <<'EOF'
Docker Engine is not reachable.

The local MySQL and Redis containers need a running Docker-compatible daemon.

Terminal-first options:
  1. Start Docker Desktop, then rerun your command.
  2. Use Colima instead of Docker Desktop:
       brew install colima docker docker-compose
       colima start
       docker context use colima
       bun run dev:services

If Docker Desktop is already running, check your Docker context:
  docker context ls
  docker context use desktop-linux
EOF
    exit 1
  fi
fi

echo "Starting local MySQL and Redis containers..."
docker compose -f "$COMPOSE_FILE" up -d "$MYSQL_SERVICE" "$REDIS_SERVICE"

attempt=1
while [ "$attempt" -le "$MYSQL_WAIT_ATTEMPTS" ]; do
  if docker compose -f "$COMPOSE_FILE" exec -T "$MYSQL_SERVICE" mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" >/dev/null 2>&1; then
    echo "Local MySQL is ready."
    break
  fi

  echo "Waiting for local MySQL... ($attempt/$MYSQL_WAIT_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

if [ "$attempt" -gt "$MYSQL_WAIT_ATTEMPTS" ]; then
  echo "Local MySQL did not become ready in time." >&2
  echo "Try: docker compose -f \"$COMPOSE_FILE\" logs \"$MYSQL_SERVICE\"" >&2
  exit 1
fi

attempt=1
while [ "$attempt" -le "$REDIS_WAIT_ATTEMPTS" ]; do
  if docker compose -f "$COMPOSE_FILE" exec -T "$REDIS_SERVICE" redis-cli ping >/dev/null 2>&1; then
    echo "Local Redis is ready."
    exit 0
  fi

  echo "Waiting for local Redis... ($attempt/$REDIS_WAIT_ATTEMPTS)"
  attempt=$((attempt + 1))
  sleep "$SLEEP_SECONDS"
done

echo "Local Redis did not become ready in time." >&2
echo "Try: docker compose -f \"$COMPOSE_FILE\" logs \"$REDIS_SERVICE\"" >&2
exit 1
