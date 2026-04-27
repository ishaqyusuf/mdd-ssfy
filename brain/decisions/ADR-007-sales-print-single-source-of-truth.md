# ADR-007: Sales Print Single Source of Truth

## Status
Accepted

## Date
2026-04-27

## Context

Sales print and PDF behavior had drifted across multiple UI entry points. Print CTAs in menus, form footers, overview sheets, quote acceptance, payment flows, and dispatch screens each owned parts of the orchestration themselves:

- print mode normalization
- signed document access resolution
- popup and tab opening
- preview/download route construction
- PDF vs print viewer routing

This caused slow or inconsistent print opens and made it easy for new CTAs to reintroduce special-case behavior.

## Decision

Adopt a single application-layer entry point for sales print orchestration under:

- `apps/www/src/modules/sales-print/application/sales-print-service.ts`

Establish these boundaries:

- `packages/sales/src/print/*` is the canonical source of sales print document data.
- `@gnd/pdf/sales-v2` is the canonical renderer for sales print PDF/HTML output.
- `apps/www/src/modules/sales-print/application/*` owns client-side orchestration:
  - mode normalization
  - document access resolution
  - shared route construction
  - pending print window lifecycle
  - download orchestration
  - preview preparation
- CTA components must be thin callers and should not rebuild print URLs or duplicate mode mappings.

Legacy helper paths such as `apps/www/src/lib/quick-print.ts` remain compatibility shims only and must delegate to the application service.

## Consequences

- New sales print CTAs have one supported integration path.
- Print/view/download behavior stays consistent across sales surfaces.
- Access resolution and popup behavior can be optimized centrally.
- Route and mode drift should decrease because CTA-local URL building is no longer the default.
