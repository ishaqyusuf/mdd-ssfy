# Production sales email PDF attachments

## Symptom

Sales document emails included a PDF attachment in development but arrived with only a download link in production.

## Root cause

Attachment generation had two independent opt-in gates:

- `ATTACH_SALES_EMAIL_PDF=true` had to exist in the worker environment.
- Simple sales document payloads had to set `skipPdfAttachment: false` even though the schema defaulted it to `true` and standard, direct, and retry callers explicitly sent `true`.

The production Trigger environment did not define the attachment flag, so composed attachments were disabled and the normal simple-email paths were doubly disabled. The PDF renderer itself was healthy; a representative sales document rendered a valid 419,113-byte `%PDF-` file locally.

## Resolution

- Removed `ATTACH_SALES_EMAIL_PDF` and `shouldAttachSalesEmailPdf`.
- Removed `skipPdfAttachment` from notification schemas, resolved data, callers, retries, and job payloads.
- Made simple and composed sales document email builders always attempt PDF generation.
- Preserved the signed download link as the non-fatal fallback when rendering fails.
- Added a source-level regression test that prevents either gate from returning to the critical email paths.

## Validation

- Focused attachment suites: 9 passed, 0 failed, 48 assertions.
- A real simple sales email payload produced one 419,113-byte attachment with `%PDF-` magic while the old env was absent and a legacy `skipPdfAttachment: true` property was supplied.
- Trigger production dry-run build succeeded from a clean fix-only snapshot.

Production deployment and provider delivery evidence are recorded in `.brain/progress.md` when complete.
