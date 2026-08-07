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
- Declare `bcrypt-ts` in each workspace that imports it (`@gnd/api`,
  `@gnd/auth`, and `@gnd/utils`) so the filtered install includes the runtime
  package instead of relying on the root workspace declaration.
- Regenerate `bun.lock` after the workspace manifest changes. Commit
  `506ad6d` added the direct `bcrypt-ts` declarations plus the mobile
  `react-mobile` and `react-dom-mobile` aliases without updating the lockfile,
  so Vercel's frozen filtered install failed before the build began. The
  repaired lockfile records all five manifest additions.
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
filesystem adapters behind conditional imports. Any workspace that directly
imports a runtime package must declare that package itself; a root-only
declaration is not available reliably to filtered workspace installs. After
any workspace manifest change, regenerate the lockfile with the repository's
declared Bun version and run the deployment's exact filtered frozen install
command before committing.

## Follow-up Validation

On 2026-08-07, the repaired lockfile passed
`bun install --filter @gnd/dashboard --frozen-lockfile --ignore-scripts` under
Bun `1.3.12`, matching the Bun release used by the failed Vercel deployment.
No application build was run locally; a fresh Vercel deployment remains the
production proof.

## Related Files

- `apps/dashboard/vercel.json`
- `apps/dashboard/next.config.mjs`
- `apps/api/src/index.ts`
- `apps/api/package.json`
- `apps/api/src/trpc/routers/dispatch.route.ts`
- `packages/auth/package.json`
- `packages/dev-logger/src/file-sink.ts`
- `packages/db/package.json`
- `packages/utils/package.json`
- `bun.lock`
- `.brain/features/sentry-observability.md`
