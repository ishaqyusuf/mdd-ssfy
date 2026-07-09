#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

COMPOSE_FILE="${GND_COMPOSE_FILE:-$ROOT_DIR/apps/www/docker-compose.yml}"
ENV_FILE="${GND_ENV_FILE:-$ROOT_DIR/.env.local}"
MYSQL_SERVICE="${GND_MYSQL_SERVICE:-mysql}"
REDIS_SERVICE="${GND_REDIS_SERVICE:-redis}"
MYSQL_USER="${GND_MYSQL_USER:-root}"
MYSQL_HOST="${GND_MYSQL_HOST:-127.0.0.1}"
MYSQL_WAIT_ATTEMPTS="${GND_MYSQL_WAIT_ATTEMPTS:-40}"
REDIS_WAIT_ATTEMPTS="${GND_REDIS_WAIT_ATTEMPTS:-30}"
SLEEP_SECONDS="${GND_DEV_SERVICES_WAIT_SECONDS:-1}"
DOCKER_MAX_ATTEMPTS="${GND_DOCKER_WAIT_ATTEMPTS:-60}"
DOCKER_SLEEP_SECONDS="${GND_DOCKER_WAIT_SECONDS:-2}"
DEFAULT_LOCAL_DATABASE_URL="${LOCAL_DATABASE_URL:-mysql://root@127.0.0.1:3307/gnd-prisma2}"
DEFAULT_LOCAL_REDIS_URL="${LOCAL_REDIS_URL:-redis://localhost:6379}"

strip_wrapping_quotes() {
  value="$1"
  case "$value" in
    \"*\")
      value=${value#\"}
      value=${value%\"}
      ;;
    \'*\')
      value=${value#\'}
      value=${value%\'}
      ;;
  esac

  printf '%s' "$value"
}

read_env_value() {
  var_name="$1"
  file="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  raw_value=$(
    awk -v key="$var_name" '
      $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
        sub("^[[:space:]]*" key "[[:space:]]*=[[:space:]]*", "")
        sub(/\r$/, "")
        print
        exit
      }
    ' "$file"
  )

  strip_wrapping_quotes "$raw_value"
}

env_or_file_value() {
  var_name="$1"
  env_value="$(printenv "$var_name" 2>/dev/null || true)"

  if [ -n "$env_value" ]; then
    printf '%s' "$env_value"
    return 0
  fi

  read_env_value "$var_name" "$ENV_FILE"
}

first_env_value() {
  for var_name in "$@"; do
    value="$(env_or_file_value "$var_name")"
    if [ -n "$value" ]; then
      printf '%s' "$value"
      return 0
    fi
  done

  return 0
}

database_mode="$(first_env_value GND_DB_MODE)"
database_mode="${database_mode:-auto}"
redis_mode="$(first_env_value GND_REDIS_MODE)"
redis_mode="${redis_mode:-auto}"
mysql_start_mode="$(first_env_value GND_START_MYSQL)"
mysql_start_mode="${mysql_start_mode:-auto}"
redis_start_mode="$(first_env_value GND_START_REDIS)"
redis_start_mode="${redis_start_mode:-auto}"

url_host() {
  url="$1"

  case "$url" in
    *://*) rest=${url#*://} ;;
    *) return 0 ;;
  esac

  case "$rest" in
    *@*) rest=${rest#*@} ;;
  esac

  host_port=${rest%%/*}
  host_port=${host_port%%\?*}

  case "$host_port" in
    \[*\]*)
      host=${host_port#\[}
      host=${host%%\]*}
      ;;
    *)
      host=${host_port%%:*}
      ;;
  esac

  printf '%s' "$host"
}

is_local_host() {
  case "$1" in
    "" | localhost | 127.0.0.1 | ::1 | 0.0.0.0 | mysql)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

case "$database_mode" in
  local)
    database_url="$(first_env_value LOCAL_DATABASE_URL)"
    database_url="${database_url:-$DEFAULT_LOCAL_DATABASE_URL}"
    ;;
  remote-dev)
    database_url="$(first_env_value REMOTE_DEV_DATABASE_URL DEV_DATABASE_URL DATABASE_URL)"
    ;;
  auto | "")
    database_url="$(first_env_value DATABASE_URL)"
    ;;
  *)
    echo "Invalid GND_DB_MODE value: $database_mode" >&2
    echo "Use auto, remote-dev, or local." >&2
    exit 1
    ;;
esac
database_host="$(url_host "$database_url")"

if [ "$database_mode" = "remote-dev" ] && [ -z "$database_url" ]; then
  database_host="remote-dev"
fi

case "$redis_mode" in
  local)
    redis_url="$(first_env_value LOCAL_REDIS_URL)"
    redis_url="${redis_url:-$DEFAULT_LOCAL_REDIS_URL}"
    upstash_redis_rest_url=""
    ;;
  remote-dev)
    redis_url="$(first_env_value REMOTE_DEV_REDIS_URL REDIS_URL)"
    upstash_redis_rest_url="$(first_env_value REMOTE_DEV_UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_URL)"
    ;;
  auto | "")
    redis_url="$(first_env_value REDIS_URL)"
    upstash_redis_rest_url="$(first_env_value UPSTASH_REDIS_REST_URL)"
    ;;
  *)
    echo "Invalid GND_REDIS_MODE value: $redis_mode" >&2
    echo "Use auto, remote-dev, or local." >&2
    exit 1
    ;;
esac
redis_host="$(url_host "$redis_url")"

if [ "$redis_mode" = "remote-dev" ] && [ -z "$redis_url" ] && [ -z "$upstash_redis_rest_url" ]; then
  redis_host="remote-dev"
fi

should_start_mysql() {
  case "$mysql_start_mode" in
    1 | true | yes)
      return 0
      ;;
    0 | false | no)
      return 1
      ;;
    auto)
      ;;
    *)
      echo "Invalid GND_START_MYSQL value: $mysql_start_mode" >&2
      echo "Use auto, 1/true/yes, or 0/false/no." >&2
      exit 1
      ;;
  esac

  is_local_host "$database_host"
}

should_start_redis() {
  case "$redis_start_mode" in
    1 | true | yes)
      return 0
      ;;
    0 | false | no)
      return 1
      ;;
    auto)
      ;;
    *)
      echo "Invalid GND_START_REDIS value: $redis_start_mode" >&2
      echo "Use auto, 1/true/yes, or 0/false/no." >&2
      exit 1
      ;;
  esac

  if [ -n "$upstash_redis_rest_url" ]; then
    return 1
  fi

  if [ "$redis_mode" = "remote-dev" ]; then
    return 1
  fi

  if [ -n "$redis_url" ] && ! is_local_host "$redis_host"; then
    return 1
  fi

  return 0
}

mysql_skip_message() {
  case "$mysql_start_mode" in
    0 | false | no)
      echo "Skipping local MySQL; GND_START_MYSQL is disabled."
      ;;
    *)
      if [ "$database_mode" = "remote-dev" ]; then
        echo "Skipping local MySQL; GND_DB_MODE is remote-dev."
      elif [ -n "$database_url" ] && ! is_local_host "$database_host"; then
        echo "Skipping local MySQL; DATABASE_URL points to a non-local host."
      else
        echo "Skipping local MySQL."
      fi
      ;;
  esac
}

redis_skip_message() {
  case "$redis_start_mode" in
    0 | false | no)
      echo "Skipping local Redis; GND_START_REDIS is disabled."
      ;;
    *)
      if [ "$redis_mode" = "remote-dev" ]; then
        echo "Skipping local Redis; GND_REDIS_MODE is remote-dev."
      elif [ -n "$upstash_redis_rest_url" ]; then
        echo "Skipping local Redis; UPSTASH_REDIS_REST_URL is configured."
      elif [ -n "$redis_url" ] && ! is_local_host "$redis_host"; then
        echo "Skipping local Redis; REDIS_URL points to a non-local host."
      else
        echo "Skipping local Redis."
      fi
      ;;
  esac
}

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

mysql_has_stale_socket_lock() {
  docker compose -f "$COMPOSE_FILE" logs --tail 80 "$MYSQL_SERVICE" 2>/dev/null |
    grep -q "Invalid pid in unix socket lock file"
}

recreate_mysql_container_for_stale_lock() {
  echo "Local MySQL hit a stale runtime socket lock; recreating the service container while preserving the data volume."
  docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-deps "$MYSQL_SERVICE"
}

services=""
start_mysql=0
start_redis=0
mysql_stale_lock_recovered=0

if should_start_mysql; then
  start_mysql=1
  services="$services $MYSQL_SERVICE"
else
  mysql_skip_message
fi

if should_start_redis; then
  start_redis=1
  services="$services $REDIS_SERVICE"
else
  redis_skip_message
fi

if [ -z "$services" ]; then
  echo "No local dev services requested."
  exit 0
fi

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

The selected local dev services need a running Docker-compatible daemon.

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

echo "Starting local dev services:$services"
docker compose -f "$COMPOSE_FILE" up -d $services

if [ "$start_mysql" -eq 1 ]; then
  attempt=1
  while [ "$attempt" -le "$MYSQL_WAIT_ATTEMPTS" ]; do
    if docker compose -f "$COMPOSE_FILE" exec -T "$MYSQL_SERVICE" mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" >/dev/null 2>&1; then
      echo "Local MySQL is ready."
      break
    fi

    if [ "$mysql_stale_lock_recovered" -eq 0 ] && mysql_has_stale_socket_lock; then
      mysql_stale_lock_recovered=1
      recreate_mysql_container_for_stale_lock
      attempt=1
      sleep "$SLEEP_SECONDS"
      continue
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
fi

if [ "$start_redis" -eq 0 ]; then
  exit 0
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
