# Bug: Dashboard Vercel Build Cache Thrashing

## Date

2026-08-06

## Problem

Dashboard production deployments took 7-9 minutes even for narrow application
changes. Consecutive deployments installed 2,926 packages and performed cold
Next.js/Turbopack compilations instead of restoring incremental build state.

## Root Cause

Each deployment produced a 1.69 GB Vercel build cache, exceeding the project's
effective 1.50 GB limit. Vercel invalidated the cache after deployment, forcing
the next deployment to start clean. The default root `bun install` installed
every monorepo workspace, while development-only filesystem logging was
statically imported into the dashboard's embedded API and caused Turbopack to
trace the whole project. Production Sentry builds also widened the source-map
upload set to 2,715 files, and Prisma Client generation ran during both install
and the DB prerequisite build.

## Fix

- Configure the dashboard Vercel project to install only the
  `@gnd/dashboard` workspace dependency graph with a frozen lockfile.
- Load the development file sink only after development guards pass and mark
  its dynamic reads as intentionally excluded from Turbopack tracing.
- Treat the root Vercel postinstall as the single Prisma generation step and
  skip the redundant DB build command on Vercel.
- Keep Sentry source-map upload enabled while disabling the widened client file
  upload set.

## Prevention

Inspect two consecutive preview or production deployment logs after changes to
the workspace graph. The first build must produce a cache below the platform
limit, and the second must restore it. Treat Turbopack whole-project tracing
warnings as release blockers for production imports, and keep development-only
filesystem adapters behind conditional imports.

## Related Files

- `apps/dashboard/vercel.json`
- `apps/dashboard/next.config.mjs`
- `apps/api/src/index.ts`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `packages/dev-logger/src/file-sink.ts`
- `packages/db/package.json`
- `.brain/features/sentry-observability.md`
