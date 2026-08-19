# Handoff Ticket: Optional Address Line 1 In Sales Customer Forms

## Status
Completed

## Source Plan
`.brain/plans/2026-08-19-bug-fix-sales-address-line-one-optional.md`

## Assigned Agent
- Agent: `gpt-5.6-terra`
- Why: Small cross-layer validation parity fix with existing customer/address tests.

## Priority
Medium

## Review Unit
- Type: task
- Linked Task: Optional Address Line 1 In Sales Customer Forms
- Depends On: None
- Approval Boundary: Review and land this ticket independently.

## Goal
Allow customer, billing-address, and shipping-address forms opened from the new sales form to save with Address Line 1 empty.

## Read First
- `.brain/plans/2026-08-19-bug-fix-sales-address-line-one-optional.md`
- `.brain/features/sales-customer-dual-address.md`
- `apps/dashboard/src/actions/schema.ts`
- `apps/api/src/schemas/customer.ts`
- `apps/dashboard/src/components/forms/customer-form/customer-address-fields.tsx`

## Implementation Route
1. Add client/API failing tests for blank Address Line 1 in new-sales-form customer and address-edit modes.
2. Remove matching sales/customer form refinements on both sides.
3. Align address-pane/assignment schemas if the same visible form submits through them.
4. Preserve all other customer/profile/conflict validation and other address fields.
5. Prove storefront checkout requirements are unchanged.

## Acceptance Criteria
- New-sales-form customer creation and billing/shipping edits save with blank Address Line 1.
- Client and API validation agree.
- Other entered fields and address ownership persist on reopen.
- Storefront checkout validation is unchanged.

## Do Not Change
- Do not make unrelated checkout/delivery schemas optional.
- Do not change the database schema.
- Do not broaden into customer form redesign.
- Do not move the linked task to done; review owns final closure.

## Required Checks
- Focused dashboard schema tests.
- `bun test apps/api/src/db/queries/customer.business-name.test.ts apps/api/src/db/queries/customer.sales-address.test.ts`
- `bun run --filter @gnd/api typecheck`
- `bun run --filter @gnd/dashboard typecheck`
- Manual new-sales-form address save/reopen proof.

## Brain Update Contract
After implementation, update `.brain/features/sales-customer-dual-address.md`, `.brain/api/contracts.md`, and `.brain/progress.md`. Keep the task in progress until review approval.

## Completion Report
- Changed files: dashboard/API customer schemas plus focused API coverage.
- Checks: focused schema tests pass.
- Manual evidence: not claimed.
- Brain docs: sales customer/address feature, API contract, task, and progress
  ledgers updated.
- Unresolved issues: none in the scoped behavior.
- Skipped acceptance criteria: manual/browser save and reopen proof, by request.
