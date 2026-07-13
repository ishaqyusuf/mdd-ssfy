# Plan: Mobile Door Size And House Package Parity

## Type
UX/UI

## Status
In Progress

## Created Date
2026-06-18

## Last Updated
2026-06-18

## Intake
- Intake File: brain/intake/2026-06-18-mobile-sales-form-website-parity.md
- Intake Item: Door size next-step fix and full mobile House Package Tool parity with website new sales form.

## Goal Or Problem
Door size selection currently does not reliably move to the next step, and the mobile House Package Tool step must expose all website new-sales-form selections and line-item behavior in a flat, clean mobile UX.

## Current Context
- Mobile workflow selector imports shared door/HPT helpers from `@gnd/sales/sales-form-core`.
- Mobile route `apps/expo-app/src/app/(sales)/invoices/door-size.tsx` opens `DoorSizePickerScreen`.
- Current HPT mobile section is documented in `brain/features/mobile-invoice-form.md` as having package totals, active-door chips, add-size behavior, and stacked editable rows.
- Website parity logic is increasingly shared through `packages/sales/src/sales-form/ui/workflow/*`, including door/HPT and row patch helpers.

## Proposed Approach
Fix the door-size transition path first, then audit the mobile HPT editor against website new-sales-form behavior and wire any missing selections/actions through package-owned helpers. Keep UI in a dedicated HPT/door module and keep line patch generation out of screen JSX.

## Implementation Steps
- Inspect current door-size picker route/store state handoff and fix the path that prevents `Next` from advancing.
- Add or reuse centered floating `Proceed` for door multi-select when at least one item is selected.
- Preserve selected door size variants and pricing fields in line patches.
- Audit website HPT controls against mobile HPT controls: doors, sizes, quantities, cost/sales price, add-size, add-door where supported, supplier-sensitive price data, totals, and row editing.
- Add missing HPT mobile controls using flat sections/rows.
- Ensure HPT line totals and save payloads continue to use shared package patch helpers.
- Keep app-specific UI state and navigation separate from shared pricing/patch logic.

## Affected Files Or Areas
- `apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx`
- `apps/expo-app/src/app/(sales)/invoices/door-size.tsx`
- `apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-modal-store.ts`
- `apps/expo-app/src/features/sales/invoice-form/steps/house-package-tool/*`
- `apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts`
- `packages/sales/src/sales-form/ui/workflow/*` only if a missing pure helper should be shared

## Acceptance Criteria
- Door size selection and `Next` reliably move to the next workflow step.
- Door multi-selection shows a floating centered `Proceed` when at least one item is selected.
- Door/HPT selections persist correctly into line item state and save payloads.
- Mobile HPT exposes website-supported selection, quantity, pricing, totals, add-size, and add-door behavior where applicable.
- HPT UI is flat, clean, and easy to navigate on mobile.
- Screen components remain thin and dedicated HPT/door modules own the feature UI.

## Test Plan
- Manual QA only for UI behavior in the running app, per user request.
- Recommended static checks after implementation: targeted `rg` scans for door/HPT patch helpers and scoped `git diff --check` on touched files.
- Add focused pure-helper tests only if new package helpers are introduced.

## Brain Update Requirements
- Update `brain/features/mobile-invoice-form.md`.
- Update `brain/progress.md`.
- Update `brain/api/contracts.md` only if door/HPT payload contracts change.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Door-size picker may rely on modal store state that is lost across route navigation.
- Supplier-sensitive pricing must not be guessed; reuse existing helper semantics.
- HPT parity can grow large; keep this slice scoped to door/HPT only.

## Open Questions
- None.

## Linked Task
- Task Title: Mobile Door Size And House Package Parity
- Task File: brain/tasks/backlog.md
