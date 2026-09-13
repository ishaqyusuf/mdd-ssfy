# Task: Progressive AI Chat T12 — Generate and manage PDF artifacts

## Status
In Progress

## Priority
High

## Created Date
2026-09-12

## Last Updated
2026-09-13

## Global Ticket
- Ticket Position: 12/20

## Plan File
[Progressive AI Chat plan](../../plans/2026-09-11-feature-progressive-ai-chat-platform.md)

## Source Context
GND artifact workflow built on Midday's invoice canvas pattern and existing GND document/PDF authorities. Depends on T02, T09, T10, and T17.

## Implementation Progress
- Completion: 71%
- Current Checklist: 5/7 — durable generation, scoped storage, cancellation,
  retries, expiry cleanup, and rendering boundaries are implemented
- Blockers: T02, T09, and T10 are complete. T17 remains the activation gate for
  approval and idempotent artifact execution, but does not block implementing the
  scoped query, job, storage, and rendering boundaries.

## Implementation Decisions
- Reuse `SalesDocumentSnapshot` as the durable PDF job and source-revision record;
  do not create a parallel Assistant-only PDF queue.
- Reuse the canonical Sales v2 renderer and `StoredDocument` registry. Assistant
  results expose only opaque snapshot/document IDs and authenticated canvas actions,
  never Blob paths or model-authored URLs.
- Keep readiness/status reads independently executable. Generation remains subject
  to T17's explicit approval path before model-triggered artifact work is enabled.
- Keep email, SMS, WhatsApp, and public-link sending outside this ticket.

## Implementation Checklist
- [x] Register scoped current-snapshot lookup and readiness tools for supported Sales documents.
- [x] Trigger durable PDF jobs with IDs, progress, retries, cancellation, and outcome retrieval.
- [x] Store generated artifacts through `StoredDocument` with scoped preview/download links and cleanup.
- [x] Render PDF status and preview in the artifact canvas with source revision and expiry.
- [ ] Add approved statement/report PDFs only after their underlying queries and permissions are proven.
- [x] Keep generation separate from email/SMS/WhatsApp sending and require explicit send workflows later.
- [ ] Verify blocked readiness, stale source revision, denied download, reconnect, duplicate request, and app-output parity.

## Validation Evidence
- `assistant-catalog-v5` adds the permission-scoped
  `documents_get_sales_pdf_status` read tool with order/quote family validation,
  source freshness, durable snapshot states, revision, expiry, and document entity.
- The authenticated Assistant document route now reauthorizes generated Sales PDF
  ownership against current Sales row scope and proxies only trusted HTTPS Vercel
  public Blob URLs; private conversation documents retain their existing path.
- Durable jobs use `SalesDocumentSnapshot` plus a unique provider run ID, a
  renewable dispatch claim, one stable Trigger idempotency key, bounded retries,
  actor/scope/source reauthorization inside the worker, and terminal lifecycle
  recovery when provider and database completion race.
- Price-bearing invoice, quote, and order-packing documents require both
  `viewOrders` and `viewOrderPayment`. Production and packing-slip documents omit
  prices and require `viewOrders` only, including worker and download reauthorization.
- Failed uploads retain a `cleanup_required` recovery handle. An hourly cleanup
  task recovers abandoned claims, invalidates seven-day expired snapshots, deletes
  their Vercel Blob objects, and tombstones the durable document record.
- Final validation: the complete Assistant suite passes 88 tests / 393 assertions;
  focused database and Sales suites pass 18 tests / 52 assertions; PDF lifecycle
  and cleanup suites pass 9 tests / 22 assertions. Database typechecking passes.
  API and jobs typechecking reach only existing unrelated failures in
  `packages/sales/src/copy-sales.ts` and duplicated React types in shared UI.
- Independent spec and standards reviews pass after authorization, dispatch-race,
  retry, cancellation, and cleanup findings were resolved.
- Remaining checklist work is limited to adding statement/report families after
  their query permissions are proven and completing reconnect/app-output parity
  evidence. Tool activation remains owned by T17.
