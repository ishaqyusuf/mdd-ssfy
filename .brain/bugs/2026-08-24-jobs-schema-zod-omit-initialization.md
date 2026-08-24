# Bug: Jobs schema Zod omit initialization failure

## Date

2026-08-24

## Problem

The Vercel dashboard build compiled successfully but failed while collecting
configuration for `/api/trpc/[...trpc]`. Next 16 Turbopack threw
`Cannot read properties of undefined (reading 'def')` while evaluating the new
legacy sales inventory migration queue schema in `@gnd/jobs/schema`.

## Root Cause

The public queue input schema was derived from the Trigger worker schema with
Zod `.omit({ actor: true }).extend(...)` during aggregate tRPC router module
initialization. The module loaded under Bun, but this production-bundle pattern
repeated the bundler-sensitive Zod initialization failure documented in
`.brain/bugs/2026-08-05-inventory-router-zod-omit-initialization.md`.

## Fix

Define the actor-free legacy migration fields once and construct the worker and
queue schemas independently from that shared field object. This preserves the
queue contract while removing the module-initialization `.omit()` call. A
focused source regression prevents reintroducing the unsafe derivation.

## Prevention

Do not derive schemas with Zod `.omit()` at module initialization in source
packages consumed by the Next 16 Turbopack aggregate router. Share declarative
field objects and construct each exported object schema explicitly. Keep a
focused regression at each previously failing boundary.

## Related Files

- `packages/jobs/src/schema.ts`
- `packages/jobs/src/schema.test.ts`
- `apps/api/src/trpc/routers/inventories.route.ts`
- `.brain/bugs/2026-08-05-inventory-router-zod-omit-initialization.md`
