# Sales PDF System

## Goal

Move sales PDFs from request-time rendering toward a stored-document pipeline that can reuse the central document platform.

## Core Architecture

- `StoredDocument` stores generic file metadata and owner linkage.
- `SalesDocumentSnapshot` stores sales-specific PDF generation/version lifecycle.
- `packages/documents` owns provider-agnostic document registration helpers.
- `packages/sales/src/pdf-system` owns invalidation and current-PDF resolution rules.

## Initial Scope

- invoice/quote/packing/production PDF snapshot contracts
- stale/current lifecycle for sales PDFs
- compatibility-preserving migration path for existing download routes

## Planned Flow

1. Sales or payment mutation changes invoice truth.
2. Sales PDF snapshot is invalidated and a new pending version is created.
3. Async job renders the PDF and uploads it through the shared document platform.
4. The completed `StoredDocument` is linked to the current `SalesDocumentSnapshot`.
5. Download/email flows resolve the current stored document instead of rendering on demand.

## Notes

- This feature is intentionally layered on the generic document platform so Gallery, dispatch uploads, and signatures can share the same binary-storage contract.
- Existing public tokenized download URLs should remain stable while internals migrate.
