# ADR: Legacy Relational Sales Graph as Commercial Source of Truth

## Status

Accepted

## Context

The new Sales Form persisted complete commercial line snapshots in
`SalesOrders.meta.newSalesForm` while print, production, inventory, dispatch,
and the legacy editor continued to use the relational Sales graph. Hydration
merged both representations and autosave rebuilt relational children. Missing
generated IDs and conflicting price boundaries allowed duplicate active door
rows and silent repricing, as demonstrated by quote `03523PC`.

## Decision

The existing relational graph (`SalesOrders`, `SalesOrderItems`,
`DykeStepForm`, `HousePackageTools`, `DykeSalesDoors`, `DykeSalesShelfItem`,
`SalesExtraCosts`, and `SalesTaxes`) is the sole commercial source of truth.
`meta.newSalesForm` may retain revision and non-commercial editor/session state,
but loaders must not source line rows, quantities, prices, costs, or totals from
its historical snapshots.

Writes use a revision-checked serializable transaction and an identity-preserving
diff. Every save returns a freshly loaded relational document, including all
generated nested IDs. Door identity is component plus normalized dimension;
duplicate payload identities are rejected and historical duplicates are
collapsed defensively without summing quantity.

## Alternatives

- Make JSON the authority and project every operational consumer from it.
- Continue dual-write reconciliation with precedence rules.
- Replace the legacy graph with a new normalized schema in one cutover.

## Consequences

- Print and operational workflows observe the same rows and prices as editors.
- Autosaves retain durable identities and stale revisions fail safely.
- Historical JSON commercial snapshots become compatibility/audit data only.
- The legacy editor remains for one release, but must preserve the same
  relational identities and invariants before its UI is removed.
- A database active-identity unique constraint remains a follow-up after the
  concurrent dispatch schema migration is clean; serializable server validation
  is the active enforcement boundary meanwhile.

## Implementation Notes

- Shared identity and HPT pricing functions live under
  `packages/sales/src/sales-form/domain`.
- Canonical load/save orchestration is in
  `apps/api/src/db/queries/new-sales-form.ts`.
- `scripts/sales-form-relational-repair.ts` audits all sales and applies bounded,
  explicitly confirmed repairs to open quotes while reporting committed sales.

