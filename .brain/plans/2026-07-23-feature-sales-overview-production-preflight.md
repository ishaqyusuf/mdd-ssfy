# Sales Overview Production Preflight Plan

## Status

Completed on 2026-07-23.

## Scope

Add a manager-facing, read-only door-production checklist to the existing Sales
Overview General tab without creating a parallel production workflow.

## Completed

- [x] Add deterministic readiness projection and focused tests.
- [x] Expose customer profile, active tax, door configuration, no-handle, and
      shipping-address evidence through `sales.getSaleOverview`; supplier and
      price readiness stays owned by the inventory overview contract.
- [x] Expose current invoice-PDF readiness without generating a document during
      the overview read.
- [x] Expose active supplier and supplier-price evidence on inventory overview
      rows.
- [x] Render the six-check admin/order card with Details and Inventory review
      navigation.
- [x] Validate focused tests, package/API typechecks, formatting, diff
      whitespace, and authenticated browser behavior.

## Non-Goals

- No automatic production assignment or release.
- No database or migration changes.
- No repair, allocation, inbound, PDF-generation, or notification mutation.
