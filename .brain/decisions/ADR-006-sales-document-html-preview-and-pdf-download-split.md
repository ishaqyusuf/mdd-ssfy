# ADR-006 Sales Document HTML Preview and PDF Download Split

## Status
Accepted

## Context
Sales document preview was PDF-first. Internal preview actions, packing-list preview, and tokenized public preview paths all depended on a PDF route or iframe flow, which made browser preview slower and made preview-specific actions harder to evolve. The product also needed QR scans from generated sales PDFs to open a fast web preview while still keeping PDF generation for download/export.

## Decision
Adopt a dual-render sales document architecture:

- `packages/sales/src/print/*` remains the single shared print-data pipeline.
- `packages/pdf/src/sales-v2` now exposes paired renderers per template:
  - `html` for browser preview
  - `pdf` for download/export
- Signed sales document preview links now resolve to `/p/sales-document-v2` instead of the PDF viewer route.
- Preview pages are HTML-first and include preview actions such as print, download PDF, and auth-gated `Open Overview`.
- Generated sales PDFs embed a QR code that points to the signed HTML preview URL.
- Packing-slip signing moves with the HTML preview surface instead of remaining coupled to the old PDF preview page.

## Consequences
- Preview becomes faster and more flexible because browser rendering no longer depends on `@react-pdf`.
- Templates must now be maintained as paired HTML/PDF renderers, but both still consume the same shared `PrintPage` contract.
- PDF stays the canonical export/download format, which keeps document snapshots and download endpoints stable.
- Existing preview callers can migrate by switching to the signed preview URL without changing the underlying token/access model.
