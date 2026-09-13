# Progressive AI Chat Access Governance

## Status

T19A foundation implemented on 2026-09-13. Administrator presentation and bulk operations remain in progress.

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

## Validation

- Focused entitlement and sidebar checks: 21 tests / 73 assertions.
- Prisma client generation and focused Biome checks pass.
- API typecheck reports only the existing unrelated Sales nullability diagnostic.
