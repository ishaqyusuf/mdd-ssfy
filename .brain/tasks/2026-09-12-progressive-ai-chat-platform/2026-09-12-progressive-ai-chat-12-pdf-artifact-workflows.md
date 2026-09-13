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
- Completion: 29%
- Current Checklist: 2/7 — scoped readiness and artifact-canvas access
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
- [ ] Trigger durable PDF jobs with IDs, progress, retries, cancellation, and outcome retrieval.
- [ ] Store generated artifacts through `StoredDocument` with scoped preview/download links and cleanup.
- [x] Render PDF status and preview in the artifact canvas with source revision and expiry.
- [ ] Add approved statement/report PDFs only after their underlying queries and permissions are proven.
- [ ] Keep generation separate from email/SMS/WhatsApp sending and require explicit send workflows later.
- [ ] Verify blocked readiness, stale source revision, denied download, reconnect, duplicate request, and app-output parity.

## Validation Evidence
- `assistant-catalog-v4` adds the permission-scoped
  `documents_get_sales_pdf_status` read tool with order/quote family validation,
  source freshness, durable snapshot states, revision, expiry, and document entity.
- The authenticated Assistant document route now reauthorizes generated Sales PDF
  ownership against current Sales row scope and proxies only trusted HTTPS Vercel
  public Blob URLs; private conversation documents retain their existing path.
- Focused slice validation: 14 tests / 146 assertions pass. The broader Assistant
  and package checks remain required before completing T12.
