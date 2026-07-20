# ADR-015 Dealer Customer Privacy and Recruitment Suppression

## Status

Accepted — 2026-07-19

## Context

Dealers need office fulfillment without making their downstream customer book
an editable office asset. Recruitment also appears in recurring sales email, so
customers who already acted must not keep receiving the same call to action.

## Decision

- Dealer-owned customers are private by default.
- Explicit sharing grants read-only office discovery; ownership remains with
  the dealer and the record cannot be used for unrelated office-origin sales.
- Delivery/ship requests carry an immutable recipient snapshot so authorized
  fulfillment does not require broad directory access.
- Any pending, approved, or denied application suppresses all future
  recruitment banners for that customer.
- Only an explicit Super Admin suppression reset restores eligibility.
- Invitation URLs contain random opaque tokens; only token hashes are stored.

## Consequences

- Dealer relationships stay isolated while direct shipment remains auditable.
- Suppression is a customer-level invariant, not a per-campaign send flag.
- Denied applicants are not automatically re-marketed.
- Fulfillment snapshots intentionally remain unchanged when customer profiles
  are edited later.
