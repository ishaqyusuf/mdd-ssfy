# Production sales email PDF attachments

## Symptom

Sales document emails included a PDF attachment in development but arrived with only a download link in production.

## Root cause

Attachment generation had two independent opt-in gates:

- `ATTACH_SALES_EMAIL_PDF=true` had to exist in the worker environment.
- Simple sales document payloads had to set `skipPdfAttachment: false` even though the schema defaulted it to `true` and standard, direct, and retry callers explicitly sent `true`.

The production Trigger environment did not define the attachment flag, so composed attachments were disabled and the normal simple-email paths were doubly disabled. The PDF renderer itself was healthy; a representative sales document rendered a valid 419,113-byte `%PDF-` file locally.

The first production canary also exposed a separate runtime constraint: PDF
generation exceeded the Trigger `micro` worker memory limit and the process was
OOM-killed before delivery. This was invisible in development because the local
worker did not have that production memory ceiling.

## Resolution

- Removed `ATTACH_SALES_EMAIL_PDF` and `shouldAttachSalesEmailPdf`.
- Removed `skipPdfAttachment` from notification schemas, resolved data, callers, retries, and job payloads.
- Made simple and composed sales document email builders always attempt PDF generation.
- Preserved the signed download link as the non-fatal fallback when rendering fails.
- Increased the notification task from Trigger `micro` to `medium-1x` so the
  production worker can render and attach the document reliably.
- Added a source-level regression test that prevents either gate from returning to the critical email paths.

## Validation

- Focused attachment suites: 10 passed, 0 failed.
- A real simple sales email payload produced one 419,113-byte attachment with `%PDF-` magic while the old env was absent and a legacy `skipPdfAttachment: true` property was supplied.
- Trigger production version `20260722.6` deployed with the current Prisma
  schema and `medium-1x` notification worker.
- Controlled production run `run_06fom77927l4afl8hvdg9mrv01` completed with
  one email sent and no skipped or failed sends.
- The production delivery ledger recorded the attempt as `SENT`, with Resend
  accepting the message and attachment metadata recording
  `hasPdfAttachment: true`.
- Resend reported the provider message as `delivered` and exposed exactly one
  `application/pdf` attachment named `Quote_03376-VC.pdf`. Downloading the
  provider-stored file returned 420,906 bytes with valid `%PDF-` magic.
