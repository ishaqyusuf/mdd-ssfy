# TanStack Web Initialization

## Purpose
Track the creation of `apps/web`, the new TanStack Start project that begins the web migration with a functional login system and protected dashboard.

## Step Log
- 2026-05-07: Confirmed the monorepo uses Bun workspaces with apps under `apps/*`, shared packages under `packages/*`, and Turborepo tasks in `turbo.json`.
- 2026-05-07: Reviewed TanStack Start current docs for scratch setup, Vite plugin ordering, router configuration, server functions, HTTP-only sessions, and route-level auth guards.
- 2026-05-07: Created `apps/web/package.json` as workspace package `@gnd/web` with TanStack Start, TanStack Router, TanStack Query, Vite, React, TypeScript, and Zod.
- 2026-05-07: Added `apps/web/tsconfig.json` extending the shared `@gnd/tsconfig` base while switching this app to bundler module resolution required by Vite/TanStack Start.
- 2026-05-07: Added `apps/web/vite.config.ts` with the TanStack Start plugin before the React plugin and port `4300` as the default local dev target.
- 2026-05-07: Added the TanStack router entry at `apps/web/src/router.tsx` and root document route at `apps/web/src/routes/__root.tsx`.
- 2026-05-07: Added public `/` and `/login` routes.
- 2026-05-07: Added protected `_authenticated` route guard and first protected `/dashboard` page.
- 2026-05-07: Added session and auth server functions using TanStack Start server functions and secure HTTP-only session cookies.
- 2026-05-07: Added initial CSS for the public, login, and dashboard screens.
- 2026-05-07: Ran `bun install` from the repo root to add TanStack Start dependencies and update `bun.lock`.
- 2026-05-07: Ran `bun run --filter @gnd/web build`; build succeeded and generated `apps/web/src/routeTree.gen.ts`.
- 2026-05-07: Fixed typed `/login` redirect search params surfaced by `bun run --filter @gnd/web typecheck`.
- 2026-05-07: Ran `bun run --filter @gnd/web typecheck`; typecheck passed.
- 2026-05-07: Added root script `bun run web` to start only the new TanStack app through Turborepo.
- 2026-05-07: First `bun run web` attempt failed because the sandbox rejected binding Vite to `0.0.0.0:4300`.
- 2026-05-07: Updated the web dev script to bind through Vite's default localhost behavior on port `4300`.
- 2026-05-07: Started `bun run web` with approved local-server permissions; Vite served the app at `http://localhost:4300/`.
- 2026-05-07: Smoke checked `GET /` over localhost; response was `200`.
- 2026-05-07: Smoke checked `GET /dashboard` without a session; response was `307` to `/login?redirect=%2Fdashboard`.
- 2026-05-07: Smoke checked `GET /login?redirect=/dashboard`; response was `200`.
- 2026-05-07: Re-ran `bun install` after the dev-script update; install completed successfully.
- 2026-05-07: Re-ran `bun run --filter @gnd/web build` and `bun run --filter @gnd/web typecheck`; both passed.

## Current Auth Slice
- Login checks `GND_WEB_DEMO_EMAIL` and `GND_WEB_DEMO_PASSWORD`.
- Defaults are `admin@gnd.local` and `change-me-in-env` for local bootstrap only.
- Successful login writes a `gnd-web-session` HTTP-only session cookie.
- `/dashboard` is protected by the `_authenticated` route guard.
- Unauthenticated dashboard access redirects to `/login?redirect=/dashboard`.
- Logout clears the session and redirects to `/login`.

## Follow-Up Plan
- Replace temporary env credential validation with the production user store from `@gnd/auth` and `@gnd/db`.
- Add rate limiting and audit logging before exposing the login route beyond local migration work.
- Add app shell navigation after the login and protected dashboard slice is verified.
- Migrate the first production page only after auth, redirects, and refresh persistence pass local QA.
