# System Overview

## Purpose
High-level description of the runtime surfaces and operating model of the GND monorepo.

## Current State
- The repository is a Turborepo + Bun monorepo.
- Core delivery surfaces include a web app, API service, Expo mobile app, and supporting web/backlog apps.
- Business logic is progressively moving into shared packages so web, API, and mobile flows can reuse the same domain rules.
- `.brain/` is the shared planning and memory layer for ongoing execution.
- Local app/dev surfaces use explicit project-owned ports in the `3010-3019` range: `www` on `3010`, shared `portless` proxy on `3011`, Expo Metro on `3012`, email preview on `3013`, API on `3014`, the production-env www smoke profile on `3015`, dealership on `3016`, `apps/web` on `3017`, site on `3018`, and backlog on `3019`; Docker infrastructure ports remain separate.

## Primary Runtime Surfaces
- `apps/www`: main business web workflows
- `apps/api`: API endpoints, query/mutation orchestration, schema validation integration
- `apps/expo-app`: mobile workflows
- `packages/*`: shared domain, infrastructure, and UI modules

## Operational Priorities
- Preserve correctness for revenue-impacting sales flows.
- Reduce duplication across web, API, and mobile surfaces.
- Keep changes incremental and compatible with active production paths while migrations are in progress.
