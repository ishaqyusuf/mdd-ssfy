# Plan: Mobile Invoice Save Web Control Diff

## Type
Bug Fix

## Status
Proposed

## Created Date
2026-06-24

## Last Updated
2026-06-24

## Intake
- Intake File: brain/intake/2026-06-24-mobile-invoice-save-web-control-diff.md
- Intake Item: Compare the still-failing mobile invoice save against the working web new sales form and produce an updated detailed fix outline.

## Goal Or Problem
Mobile invoice creation can still time out with `Could not finish saving this invoice. Check your connection and try again.` even though the web new sales form save path works. The next fix should stop treating the timeout as an isolated mobile UI problem and instead compare the working web path to the mobile path across payload composition, transport, API save stages, and post-save return behavior.

## Current Context
- The completed plan `brain/plans/2026-06-23-bug-fix-mobile-invoice-save-stuck.md` added a 30 second mobile save timeout, unbatched Expo mutation transport, bounded post-save document/cache work, and store-driven save state so the UI can recover from a hung request.
- The broader plan `brain/plans/2026-06-23-bug-fix-mobile-invoice-web-parity-and-save-reliability-gap-closure.md` already tracks the larger web/mobile parity surface. This plan narrows the next implementation slice to save reliability only.
- Web final save in `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx` validates, takes a manual save lock, composes the payload through `toSaveDraftInput(record, false)`, calls `newSalesForm.saveFinal`, handles stale/server errors, runs post-save success/inventory configuration, clears selected-customer query state, and routes to edit mode after create.
- Web payload mapping in `apps/www/src/components/forms/new-sales-form/mappers.ts` calls `composeSalesFormSavePayload` with `surface: "www"` and `pricing.mode: "coefficient"`.
- Mobile create/save in `apps/expo-app/src/features/sales/invoice-form/components/invoice-form-screen.tsx` validates, marks saving, calls `runMobileInvoiceSaveRequest(() => saveFinal(actions.buildSavePayload(false)))`, marks saved or failure, clears recovery keys, and routes to edit mode after create.
- Mobile payload mapping in `apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts` calls shared `toSalesFormSaveDraftPayload(...)`, which recomputes summary through shared sales-form core and normalizes order inbound status.
- Expo tRPC mutations are already unbatched through `httpLink` in `apps/expo-app/src/trpc/client.tsx`, and the target API URL comes from `apps/expo-app/src/lib/base-url.ts`.
- API `saveDraftNewSalesForm` and `saveFinalNewSalesForm` both parse schema input, await `saveNewSalesFormInternal`, then await bounded post-save tasks for document snapshot expiration, inventory sync queueing, and document warmup queueing in `apps/api/src/db/queries/new-sales-form.ts`.

## Proposed Approach
Use the working web save path as the control. For the same representative invoice payload, prove whether mobile differs before API ingress, at tRPC/auth/headers/base URL, in payload shape, in schema parsing, inside `saveNewSalesFormInternal`, or while awaiting post-save tasks. Instrument only enough to compare the paths, then patch the first proven difference.

Do not increase the mobile timeout as the primary fix. The desired outcome is that mobile receives the same persisted save result promptly under the same API contract that the working web form uses.

## Implementation Steps
- Establish a control fixture:
  - Pick one simple invoice that saves successfully on web.
  - Pick one mixed invoice shape if the reported failing case uses HPT, moulding, service, or shelf rows.
  - Record whether each fixture is order vs quote and create vs edit.
- Compare web and mobile payload composition:
  - Add or run a focused parity test comparing web `toSaveDraftInput(...)` and mobile/shared `toSalesFormSaveDraftPayload(...)` for the same normalized record.
  - Confirm differences in `surface`, pricing mode, `summary`, `inventoryStatus`, `version`, `meta`, grouped rows, and line titles are intentional.
  - If mobile omits a field the API save path expects from the working web payload, move the correction into shared sales-form package helpers where possible.
- Trace mobile transport against web:
  - Log or expose the resolved mobile tRPC URL from `getBaseUrl()` in development.
  - Include a save attempt id in mobile logs and, if feasible, in tRPC headers or payload metadata.
  - Confirm mutation requests include the same auth expectation as web-equivalent app requests: `x-app-authorization` and `x-trpc-source: app`.
  - Verify the failing device is not hitting a stale local port, preview URL, production, or the wrong LAN host.
- Add API stage timing scoped to new-sales-form save:
  - Log request id, source surface if available, schema parse start/end, `saveNewSalesFormInternal` start/end, transaction start/end, grouped-line write stages, extra-cost/payment/tax write stages, post-save task start/end, and response return.
  - Keep logs dev-safe and avoid dumping customer/order payload details.
  - Ensure stage timing can distinguish no ingress, schema/auth failure, core transaction slowness, and post-save slowness.
- Compare the working web control request and failing mobile request:
  - Same API endpoint should be hit: `newSalesForm.saveFinal` or `saveDraft`.
  - Same schema should accept both payloads.
  - Same core save stage should return within an acceptable budget.
  - Post-save tasks should not hold the mobile response beyond the save timeout.
- Patch based on the first proven divergence:
  - If no API ingress, fix mobile base URL, app variant env, dev port, auth token, or network reachability.
  - If schema parse differs, align shared payload mapping or mobile validation/error copy.
  - If core transaction is slow only for mobile payloads, isolate the slow row family and optimize that DB stage.
  - If post-save still delays the response, make optional post-save work truly response-nonblocking or reduce its bounded wait.
  - If the save actually succeeds after mobile times out, add idempotency or duplicate-submit guardrails before changing retry UX.
- Update user-facing mobile error classification:
  - Preserve retryable connection copy for real network/timeout misses.
  - Show stale/conflict copy for version errors.
  - Show validation copy for schema/business validation failures.
  - Show server-error copy for API failures after ingress.
- Keep scope out of broad parity polish:
  - Do not implement Save & Close, Save & New, print/PDF, payment, or full profile/address parity in this bug-fix slice unless they are proven to block save completion.

## Affected Files Or Areas
- `apps/expo-app/src/features/sales/invoice-form/components/invoice-form-screen.tsx`
- `apps/expo-app/src/features/sales/invoice-form/store/use-invoice-form-store.ts`
- `apps/expo-app/src/features/sales/invoice-form/api/use-invoice-form-actions.ts`
- `apps/expo-app/src/features/sales/invoice-form/lib/mobile-save-timeout.ts`
- `apps/expo-app/src/lib/base-url.ts`
- `apps/expo-app/src/trpc/client.tsx`
- `apps/www/src/components/forms/new-sales-form/new-sales-form.tsx`
- `apps/www/src/components/forms/new-sales-form/mappers.ts`
- `apps/api/src/db/queries/new-sales-form.ts`
- `apps/api/src/schemas/new-sales-form.ts`
- `packages/sales/src/sales-form/application/record-normalization.ts`
- `packages/sales/src/sales-form/composer/index.ts`
- `brain/features/mobile-invoice-form.md`
- `brain/api/contracts.md`

## Acceptance Criteria
- A mobile save attempt can be correlated to API logs with one request/save attempt id, or can be conclusively marked as never reaching the API.
- The resolved mobile API URL is visible in dev logs or a dev-only diagnostics surface during save debugging.
- A focused parity test or diagnostic output compares web and mobile save payloads for the same invoice fixture.
- The actual timeout source is identified as one of: mobile target/transport, auth/header, schema/payload, core transaction, post-save await, or client timeout after server success.
- Mobile create invoice succeeds for the same simple invoice fixture that succeeds on web.
- Mobile create invoice succeeds for the same representative mixed-line fixture that succeeds on web, or the remaining failing row family is explicitly identified.
- Mobile does not show generic connection copy for known schema/stale/server failures after API ingress.
- Optional post-save work cannot keep the mobile response open past the configured mobile save timeout.

## Test Plan
- Unit tests:
  - mobile base URL resolution for dev host, preview build, explicit base URL, and missing host cases
  - mobile save error classification helper
  - payload comparison fixture for web mapper vs shared/mobile mapper
- API tests:
  - save simple mobile payload through `newSalesForm.saveFinal`
  - save mixed HPT/service/moulding/shelf mobile payload through `newSalesForm.saveFinal`
  - assert post-save task timeout/bounding behavior does not block response indefinitely
- Package tests:
  - `toSalesFormSaveDraftPayload` summary/inventory-status normalization
  - grouped row identity and metadata preservation for the failing fixture
- Manual QA:
  - Create invoice on physical device or simulator against the same dev stack as web.
  - Create quote on mobile.
  - Edit and resave an existing invoice.
  - Retry after a forced timeout/network miss and confirm no duplicate invoice is created.

## Brain Update Requirements
- Update `brain/features/mobile-invoice-form.md` with the verified save path, diagnosed root cause, and any new diagnostics/error classification behavior.
- Update `brain/api/contracts.md` if request ids, headers, payload metadata, save response timing, or post-save behavior become part of the API contract.
- Update `brain/progress.md` after implementation with changed files, checks run, and unresolved device QA gaps.

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
- The diagnosed timeout source with evidence
- Whether the failing device/build hit the expected API URL

## Risks / Edge Cases
- Mobile may be hitting a different host/port/build than the web control, making code-level comparison misleading until target diagnostics are captured.
- The original mobile request may eventually commit after the client timeout; retries need duplicate-submit/idempotency review.
- A payload parity test may reveal broader new-sales-form differences that are not necessary to fix the save timeout.
- Logging payloads can expose customer/order data; diagnostics must use summaries or sanitized snapshots.
- Moving post-save work out of the awaited response path can hide failures unless follow-up job/log visibility remains intact.

## Open Questions
- TODO: Is the persistent timeout happening on physical device, simulator, Expo Go/dev client, or preview build?
- TODO: Does the API log ingress for the exact timed-out mobile attempt?
- TODO: Which invoice shape times out most reliably: simple, HPT, moulding, service, shelf, mixed, quote, or edit?
- TODO: Does retry create duplicate records or update the same draft/final order?

## Linked Task
- Task Title: Mobile Invoice Save Web Control Diff
- Task File: brain/tasks/roadmap.md
