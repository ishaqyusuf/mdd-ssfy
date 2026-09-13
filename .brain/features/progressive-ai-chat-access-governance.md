# Progressive AI Chat Access Governance

## Status

T19A foundation and single-account administrator presentation implemented on 2026-09-13. Bulk operations remain in progress.

## Current behavior

- Assistant product access is an explicit per-user entitlement and is independent of role permissions.
- Missing, disabled, expired, deleted, and access-revoked accounts fail closed.
- Enabling Assistant does not grant any business capability. The actor continues to receive only current domain grants, organization/user scope, row filters, and field projection rules.
- The same actor resolver protects conversation APIs, streaming and reconnect, tools, generated documents, saved actions, jobs, and feature-release eligibility.
- Dashboard bootstrap hides Assistant navigation until the current account has active access. Direct navigation rechecks the entitlement on the server.
- Super Admin mutations use optimistic versions, require a reason, support optional future expiry, and append an immutable event in the same transaction.
- Scheduled expiry is reconciled once at the next access check. Its audit actor is `null`, which denotes the system rather than falsely attributing expiry to the employee.

## API foundation

- `assistant.bootstrap` returns only the current user's enabled/status/expiry/version state.
- `assistant.adminEntitlements` lists bounded employee access state and audit history for Super Admin.
- `assistant.updateEntitlement` changes one employee entitlement and appends its event atomically.

## Dashboard

- `/settings/assistant` is a normal dashboard settings page available only to Super Admin.
- The route follows the Midday dashboard pattern: server-side query prefetch, hydration, suspense/error boundaries, a compositional page header, and a dedicated `tables-2/assistant-access` feature folder.
- The access table reads real employee accounts through `assistant.adminEntitlements` and shows the employee, enabled/disabled/revoked state, scheduled expiry, last reason, and last change.
- Changing access opens a review dialog that requires an audit reason and supports an optional future expiry.
- `/assistant-admin-preview` redirects to the canonical live settings route; synthetic employee fixtures are no longer part of the product UI.

## Validation

- Focused entitlement and sidebar checks: 21 tests / 73 assertions.
- Prisma client generation and focused Biome checks pass.
- API typecheck reports only the existing unrelated Sales nullability diagnostic.
- In-app browser validation confirmed the standard dashboard shell and 55 real database employee accounts at desktop width. No entitlement was changed during verification.
