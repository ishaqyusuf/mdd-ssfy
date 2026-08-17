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
  Save & New and final internal-order saves require an explicit Yes or No.
- No produces `NOT_REQUIRED`. Yes starts at `SIGNATURE_PENDING` unless a current
  approval matches the exact order revision.
- Existing legacy orders remain `Not evaluated` and are not governed until a
  salesperson deliberately enables Special Order with confirmation. The
  classification reason is optional.
- Sales Overview exposes the independent state, approval request actions,
  `Request Re-Approval`, history, and removal. Removal reasons are optional;
  reapproval and customer-decline reasons remain required.
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

The same settings section owns the enrollment release audience. It defaults to
`SUPER_ADMIN_ONLY` for pilot testing. In that mode, only Super Admin sees the
Sales Form declaration and can transition an ordinary order into `YES` / Special
Order. Other employees may continue saving ordinary orders without answering
the hidden declaration. This audience is not a feature-disable switch: the
Sales Orders indicator and Sales Overview remain visible, and every approval,
email, document, notification, revision, and operational-enforcement behavior
continues normally for orders already marked Special Order. Switching the
audience to `ALL_STAFF` restores enrollment for all users who otherwise have
the existing Sales save authority.

Enrollment access is resolved from active server-side role assignments. Final
save waits for that decision instead of trusting cached client role data. An
employee outside the pilot who edits an already marked order keeps the existing
customer-email repair continuation even though the declaration control remains
hidden.

## Compact classification and order discovery (2026-08-14)

- The invoice summary uses a compact `Special Order` section with the current
  status beside its title and equal-width No/Yes controls. Unanswered orders
  display No as a visual fallback without persisting a declaration.
- One `Special Order classification` modal owns required-save decisions and
  saved-order changes. It defaults to No for untouched orders or the persisted
  choice for saved orders, accepts an optional 3-500 character reason, and
  resumes the exact pending save after any required customer-email repair.
- Removing a classification without a reason keeps the full revocation,
  evidence, history, pointer-clearing, and notification lifecycle. Blank reason
  values normalize to `null`, and generated copy never renders an empty or
  undefined reason.
- Sales Orders exposes URL-backed Special Order scope and lifecycle filters.
  The former standalone column is replaced by a status-toned PenTool indicator
  in the Order # cell; current-link expiry takes visual precedence over pending
  or reapproval state.

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

Signature PNGs are AES-256-GCM encrypted before Blob upload. Blob access follows
an explicit `SPECIAL_ORDER_SIGNATURE_BLOB_ACCESS` override, then the configured
Vercel Blob hostname; the shared encrypted store defaults to public when neither
is available. This matches the current shared production store while exposing
only ciphertext. A dedicated private store remains supported through the
explicit override.
The database stores no Blob URL, only a private `StoredDocument` reference and
encrypted pathname. An authenticated `viewOrders`/`editOrders` route fetches and
decrypts the envelope; operational documents never receive signature data.

Public review/respond requires the valid revision-bound capability. Staff
request/remove actions require `editOrders`; history requires `viewOrders` or
`editOrders`; settings and policy publication require Super Admin. Existing
operational permissions still apply in addition to the approval gate.

## Approved usability and override addendum direction (2026-08-14)

The follow-up Wayfinder map at
`.scratch/special-order-usability-override-addendum/map.md` records the approved
direction. Its five pipeline comments are approved and posted, and
`.scratch/special-order-usability-override-addendum/spec.md` is the published
`ready-for-agent` addendum. Five approved `ready-for-agent` tracer-bullet
implementation tickets are published under
`.scratch/special-order-usability-override-implementation/issues/`; Tickets
01-04 form the initial parallel frontier and Ticket 05 is the blocked integration
and acceptance gate:

- Sales Overview gains Special Order enrollment with the same release audience,
  customer-email repair, reason, activity, and revision rules as the Sales Form;
  enrollment does not automatically send the request.
- The public approval Customer name comes from the immutable request snapshot
  and is displayed as disabled. Mobile signature entry uses a full-screen,
  landscape-optimized modal with rotate guidance and explicit confirmation.
- Customer-facing policy labels omit visible version numbers while internal
  policy evidence remains immutable and versioned. Customer documents place the
  full policy beside the price footer.
- Approval review repairs and displays the canonical derived C.C.C and
  `totalWithCcc` for applicable payment channels while keeping `grandTotal` as
  the accounting principal.
- Role configuration gains `Override Special Order Approval`. The capability is
  additive to existing operation permissions, covers Signature Pending and
  Reapproval Required purchasing/production/packing/dispatch progression, does
  not override Customer Declined, and records explicit server-side override
  evidence.

## Validation and rollout status

- The enrollment pilot follow-up adds focused domain, settings, permission, and
  dashboard boundary coverage. The complete focused Special Order suite now
  passes 121 tests with 523 assertions across 25 files. Authenticated browser QA
  confirms the Super Admin setting and form control while the Sales Orders
  Special Order column remains visible.
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
