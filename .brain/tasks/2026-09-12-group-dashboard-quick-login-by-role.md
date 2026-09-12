# Task: Group Dashboard Quick Login By Role

## Status
Done

## Priority
Medium

## Created Date
2026-09-12

## Last Updated
2026-09-12

## Global Ticket
- Ticket Position: 1/1

## Source Context
Improve the development Quick Login dropdown by grouping employees under collapsible role labels such as `Admin (7)`, with every role group collapsed by default.

## Implementation Progress
- Completion: 100%
- Current Checklist: 6/6 — Complete code review, Brain documentation, and commit
- Blockers: None

## Implementation Checklist
- [x] Inspect the existing Quick Login component and the closest Midday/shared UI patterns
- [x] Add focused grouping regression coverage
- [x] Implement role-grouped, default-collapsed Quick Login sections
- [x] Run focused source, formatting, and type validation
- [x] Verify the interaction visually and by keyboard in the browser
- [x] Complete code review, Brain documentation, and commit

## Validation Evidence
- Existing implementation confirmed in `apps/dashboard/src/components/quick-login.tsx`.
- Shared `@gnd/ui/accordion` and Midday login accordion patterns inspected.
- `bun test apps/dashboard/src/components/quick-login-groups.test.ts` — 2 tests passed.
- `bunx biome check --formatter-enabled=false ...` passed for all three changed source/test files; `git diff --check` passed.
- Dashboard typecheck completed with the repository's existing broad TypeScript failures; no diagnostics named either changed Quick Login source file.
- Local browser at `/login` showed 12 role/count headers, all collapsed by default. Keyboard Enter expanded `Admin (4)` to its four employees, Space collapsed it, and the browser console reported no errors.
- Independent standards and specification reviews reported no findings.
