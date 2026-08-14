# Special Order Usability And Operational Override Addendum

Status: ready-for-agent

Source: [`map.md`](./map.md) and its five approved proposed-answer comments.
This addendum extends, rather than replaces, the completed
[`../special-order-acknowledgment/spec.md`](../special-order-acknowledgment/spec.md).

## Problem Statement

The current Special Order workflow is operationally complete, but several
customer and staff paths do not yet match how people need to use it.

An eligible employee cannot classify an existing order from Sales Overview even
though that sheet is the primary place for managing approval. The public form
asks the customer to type a signer name even though the business wants the
order's immutable customer name displayed by default and protected from edits.
Mobile signing remains constrained to a short inline canvas instead of giving
the customer enough horizontal space to sign comfortably.

Customer-facing policy presentation exposes implementation-oriented version
labels and occupies space near the top of documents instead of using the open
footer area beside the price summary. The public review also omits the derived
credit-card convenience charge already used by the canonical Sales Order
calculation, so an approval can show a different payable total from the order.

Finally, the existing architecture allows no exception when a Special Order
lacks Current Approval. The business now needs a narrowly assigned Role
capability that permits an otherwise-authorized employee to progress a pending
or reapproval-required order while retaining clear evidence that the approval
gate was overridden. An explicit customer decline must remain protected.

## Solution

Add Sales Overview enrollment that delegates to the same server-owned Special
Order transition as the Sales Form. The action respects the live enrollment
audience and ordinary Sales editing authority, repairs a missing canonical
customer email, requires a reason, records activity, and leaves sending the
approval request as a separate choice.

Make Customer name an immutable presentation of the request snapshot. The
server, not the browser, supplies the name recorded with the approval. Keep the
desktop signature pad inline, but open a full-screen, landscape-optimized
signing modal on small screens with rotate guidance and explicit Clear, Cancel,
and OK behavior.

Present customer-facing policy as simply Policy while retaining internal
versioning everywhere evidence or administration requires it. Move the full
policy into the left side of the customer document footer beside the price
summary and preserve ordinary notes beneath it. Before issuing an approval
request, resolve the customer-visible C.C.C using the canonical Sales display
calculation. Freeze the repaired base principal, applicable C.C.C, and total
with C.C.C into the approval snapshot and revision.

Add `Override Special Order Approval` to Role configuration. The normalized
capability `overrideSpecialOrderApproval` is read exclusively from the
authenticated server session. It never grants an operation by itself: the actor
must still have the normal purchasing, production, packing, or dispatch
authority. It converts a would-block decision into an explicit audited override
only for Signature Pending and Reapproval Required. Customer Declined remains
blocked.

## User Stories

1. As an eligible sales employee, I want to mark an existing order as a Special Order from Sales Overview, so that I do not have to reopen the full Sales Form.
2. As an ineligible employee, I want the enrollment action hidden or unavailable, so that Sales Overview does not suggest authority I do not have.
3. As a sales employee, I want Sales Overview enrollment to respect the current Super Admin-only or all-staff release audience, so that the pilot boundary remains consistent.
4. As a sales employee, I want a missing customer email repaired before enrollment, so that the resulting approval request has a deliverable address.
5. As a sales employee, I want cancelling the email repair to leave the order unchanged, so that an interrupted action cannot classify the order accidentally.
6. As a sales employee, I want confirmation and a reason before enrollment, so that the change is intentional and auditable.
7. As a sales employee, I want enrollment to initialize the current Approval Revision and Signature Pending state, so that downstream approval behavior is immediately correct.
8. As a sales employee, I want enrollment and sending the approval request to remain separate actions, so that I can review the state before contacting the customer.
9. As a colleague reviewing Sales Activity, I want to see who enrolled the order and why, so that the timeline explains the policy change.
10. As a customer, I want the approval form to show the order's customer name automatically, so that I do not need to retype information already on the order.
11. As a customer, I want Customer name disabled, so that the approval cannot be submitted under a different typed name.
12. As an auditor, I want the server to derive the stored customer name from the immutable request snapshot, so that a forged browser payload cannot replace it.
13. As a desktop customer, I want to continue signing inline, so that the established desktop flow remains simple.
14. As a mobile customer, I want tapping Digital Signature to open a full-screen signing workspace, so that I have enough room to draw a recognizable signature.
15. As a mobile customer, I want guidance to rotate my phone horizontally, so that I understand how to get the widest signing area.
16. As a mobile customer whose browser cannot lock orientation, I want signing to remain usable in portrait, so that browser limitations do not prevent approval.
17. As a mobile customer, I want Clear to reset the working canvas, so that I can retry a poor signature.
18. As a mobile customer, I want Cancel to preserve my last confirmed signature, so that opening the modal cannot destroy accepted work.
19. As a mobile customer, I want OK disabled until I have drawn a signature, so that an empty canvas cannot appear complete.
20. As a mobile customer, I want OK to commit the signature back to the approval form, so that I can review and submit the completed response.
21. As a customer, I want customer-facing policy labeled simply Policy, so that internal version numbers do not distract from the terms.
22. As an administrator, I want policy versions retained in settings and history, so that evidence remains reproducible even though customers do not see the version suffix.
23. As a customer reading an invoice or order, I want the policy beside the subtotal and price footer, so that the terms and amount appear together without displacing order details.
24. As a customer, I want existing document notes preserved with the policy footer, so that other important order information is not lost.
25. As a customer paying through an applicable card, link, or terminal method, I want the approval review to show the derived C.C.C, so that I approve the same payable amount shown by the Sales Order.
26. As a customer, I want the approval review to show both order principal and total with C.C.C, so that the payment-channel charge is transparent.
27. As a non-card customer, I want C.C.C omitted, so that an inapplicable charge is not displayed.
28. As an accountant, I want `grandTotal` and `amountDue` to remain C.C.C-exclusive principal, so that approval presentation does not mutate accounting truth.
29. As a sales employee, I want a changed payment method, C.C.C percentage, or customer-visible total to require reapproval when it changes what the customer sees, so that prior evidence never approves a different payable total.
30. As a Role administrator, I want to assign Override Special Order Approval through normal Role configuration, so that the exception is narrow and intentional.
31. As a Super Admin, I want the override capability through existing implicit permission behavior, so that emergency authority remains consistent with other generated permissions.
32. As an operational employee with the override capability, I want to progress Signature Pending or Reapproval Required work when I also have the normal operation permission, so that approved business exceptions can continue.
33. As an employee without the underlying operational permission, I want the override capability to grant no purchasing, production, packing, or dispatch access, so that it cannot become a general operations permission.
34. As a customer who declined, I want my explicit decline to remain blocked from override, so that rejection is not treated like an unsigned request.
35. As an auditor, I want every override to identify the actor, role, order, revision, operation, enforcement mode, source, and time, so that the exception is distinguishable from an ordinary allow.
36. As an operator, I want the UI to state that approval was overridden while the operation succeeds, so that I understand the exceptional path used.
37. As a system owner, I want API, batch, automation, and job paths to share the same permission-aware decision, so that direct invocation cannot bypass or forge the override.
38. As a support operator, I want cancellation, rollback, release, reconciliation, and correction behavior unchanged, so that the override feature does not interfere with recovery.

## Implementation Decisions

- The completed Special Order specification remains the base contract. This
  addendum changes only the explicitly described enrollment, approval UI,
  document presentation, C.C.C display, permission, audit, and acceptance
  behavior.
- Sales Overview enrollment calls one server-owned classification transition
  shared with the Sales Form. The server reloads the order, effective enrollment
  audience, actor authority, canonical customer email, current declaration,
  prior evidence, and customer-visible projection before writing.
- The enrollment action is offered for an order that is not currently declared
  Yes. Re-enrollment after removal preserves prior requests and evidence as
  historical records.
- Missing email uses the existing canonical customer repair and exact-once
  continuation pattern. The pending action resumes only after a successful
  customer update.
- Enrollment requires a bounded reason, writes actor-attributed Sales Activity,
  initializes or refreshes the current revision and Signature Pending state,
  expires affected document snapshots, and invalidates the focused overview,
  list, history, and document queries.
- Enrollment never issues or sends an approval request implicitly. The existing
  state-aware send action remains the only request command.
- Customer name is sourced from the immutable request customer snapshot. The
  response command does not accept authoritative signer-name replacement from
  the public client; stored evidence uses the server-resolved customer name.
- The existing disclosure remains explicit that secure-link possession and a
  customer record name do not independently verify legal identity.
- The signature component supports an inline desktop host and a small-screen
  full-screen host without duplicating signature encoding, size validation, or
  response state. The modal uses a landscape-optimized canvas and portrait
  rotate guidance but does not depend on the Screen Orientation API.
- Mobile signature state has a working canvas and a confirmed value. Clear
  resets only the working canvas; Cancel restores or preserves the confirmed
  value; OK requires non-empty data and atomically replaces the confirmed value.
- Policy versions remain immutable in settings, requests, evidence, history,
  internal document data, and audit. Only customer-facing labels suppress the
  visible version suffix.
- Customer invoice/order HTML and both PDF templates compose the policy into
  the left footer column beside the price lines. Existing notes remain below
  the policy. Production and packing output keeps compact status and receives no
  full policy or signature expansion.
- Approval-request issuance uses the canonical Sales invoice C.C.C repair
  result rather than trusting cached summary values. The calculation resolves
  selected payment method, principal, configured percentage, stored C.C.C, and
  stale-value repair using decimal-safe Sales arithmetic.
- `grandTotal` remains principal, `ccc` remains the separate derived
  payment-channel amount, and `totalWithCcc` is their display sum. Applicable
  public approval and document totals use the repaired display values exactly
  once. Non-applicable methods resolve C.C.C to zero and omit the row.
- The immutable approval snapshot and revision cover the customer-visible
  payment method and repaired C.C.C display values. A change that changes those
  values supersedes Current Approval through the existing revision lifecycle.
- Actual C.C.C charged for a payment remains owned by payment transaction or
  ledger metadata, especially for partial or mixed payments. The approval
  snapshot does not rewrite historical payment evidence.
- Add `overrideSpecialOrderApproval` to the canonical generated permission
  scopes and expose its human label in Role configuration. Super Admin receives
  it through the existing generated-permission rule. No employee-specific
  toggle is introduced by this addendum.
- Operational authorization runs before or alongside the Special Order
  decision as appropriate, but both must pass. The override capability cannot
  satisfy an absent purchasing, production, packing, or dispatch permission.
- The shared enforcement input receives server-resolved actor capability. No
  API schema, task payload, or browser input may claim an override flag.
- Signature Pending and Reapproval Required may produce `OVERRIDDEN` for all
  four forward-progression categories when the actor has both permissions.
  Customer Declined remains blocked in blocking modes. Current Approval,
  ordinary orders, legacy unmanaged orders, warnings, and recovery operations
  preserve their existing decisions.
- Override feedback is a typed decision distinct from ordinary allow, warning,
  and block. UI callers show a successful but explicit override message using
  safe order, state, mode, and operation context.
- Durable override evidence records actor user, effective Role, order,
  revision, operation, enforcement mode, result, source, and timestamp.
  Idempotency prevents duplicate evidence for one command; bounded Sales
  Activity deduplication may prevent timeline spam without erasing operational
  audit evidence.
- The accepted override exception amends ADR-053. API permission documentation
  must distinguish the override capability from underlying operational
  authority when implementation lands.

## Testing Decisions

- Tests assert externally observable behavior and security boundaries rather
  than component internals. Server commands, public contracts, rendered
  documents, generated permissions, and browser workflows are the preferred
  seams.
- Sales Overview enrollment coverage includes eligible and ineligible actors,
  both enrollment audiences, missing-email success/cancel/failure, reason
  validation, re-enrollment, separate request sending, activity attribution,
  snapshot invalidation, and direct protected-command denial.
- Public approval coverage includes immutable name projection, forged-name
  rejection or disregard, desktop inline signing, small-screen modal state,
  portrait fallback, rotate guidance, Clear, Cancel, OK, empty-signature
  prevention, submission, reload, and terminal link behavior.
- C.C.C coverage reuses the established Sales display-calculation fixtures for
  applicable and non-applicable payment methods, missing/stale cached values,
  decimal rounding, base principal, derived fee, total with C.C.C, and no double
  counting. Snapshot/revision tests prove a customer-visible payment-total
  change requires reapproval.
- Renderer tests cover customer HTML and both PDF templates with policy/footer
  placement, hidden customer-facing version suffix, preserved internal version
  data, preserved notes, applicable C.C.C, non-card omission, and compact
  operational documents.
- Permission coverage proves Role configuration exposure, normalized generated
  scope, Super Admin behavior, ordinary Role assignment, session-derived
  authority, permission removal, and inability to forge capability input.
- The enforcement matrix covers all operation categories and invocation forms
  across Current Approval, Signature Pending, Reapproval Required, Customer
  Declined, Not Required, and legacy unmanaged states; all enforcement modes;
  with and without the override; with and without the underlying operation
  permission; and recovery operations.
- Audit tests distinguish `OVERRIDDEN` from allowed, warning, and blocked
  outcomes and prove actor/role/order/revision/operation/mode/source evidence,
  command idempotency, and bounded Sales Activity.
- Authenticated browser acceptance proves Sales Overview enrollment and Role
  configuration. Public browser acceptance uses a true mobile viewport to prove
  full-screen signing and a representative desktop viewport to prove parity.
- HTML preview and downloaded PDF are compared against the same customer order
  and payment method. No real customer email, hosted database, or stronger
  enforcement rollout is required for local acceptance.
- Existing focused Special Order, Sales calculation, print, permission, API,
  dashboard, and job tests remain green. Unrelated repository-wide baseline
  failures must be documented separately and cannot replace focused evidence.

## Out of Scope

- Changing whole-order Special Order classification into item-level flags.
- Automatically sending an approval request when Sales Overview enrollment
  completes.
- Allowing an employee outside the configured enrollment audience to classify
  an order from Sales Overview.
- Removing policy versions from internal settings, database evidence, history,
  documents, or audit records.
- Persisting C.C.C inside `SalesOrders.grandTotal` or `amountDue`.
- Replacing payment-ledger truth for actual, partial, mixed, refunded, or voided
  payment-channel charges.
- Allowing Override Special Order Approval to grant its own purchasing,
  production, packing, or dispatch access.
- Overriding Customer Declined, fabricating Current Approval, generating a
  signature, or changing historical customer evidence.
- Adding an employee-specific override toggle outside Role configuration.
- Changing the recovery-operation exemption.
- Extending enrollment to quotes, dealership, storefront, or the mobile Sales
  Form.
- Enabling stronger enforcement modes, deploying, or mutating hosted data as
  part of implementation planning.

## Further Notes

- Canonical terms are Special Order Declaration, Special Order, Approval
  Revision, Current Approval, Reapproval Required, Superseded Approval, and
  Special Order Approval Override. Avoid “special sale override.”
- Customer Declined is an explicit customer decision, not merely an unsigned
  approval. That distinction is why the role capability cannot bypass it.
- Customer-facing policy labels are intentionally simpler than internal
  evidence. Suppressing the visible version never changes the immutable policy
  association.
- The C.C.C requirement is display parity with the canonical Sales calculation,
  not a new pricing formula. ADR-011 and ADR-016 remain authoritative for
  principal, derived fee, rounding, and payment-ledger ownership.
