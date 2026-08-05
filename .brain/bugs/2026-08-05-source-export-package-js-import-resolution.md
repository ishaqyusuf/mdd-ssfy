# Source-export Package JavaScript Import Resolution

## Status

Resolved in the working tree on 2026-08-05.

## Symptom

The dashboard returned HTTP 500 during Turbopack compilation because
`@gnd/errors` and `@gnd/observability` exported TypeScript source while their
internal imports referenced emitted `.js` filenames that did not exist.

## Root cause

The new packages use Bun workspace exports pointing directly at `src/index.ts`
and `moduleResolution: "Bundler"`. Their relative imports were authored using
the NodeNext output convention (`./module.js`). Turbopack followed those source
paths literally instead of remapping them to the adjacent `.ts` files.

## Fix and prevention

- Converted internal relative imports in the source-exported error,
  observability, and transaction modules to extensionless source imports.
- Aligned the database package TypeScript resolver with its source-exported,
  bundler-consumed runtime contract.
- Added an adoption regression that recursively rejects emitted `.js` relative
  imports in the affected source packages.

## Validation

- Before the fix, `GET /login/v2` returned HTTP 500 with `Can't resolve
  './app-error.js'`.
- After restarting only the dashboard app, the HTTPS route returned HTTP 200
  with no module-resolution diagnostic.
- 26 focused error, observability, transaction, and adoption tests pass.
- Error, observability, and database package typechecks pass.

