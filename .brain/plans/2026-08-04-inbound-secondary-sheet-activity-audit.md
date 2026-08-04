# Inbound Secondary Sheets and Activity Audit

## Objective

Move inbound creation and review into the Sales Overview secondary-sheet flow, make inbound lifecycle activity directly actionable, improve inbound notification copy, increase Inventory readability, and add audited management for manual activity notes.

## Product contract

- New inbound PO/reference is the sales order number and cannot be edited.
- Create and overview experiences use the existing Midday-style secondary sheet.
- Inbound activity and notification actions open the exact inbound.
- Status notifications name the inbound, prior status, new status, and actor.
- Manual notes can be edited or soft-deleted by their author or a Super Admin.
- System activities remain immutable.
- Each edit/delete records an immutable child revision; deleted roots are only returned to Super Admin audit views.

## Delivery slices

1. Notification copy and action mapping with focused tests.
2. Secondary-sheet create/detail panes and locked order reference.
3. Inventory and inbound readability improvements.
4. Manual-note revisions, permissions, soft delete, and UI controls.
5. Typecheck, focused tests, browser verification, documentation, and scoped commit.

## Validation

- Notification handler unit tests.
- Activity action and create-model unit tests.
- Manual-note query permission/audit tests.
- Dashboard and API typechecks.
- In-app browser coverage for create, open, status, activity deep-link, edit, delete, and Super Admin audit presentation.
