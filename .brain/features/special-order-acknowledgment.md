# Special Order Acknowledgment And Customer Approval

## Purpose

Special Order is an explicit, whole-order classification for internal dashboard
Sales Orders. It records that the customer reviewed the complete order and the
published non-returnable/non-refundable policy before purchasing or production
continues under the configured company enforcement mode.

This feature does not classify invoice lines, services, HPT sizes, moulding
lines, components, or catalog rows independently.

## Staff workflow

- Draft and autosave may retain an unanswered declaration. Save & Close and
  final internal-order saves require an explicit Yes or No.
- No produces `NOT_REQUIRED`. Yes starts at `SIGNATURE_PENDING` unless a current
  approval matches the exact order revision.
- Existing legacy orders remain `Not evaluated` and are not governed until a
  salesperson deliberately enables Special Order with confirmation and a
  reason.
- Sales Overview exposes the independent state, approval request actions,
  `Request Re-Approval`, history, and reasoned removal.
- Enabling, revision invalidation, requests, customer responses, reapproval,
  and removal write Sales Activity. Removal sends a customer notification when
  the policy had already been communicated or answered.

## Approval lifecycle

The canonical states are `NOT_REQUIRED`, `SIGNATURE_PENDING`,
`CUSTOMER_APPROVED`, `REAPPROVAL_REQUIRED`, and `CUSTOMER_DECLINED`.

Each request is bound to a deterministic Approval Revision and an immutable
published policy version. The public capability is random, stored only as a
SHA-256 hash, expires according to Sales settings, and can be consumed once.
The customer sees the customer-visible order snapshot and policy, then either:

- approves after checking the acknowledgment, supplying a printed name, and
  drawing a signature; or
- declines with a required reason.

A material order change supersedes prior evidence, revokes active links, moves
the order to `REAPPROVAL_REQUIRED`, and requires a new signature. Prior evidence
remains in approval history and is never silently restored.

The Approval Revision includes only customer-visible order content. It changes
for canonical customer identity/email, assigned billing or shipping address,
line pricing/specifications, customer-visible nested service/shelf/HPT data,
additional costs, discounts, tax, and totals. Internal notes and operational
metadata do not create false reapproval. Direct customer or assigned-address
edits invalidate affected governed orders even when the Sales Form is not saved.

## Settings and enforcement

Only Super Admin can configure the global Special Order section at
`/settings/sales/special-orders`. The route is one of the route-backed Sales
Settings sections and loads privileged Special Order settings and rollout data
only after the shared Sales settings access check succeeds. It owns the link
lifetime (1-30 days), versioned policy draft and publication, and one live
enforcement mode:

| Mode | Purchasing | Production | Packing | Dispatch |
| --- | --- | --- | --- | --- |
| Warning Only | Warn/allow | Warn/allow | Warn/allow | Warn/allow |
| Block Purchasing & Production | Block | Block | Warn/allow | Warn/allow |
| Block All Operations | Block | Block | Block | Block |

Warning Only is the default. Every governed operation evaluates fresh order,
approval-evidence, and settings state on the server. Warnings are recorded in
Sales Activity with bounded deduplication. Blocks return the stable application
code `SPECIAL_ORDER_APPROVAL_REQUIRED` with safe order/state/mode/operation
context and an instruction to return to Sales.

Warning Only mutations return the same safe remediation metadata through the
shared tRPC response envelope. Dashboard callers surface it as an actionable
toast while allowing the operation to finish.

Cancellation, release, rollback, and reconciliation paths remain available so
employees can safely unwind work.

## Email, notification, and documents

- A valid canonical customer email is required before Yes is applied or a
  governed order is manually saved. Missing email opens a focused reusable
  update dialog; cancellation leaves the original action incomplete.
- Sales Overview direct email stores the pending send intent, updates
  `Customers.email`, invalidates customer/Sales queries, and resumes exactly
  that send after a successful update.
- Direct Sales Order document emails and order reminders resolve current state
  at send time and include one approval action per pending governed order.
  Ordinary and currently approved orders have no action. Required-link creation
  fails closed instead of sending a misleading email.
- Customer and assigned-salesperson notifications cover material approval,
  decline, reapproval, and removal transitions.
- Customer invoice/order output includes a state-aware stamp and the applicable
  policy. Approved invoices may include signer/signature evidence.
- Quotes have no Special Order output. Production and packing documents show a
  compact operational status and do not expose private signature evidence.

## Data and security

`SalesOrders` stores declaration, lifecycle state, revision, and current
request/evidence pointers; actor/reason enrollment audit remains in
`SalesHistory`. Immutable policy versions, request rows,
and evidence rows preserve the review record. Notification deliveries and
operation events provide retry/rollout evidence.

Signature PNGs are AES-256-GCM encrypted before Blob upload. Production defaults
to private Blob objects; an explicitly public local-only store still exposes
only ciphertext.
The database stores no Blob URL, only a private `StoredDocument` reference and
encrypted pathname. An authenticated `viewOrders`/`editOrders` route fetches and
decrypts the envelope; operational documents never receive signature data.

Public review/respond requires the valid revision-bound capability. Staff
request/remove actions require `editOrders`; history requires `viewOrders` or
`editOrders`; settings and policy publication require Super Admin. Existing
operational permissions still apply in addition to the approval gate.

## Validation and rollout status

- Seventy-seven focused tests pass with 290 assertions across domain lifecycle,
  capability reuse/concurrency, customer/address invalidation, public privacy,
  response transaction, encrypted signature storage, delivery ledger,
  notification retry, operational enforcement, API boundary coverage, Sales
  email rendering, dashboard continuation, activity, settings, and PDF output.
- `@gnd/api`, `@gnd/sales`, `@gnd/email`, and `@gnd/pdf` typechecks pass. The
  broad dashboard/notifications/jobs graphs retain unrelated repository-wide
  TypeScript baselines; a focused dashboard diagnostic scan reports no Special
  Order production-code error.
- Authenticated/public browser QA proves missing-email continuation, request,
  complete review, drawn signature, one Current Approval, terminal consumed
  link, protected signature retrieval, manual reapproval, decline reason,
  evidence history, removal, notification history, and Super Admin rollout
  telemetry. Test addresses use `.invalid`; no real customer email was sent.
- Migration `20260813193000_special_order_acknowledgment` is additive. Final
  local `db:generate` and `db:push` validation passed; `db:migrate` remains
  blocked by the repository's documented split-root/shadow preflight issue in
  ADR-053. No preview or production database changed.
- All 14 local implementation tickets and all 140 acceptance criteria are
  complete in `.scratch/special-order-acknowledgment/`.
- Rollout ownership, thresholds, retry support, staged enforcement promotion,
  and Warning Only rollback are defined in
  `.brain/plans/2026-08-13-special-order-rollout-runbook.md`.
