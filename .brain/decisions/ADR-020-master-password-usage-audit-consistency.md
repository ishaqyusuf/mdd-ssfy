# ADR-020: Master Password Usage Audit Consistency

- Status: Accepted
- Date: 2026-07-22
- Scope: Authentication audit and sales-rep transfer

## Context

Master-password login is an emergency access path. Blocking a valid login when
the audit store is temporarily unavailable could prevent operational recovery.
Sales-rep transfer is a normal business mutation whose ownership change must be
reviewable whenever a master credential authorizes it. Recording the transfer
without matching usage evidence would create an unacceptable audit gap.

## Decision

Use one shared master-password usage writer for login and protected-action
evidence, but let each caller choose the consistency boundary.

Login auditing remains best-effort: the login flow calls the shared writer,
logs persistence failure, and does not reject otherwise valid emergency access.

Sales-rep transfer auditing is fail-closed. When confirmation uses the master
password, the `SalesOrders.salesRepId` update, structured `SalesHistory` row,
and `MasterPasswordLoginAudit` usage row execute in the same Prisma transaction.
Failure of any write rejects and rolls back the transfer. Account-password
transfers do not create master-password usage rows.

Master password never bypasses the transfer's owner-only authorization, target
eligibility, or confirmation prompt. Audit rows contain actor and request
evidence plus the order/quote reference, but never a password or password hash.

## Consequences

- Emergency login availability does not depend on audit persistence.
- Every completed master-password sales-rep transfer has matching transactional
  usage evidence.
- Invalid, forbidden, ineligible, and unchanged transfer requests create no
  transfer-usage row.
- Other master-password protected actions must explicitly choose and document
  best-effort or fail-closed semantics rather than inheriting one implicitly.
