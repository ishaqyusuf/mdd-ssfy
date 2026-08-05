# ADR-047: Verifiable Sales Inventory Not-Applicable State

- Status: Accepted
- Date: 2026-08-05

## Context

`N/A` in the Sales Orders Inbound column is a derived conclusion from the last
successful inventory projection and the currently saved tracked requirements.
Projection code and legacy sales shapes can evolve, so a previously correct
zero-need result can become stale. Operators need a bounded way to challenge
that conclusion without turning every table read into a write.

## Decision

- Keep ordinary Sales Orders reads mutation-free.
- Expose `inventoryApplicability.canVerify=true` only for active,
  pre-repair-boundary `not_applicable` orders.
- Clicking an eligible `N/A` runs the protected
  `inventories.verifySalesInventoryApplicability` mutation synchronously with
  projection source `repair` while the cell displays `Checking…`.
- The mutation reloads overview policy before writing and rejects orders that
  are missing, no longer `canVerify`, or have passed the repair boundary.
- A successful rebuild is authoritative: positive tracked needs replace `N/A`;
  a zero-need ready projection reconfirms `N/A`. Warnings or thrown sync errors
  remain failures and are shown to the operator.
- Historical `legacy_not_applicable` orders remain explanation-only because
  rebuilding their inventory demand could reopen completed fulfillment state.

## Consequences

- Operators have an explicit repair check without continuous table-side writes.
- The UI supplies immediate progress and outcome feedback and refreshes list and
  summary queries after success.
- Server-side lifecycle/applicability policy remains authoritative even if a
  stale client attempts verification.
- Fleet-wide repair still belongs to the existing synchronization monitor and
  bounded backfill jobs; the click action is deliberately one order at a time.
