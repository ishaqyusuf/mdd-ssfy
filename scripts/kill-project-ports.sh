#!/bin/sh

set -eu

ports=$(
  {
    printf '%s\n' "${GND_WWW_PORT:-3000}"
    printf '%s\n' "${GND_PORTLESS_PROXY_PORT:-3001}"
    printf '%s\n' "${GND_EXPO_PORT:-3002}"
    printf '%s\n' "${GND_EMAIL_PORT:-3003}"
    printf '%s\n' "${GND_API_PORT:-3004}"
    printf '%s\n' "${GND_WWW_PROD_PORT:-3005}"
    printf '%s\n' "${GND_DEALERSHIP_PORT:-3006}"
    printf '%s\n' "${GND_WEB_PORT:-3007}"
    printf '%s\n' "${GND_SITE_PORT:-3008}"
    printf '%s\n' "${GND_BACKLOG_PORT:-3009}"
    printf '%s\n' "${GND_PRISMA_STUDIO_PORT:-5556}"
  } | awk '
    $1 ~ /^[0-9]+$/ && $1 >= 1 && $1 <= 65535 {
      print $1
    }
  ' | sort -n -u
)

if [ -z "$ports" ]; then
  echo "No GND project ports found to kill."
  exit 0
fi

for port in $ports; do
  pids=$(lsof -ti "tcp:$port" 2>/dev/null || true)

  if [ -z "$pids" ]; then
    echo "Port $port is free."
    continue
  fi

  echo "Killing processes on port $port: $pids"
  kill -9 $pids 2>/dev/null || true
done
