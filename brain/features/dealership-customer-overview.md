# Dealership Customer Overview

## Status
- Added 2026-05-25.
- V1 provides a reusable dealership customer overview workspace for the full page and side sheet surfaces.

## Behavior
- `/customers/[id]` renders the canonical full-page customer overview.
- `/customers?customerOverviewId=<id>&customerOverviewTab=<tab>` opens the same workspace as a tabbed side sheet.
- Supported tabs are `overview`, `quotes`, and `orders`.
- Editing remains delegated to the existing customer edit page/modal.

## Data Contract
- `dealerPortal.customerOverview({ id })` returns dealer-scoped customer identity, contact, address metadata, sales profile, created date, and quote/order counts.
- `dealerPortal.orders` and `dealerPortal.quotes` accept optional `customerId` for customer-scoped history tabs while preserving dealer scoping.
