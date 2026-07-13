# New Sales Form Migration Gate

Date: 2026-05-23
Status: Active
Owner: Sales Form Rebuild Team

## Command

```bash
bun run test:new-sales-form-migration
```

## What It Runs

- Shared sales package workflow/domain/composer tests.
- Dealer persistence/query tests.
- `@gnd/dealership` typecheck.
- `@gnd/www` typecheck as a watched-file signal.

## Expected Pass Shape

- Package tests pass.
- Dealer tests pass.
- Dealership typecheck exits with code 0.
- `www` typecheck may still report unrelated baseline workspace errors.
- The gate passes only when no watched migration file appears in the `www`
  typecheck output.

## Watched Migration Areas

- `apps/www/src/components/forms/new-sales-form/**`
- `apps/www/src/env.mjs`
- `packages/sales/src/sales-form/contracts/**`
- `packages/sales/src/sales-form/ui/workflow/**`
- `packages/sales/src/sales-form/ui/shell/sales-form-shell.tsx`

## Failure Rule

Stop the phase immediately if:

- Any package or dealer test fails.
- Dealership typecheck fails.
- The `www` output mentions a watched migration file.

Do not continue to browser phases until this command is green.
