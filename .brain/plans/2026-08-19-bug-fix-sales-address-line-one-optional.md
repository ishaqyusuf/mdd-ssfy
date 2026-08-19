# Plan: Optional Address Line 1 In Sales Customer Forms

## Type
Bug Fix

## Status
Done

## Created Date
2026-08-19

## Last Updated
2026-08-19

## Recommended Codex Agent
- Agent: `gpt-5.6-terra`
- Reason: This is a small client/API schema parity change with existing customer-address tests.

## Goal Or Problem
Allow the customer/address sheet opened from the new sales form to save when Address Line 1 is empty.

## Current Context
- Address fields are structurally optional, but both dashboard and API schemas add conditional Address Line 1 errors for sales-linked billing/shipping forms.
- The sales form opens the shared customer sheet for customer creation and billing/shipping address edits, so client and server rules must change together.
- Storefront checkout has its own required shipping-address schemas and is outside this request.

## Proposed Approach
Remove only the Address Line 1 required refinements from the shared sales/customer form paths used by the new sales form. Keep existing customer-name/business-name/profile/conflict validation and preserve optional address metadata/Google-place mapping.

## Implementation Steps
1. Add client and API schema regressions proving sales-linked customer creation, billing edit, shipping edit, and same-as-billing flows accept an empty `address1`.
2. Remove the matching `address1` refinements from `createCustomerSchema` and `upsertCustomerSchema`.
3. Audit `salesAddressPaneSchema` and `assignSalesAddressSchema`; if the same visible customer/address form submits through them, remove the duplicate requirement there as well so the API does not reject a client-valid payload.
4. Confirm persistence safely writes `null`/empty Address Line 1 without dropping recipient, route, city, state, postal code, place ID, or selected billing/shipping ownership.
5. Leave storefront account/checkout delivery-address requirements unchanged.

## Affected Files Or Areas
- `apps/dashboard/src/actions/schema.ts`
- `apps/api/src/schemas/customer.ts`
- `apps/dashboard/src/components/forms/customer-form/customer-address-fields.tsx` only if required-marker/help copy exists
- `apps/api/src/db/queries/customer.business-name.test.ts`
- `apps/api/src/db/queries/customer.sales-address.test.ts`
- Add a focused dashboard schema test beside `apps/dashboard/src/actions/schema.ts` if none exists.

## Acceptance Criteria
- The new-sales-form customer/address sheet saves with blank Address Line 1.
- Independent billing and shipping edits both work with blank Address Line 1.
- Client and API accept/reject the same payloads.
- Other entered address fields and sales address IDs persist and reopen correctly.
- Storefront checkout still requires the delivery address it requires today.

## Test Plan
- Focused dashboard schema tests.
- `bun test apps/api/src/db/queries/customer.business-name.test.ts apps/api/src/db/queries/customer.sales-address.test.ts`
- `bun run --filter @gnd/api typecheck`
- `bun run --filter @gnd/dashboard typecheck`
- Manual new-sales-form create/edit address save with Address Line 1 empty.

## Brain Update Requirements
- Update `.brain/features/sales-customer-dual-address.md` and `.brain/api/contracts.md` after implementation.
- Update `.brain/progress.md`; no database schema change is expected.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Report changed files, checks run, Brain docs updated, unresolved issues, and any skipped acceptance criteria.

## Risks / Edge Cases
- Do not accidentally weaken storefront checkout validation.
- A client-only change would still fail at the tRPC boundary.

## Open Questions
None.

## Linked Task
- Task Title: Optional Address Line 1 In Sales Customer Forms
- Task File: `.brain/tasks/backlog.md`
