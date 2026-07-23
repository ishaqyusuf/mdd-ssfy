# Plan: Shared Document Caller Migration

## Type
Feature / Architecture

## Status
Completed

## Created Date
2026-07-23

## Last Updated
2026-07-23

## Goal
Complete the incremental caller migration promised by ADR-002 so mobile
gallery-picked employee documents, dispatch completion photos, packing and
delivery signatures, and generated sales PDFs all have canonical
`StoredDocument` ownership without breaking their existing feature records or
read contracts.

## Scope
- Register mobile gallery-picked employee uploads under the authenticated user
  and retain the canonical document id in `UserDocuments.meta`.
- Register resumable dispatch proof signatures and photos under the dispatch,
  while preserving existing URL/path note tags for compatibility.
- Move packing-slip signature binary upload off the browser and into the
  protected dispatch API, then register the result under the dispatch.
- Confirm the existing sales PDF snapshot pipeline remains the canonical
  generated-document implementation.
- Add focused caller-contract, parsing, idempotency, and package validation.

## Constraints
- Reuse the existing `StoredDocument` and `SalesDocumentSnapshot` schema; do
  not add or apply a database migration.
- Do not run inventory repair, backfill, sync, or mutation workflows.
- Keep legacy feature rows and URL/path fields readable during the incremental
  cutover.
- Never expose a write-capable storage token to the browser.

## Acceptance Criteria
- New employee asset uploads return a canonical document id and save it in
  feature metadata after ownership validation.
- New dispatch proof signatures/photos include canonical document ids in the
  resumable completion metadata.
- Packing signatures upload through a protected server path and no longer
  import a browser Vercel Blob token.
- New and retried uploads do not create duplicate canonical rows for the same
  provider/path.
- Sales PDF generation continues to register `sales_pdf` documents and link
  `SalesDocumentSnapshot`.
- Focused tests, package/API typechecks, formatting, and diff validation pass.

## Outcome

- Employee gallery, mobile dispatch proof, packing signatures, browser
  attachments, and generated Sales PDFs now register or retain canonical
  `StoredDocument` ownership.
- Browser uploads are server-mediated with MIME/magic validation and no public
  write token. Durable notes and inbox activities adopt staged documents;
  generic delete is limited to compare-and-set claimed staging rows.
- Packing sign-off uses fenced leases, compensated registration, an atomic
  `domain_completed` checkpoint, five-minute immutable re-sign timing,
  idempotent promotion reconciliation, and expired-document retirement.
- Path-only legacy reads remain compatible. Unknown legacy blobs are not
  physically deleted without a separately reviewed trusted ownership backfill.
- No database migration, inventory repair, sync, or data mutation workflow was
  run.

## Validation

- Focused shared-document suite: 46 tests / 329 assertions, zero failures.
- `@gnd/api`, `@gnd/sales`, `@gnd/utils`, `@gnd/jobs`, and `@gnd/storefront`
  typechecks pass.
- Expo changed-runtime TypeScript filtering reports no diagnostics; its Bun
  test file remains outside the Expo TypeScript type environment.
- Main-web changed-runtime filtering reports no migration diagnostics; the
  broad `@gnd/www` command still reports unrelated repository baseline errors.
- Focused Biome and `git diff --check` pass.
- Two independent final reviews report no findings.
