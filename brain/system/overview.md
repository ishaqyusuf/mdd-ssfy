# System Overview

## Purpose
High-level description of the runtime surfaces and operating model of the GND monorepo.

## Current State
- The repository is a Turborepo + Bun monorepo.
- Core delivery surfaces include a web app, API service, Expo mobile app, and supporting web/backlog apps.
- Business logic is progressively moving into shared packages so web, API, and mobile flows can reuse the same domain rules.
- `brain/` is the shared planning and memory layer for ongoing execution.
- Browser-facing local dev surfaces use `portless` with fixed `PORTLESS_APP_PORT` values in the `4000-4999` range so Expo can target the child app port explicitly when deriving local base URLs.

## Primary Runtime Surfaces
- `apps/www`: main business web workflows
- `apps/api`: API endpoints, query/mutation orchestration, schema validation integration
- `apps/expo-app`: mobile workflows
- `packages/*`: shared domain, infrastructure, and UI modules

## Operational Priorities
- Preserve correctness for revenue-impacting sales flows.
- Reduce duplication across web, API, and mobile surfaces.
- Keep changes incremental and compatible with active production paths while migrations are in progress.
