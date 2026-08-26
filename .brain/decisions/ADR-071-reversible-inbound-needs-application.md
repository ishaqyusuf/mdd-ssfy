# ADR-071: Reversible Inbound Needs Application Is Separate From Stock Receipt

## Status

Accepted — 2026-08-26.

## Context

Inbound shipment lifecycle status, physical stock receipt, and Sales material
Need coverage were exposed beside each other but were not the same operation.
Selecting the lifecycle label `Received` previously set `completed`,
`receivedAt`, and progress without updating linked demand. Historical rows can
therefore be Received while their Sales Needs remain open.

Operators also require an explicit way to apply or unapply a Received inbound
from material Needs without silently rewriting physical stock history.

## Decision

- The existing `completed` / `Received` status remains available and now
  applies planned inbound quantity to linked Needs transactionally.
- Needs application updates only `InboundDemand` receipt coverage and derived
  component state. Physical stock remains owned by `receiveInboundShipment`.
- Apply/unapply state is audited through versioned generic `Event` snapshots,
  not a new inventory column or inferred UI-only flag.
- Unapply restores guarded demand baselines and never decrements stock or
  deletes stock movements. Existing capacity-applied Received rows may be
  unapplied by subtracting only that inbound's applicable planned capacity and
  synthesizing the resulting Need status while retaining physical evidence.
- A later shipment-item receipt or demand mutation invalidates an active
  snapshot and blocks unapply until reviewed.
- Inventory detail reads derive `not_received`, `not_applicable`,
  `not_applied`, or `applied` from shipment status, the inbound's applicable
  capacity against linked demand, and the latest application event.

## Consequences

- New Received transitions no longer leave linked material Needs stale.
- Historical status-only rows can be repaired individually without a broad
  database backfill.
- Operators can intentionally reopen Needs while preserving immutable stock
  evidence.
- The `Event` ledger is now part of the correctness contract for reversible
  Needs-only applications; event type and snapshot version changes require a
  compatible reader.
- Detail reads currently locate the latest application through the generic
  JSON event ledger. This avoids a migration for backward compatibility but is
  an intentional per-detail lookup tradeoff; move the operational pointer to
  an indexed inbound field/relation if ledger volume makes it measurable.

## Validation

Focused inventory-domain, API transaction, route-schema, query-event, and
client-module import checks cover the implemented boundary.
