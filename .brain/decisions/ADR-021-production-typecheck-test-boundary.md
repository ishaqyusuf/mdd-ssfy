# ADR-021: Keep production typecheck separate from Bun test compilation

## Status

Accepted

## Context

The sales package stores Bun tests beside production modules under `src/`. Its
production typecheck previously compiled every test fixture, so changes to
runtime contracts caused the package gate to fail on stale fixture shapes,
mock-call tuple inference, and obsolete `@ts-expect-error` comments. Bun runs
the tests directly and provides the test runtime types, making test compilation
and production compilation separate concerns.

## Decision

`packages/sales/tsconfig.json` excludes `src/**/*.test.ts` and
`src/**/*.test.tsx` from the production `typecheck` script. Bun test commands
remain the validation path for those files, and focused runtime tests must be
run for changed behavior.

## Consequences

- Production typecheck reports runtime source regressions without being coupled
  to fixture-only assumptions.
- Test type and behavior regressions are still visible through `bun test` and
  should not be hidden by skipping the focused suites.
- A future CI test-typecheck job can compile the test graph explicitly if the
  repository standardizes one.
