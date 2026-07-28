# Vercel Shared Ignore Excluded Web App Workspaces

## Summary
Dashboard deployment failed after the repository-level `.vercelignore` was
added for the standalone API deployment. The shared ignore file excluded
`apps/dashboard`, so Vercel removed the dashboard workspace before installing
and building the monorepo.

## Impact
- Turborepo discovered zero packages during the dashboard deployment.
- No dashboard build ran and `apps/dashboard/.next` was never created.
- The same ignore boundary also excluded the dealership and storefront app
  workspaces from their Vercel deployments.

## Root Cause
`.vercelignore` applies to every Vercel project built from the repository. It
contained app exclusions intended only to reduce the standalone API upload, but
Vercel applied those exclusions before the dashboard project ran `turbo build`.
Without `apps/dashboard/package.json`, Turbo could not discover
`@gnd/dashboard`.

## Fix
Removed application workspace exclusions from the shared `.vercelignore`.
Local state, secrets, generated output, and diagnostic artifacts remain
excluded.

## Prevention
- Added `scripts/vercel-deployment-boundary.test.ts`.
- The regression verifies that the API, dashboard, dealership, and storefront
  app roots remain available to shared Vercel uploads.

