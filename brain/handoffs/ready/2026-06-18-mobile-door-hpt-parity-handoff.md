# Brain Handoff: Mobile Door Size And House Package Parity

## Status
Ready

## Source Plan
brain/plans/2026-06-18-ux-ui-mobile-door-hpt-parity.md

## Task
- Task Title: Mobile Door Size And House Package Parity
- Task File: brain/tasks/in-progress.md

## Recommended Agent
- Agent: antigravity
- Reason: Mobile workflow navigation, door-size picker behavior, and flat HPT editor parity require interaction-focused UI work.

## Goal
Fix the mobile door-size next-step bug and bring the mobile Door/HPT workflow to website new-sales-form parity while keeping logic modular and using shared sales-form-core helpers where possible.

## Review Unit
- Type: task
- Linked Tasks: Mobile Door Size And House Package Parity
- Grouping Reason: None
- Depends On Queue Items: None
- Approval Boundary: Approve only after every linked task in this review unit is implemented, reviewed, landed, and validated.

## Context To Read First
- brain/plans/2026-06-18-ux-ui-mobile-door-hpt-parity.md
- brain/features/mobile-invoice-form.md
- brain/api/contracts.md
- apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx
- apps/expo-app/src/app/(sales)/invoices/door-size.tsx
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-modal-store.ts
- apps/expo-app/src/features/sales/invoice-form/steps/house-package-tool
- packages/sales/src/sales-form/ui/workflow/workflow-row-patches.ts
- packages/sales/src/sales-form/ui/workflow/workflow-sync-patches.ts

## Implementation Instructions
1. Inspect the door-size picker route/modal-store handoff and fix the path that prevents `Next` from advancing.
2. Add or reuse centered floating `Proceed` for door multi-select when at least one item is selected.
3. Preserve selected door size variants and pricing fields in line item patches.
4. Audit website HPT controls against current mobile HPT controls.
5. Add missing HPT mobile controls for doors, sizes, quantities, cost/sales price, add-size, add-door where supported, supplier-sensitive pricing data, totals, and row editing.
6. Keep HPT UI flat with clear mobile sections/rows.
7. Ensure HPT line totals and save payloads continue through shared package patch helpers.

## Acceptance Criteria
- Door size selection and `Next` reliably move to the next workflow step.
- Door multi-selection shows a floating centered `Proceed` when at least one item is selected.
- Door/HPT selections persist correctly into line item state and save payloads.
- Mobile HPT exposes website-supported selection, quantity, pricing, totals, add-size, and add-door behavior where applicable.
- HPT UI is flat, clean, and easy to navigate on mobile.
- Screen components remain thin and dedicated HPT/door modules own the feature UI.

## Files Or Areas Likely Involved
- apps/expo-app/src/features/sales/invoice-form/components/workflow-step-selector.tsx
- apps/expo-app/src/app/(sales)/invoices/door-size.tsx
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-modal-store.ts
- apps/expo-app/src/features/sales/invoice-form/steps/house-package-tool/*
- apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts
- packages/sales/src/sales-form/ui/workflow/* only if a missing pure helper should be shared

## Do Not Change
- Do not invent supplier-sensitive pricing semantics; reuse existing helper behavior.
- Do not run UI/browser automation or start a dev server unless explicitly requested by the user.
- Do not broaden into custom, moulding, or shelf parity; those have separate handoffs.
- Do not move linked tasks to done.
- Do not broaden the scope beyond this handoff.

## Required Checks
- Manual QA by the user in the already-running app.
- Targeted scans for door/HPT patch helper usage.
- Scoped `git diff --check` on touched files.
- Focused pure-helper tests only if package helpers are introduced or changed.

## Queue Item
/Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-door-hpt-parity.json

## Brain Update Contract
After implementation, update only the relevant files:

- `brain/progress.md`: summarize completed implementation work.
- `brain/features/mobile-invoice-form.md`: update door/HPT behavior.
- `brain/api/contracts.md`: update only if door/HPT payload contracts change.
- `brain/tasks/in-progress.md`: keep the linked task in progress.

Do not move linked tasks to `done`. `brain-review-handoff` owns final approval for the review unit.

## Completion Notes
Fill this in after implementation:

- Changed files:
- Checks run:
- Brain docs updated:
- Unresolved issues:
