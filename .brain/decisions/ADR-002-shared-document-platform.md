# ADR: Shared Document Platform for Stored and Generated Files

## Status

Accepted

## Context

File handling is currently split across multiple patterns:

- direct client uploads for gallery/signature flows
- API-level storage adapters for some dispatch uploads
- request-time PDF rendering for sales invoice downloads

This makes ownership, storage paths, metadata, invalidation, and access behavior inconsistent across features that are all fundamentally handling documents.

## Decision

Adopt a shared document platform centered on:

- a generic `StoredDocument` persistence model for all uploaded/generated binaries
- package-owned document services in `packages/documents`
- feature-specific orchestration on top of the shared platform, starting with `packages/sales/src/pdf-system`

`StoredDocument` owns storage metadata and ownership references. Feature modules may add companion snapshot/workflow records when they need domain-specific lifecycle state beyond generic file storage.

## Alternatives

- Keep each feature managing its own upload and file metadata flow.
- Add sales PDF storage as a one-off system and retrofit other document types later.
- Store document metadata only inside feature-local JSON/meta fields.

## Consequences

Positive:

- Gallery, dispatch images, signatures, and sales PDFs can converge on one storage and metadata contract.
- Storage provider logic stays centralized in `@gnd/documents`.
- Sales PDF generation can become a document lifecycle concern instead of a route-local rendering concern.

Negative:

- There is short-term coexistence while legacy direct-upload and request-rendered paths are migrated.
- Generic ownership via `ownerType`/`ownerId` trades some relational strictness for cross-feature flexibility in the foundation phase.

## Implementation Notes

- Introduce `StoredDocument` and `SalesDocumentSnapshot` schema foundations first.
- Extend `packages/documents` with document-record contracts and registry helpers.
- Use `packages/sales/src/pdf-system` for invoice-specific invalidation and current-document resolution.
- Migrate read/write callers incrementally behind this shared platform instead of a big-bang replacement.
