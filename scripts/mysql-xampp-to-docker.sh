#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/apps/www/docker-compose.yml}"
SERVICE_NAME="${SERVICE_NAME:-mysql}"

SOURCE_DB_HOST="${SOURCE_DB_HOST:-127.0.0.1}"
SOURCE_DB_PORT="${SOURCE_DB_PORT:-3306}"
SOURCE_DB_USER="${SOURCE_DB_USER:-root}"
SOURCE_DB_PASSWORD="${SOURCE_DB_PASSWORD:-}"
SOURCE_DB_NAME="${SOURCE_DB_NAME:-gnd-prisma2}"

TARGET_DB_HOST="${TARGET_DB_HOST:-127.0.0.1}"
TARGET_DB_PORT="${TARGET_DB_PORT:-3307}"
TARGET_DB_USER="${TARGET_DB_USER:-root}"
TARGET_DB_PASSWORD="${TARGET_DB_PASSWORD:-}"
TARGET_DB_NAME="${TARGET_DB_NAME:-gnd-prisma2}"

DUMP_DIR="${DUMP_DIR:-${TMPDIR:-/tmp}/gnd-db-dumps}"
DEFAULT_DUMP_FILE="$DUMP_DIR/${SOURCE_DB_NAME}.sql"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/mysql-xampp-to-docker.sh up
  ./scripts/mysql-xampp-to-docker.sh dump [dump-file]
  ./scripts/mysql-xampp-to-docker.sh import <dump-file>
  ./scripts/mysql-xampp-to-docker.sh full [dump-file]

Defaults:
  Source MySQL:  127.0.0.1:3306 / root / gnd-prisma2
  Target MySQL:  127.0.0.1:3307 / root / gnd-prisma2

Environment overrides:
  SOURCE_DB_HOST SOURCE_DB_PORT SOURCE_DB_USER SOURCE_DB_PASSWORD SOURCE_DB_NAME
  TARGET_DB_HOST TARGET_DB_PORT TARGET_DB_USER TARGET_DB_PASSWORD TARGET_DB_NAME
  COMPOSE_FILE SERVICE_NAME DUMP_DIR
EOF
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

mysql_password_env() {
  local password="$1"
  if [[ -n "$password" ]]; then
    printf 'MYSQL_PWD=%q ' "$password"
  fi
}

wait_for_target() {
  local password_prefix
  password_prefix="$(mysql_password_env "$TARGET_DB_PASSWORD")"

  for _ in $(seq 1 60); do
    if eval "${password_prefix}docker compose -f \"$COMPOSE_FILE\" exec -T \"$SERVICE_NAME\" mysqladmin ping -h 127.0.0.1 -u\"$TARGET_DB_USER\" --silent" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "Timed out waiting for the Docker MySQL container to become ready." >&2
  exit 1
}

compose_up() {
  require_command docker
  docker compose -f "$COMPOSE_FILE" up -d "$SERVICE_NAME"
  wait_for_target
}

dump_source() {
  require_command mysqldump

  local dump_file="${1:-$DEFAULT_DUMP_FILE}"
  mkdir -p "$(dirname "$dump_file")"

  if [[ -n "$SOURCE_DB_PASSWORD" ]]; then
    MYSQL_PWD="$SOURCE_DB_PASSWORD" \
      mysqldump \
      --host="$SOURCE_DB_HOST" \
      --port="$SOURCE_DB_PORT" \
      --user="$SOURCE_DB_USER" \
      --single-transaction \
      --quick \
      --routines \
      --triggers \
      --default-character-set=utf8mb4 \
      "$SOURCE_DB_NAME" >"$dump_file"
  else
    mysqldump \
      --host="$SOURCE_DB_HOST" \
      --port="$SOURCE_DB_PORT" \
      --user="$SOURCE_DB_USER" \
      --single-transaction \
      --quick \
      --routines \
      --triggers \
      --default-character-set=utf8mb4 \
      "$SOURCE_DB_NAME" >"$dump_file"
  fi

  echo "Dump created at: $dump_file"
}

import_dump() {
  local dump_file="${1:-}"

  if [[ -z "$dump_file" ]]; then
    echo "Please provide a dump file to import." >&2
    exit 1
  fi

  if [[ ! -f "$dump_file" ]]; then
    echo "Dump file not found: $dump_file" >&2
    exit 1
  fi

  require_command docker
  compose_up

  local mysql_args=(
    mysql
    -u"$TARGET_DB_USER"
    --default-character-set=utf8mb4
  )

  if [[ -n "$TARGET_DB_PASSWORD" ]]; then
    mysql_args+=(-p"$TARGET_DB_PASSWORD")
  fi

  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    "${mysql_args[@]}" \
    -e "CREATE DATABASE IF NOT EXISTS \`$TARGET_DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    "${mysql_args[@]}" \
    "$TARGET_DB_NAME" <"$dump_file"

  echo "Imported $dump_file into Docker MySQL database: $TARGET_DB_NAME"
}

command="${1:-}"

case "$command" in
  up)
    compose_up
    echo "Docker MySQL is ready on 127.0.0.1:$TARGET_DB_PORT"
    ;;
  dump)
    dump_source "${2:-$DEFAULT_DUMP_FILE}"
    ;;
  import)
    import_dump "${2:-}"
    ;;
  full)
    dump_file="${2:-$DEFAULT_DUMP_FILE}"
    dump_source "$dump_file"
    import_dump "$dump_file"
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $command" >&2
    usage
    exit 1
    ;;
esac
