# Special Order Acknowledgment And Customer Approval

Status: implementation-in-progress

## Implementation Checkpoint (2026-08-13)

The approved specification is actively implemented. Ticket 14 (customer-email prerequisite and exact-once Sales email continuation) is complete. Tickets 1–9 have their core implementation criteria complete and await consolidated acceptance coverage. Tickets 10–12 have the shared enforcement decision and primary server gates implemented and await final authoritative-entry-point, UI, and bypass audits. Ticket 13 remains the final browser, regression, documentation, and rollout gate.

The authoritative per-criterion execution state is recorded in [`issues/`](./issues/), with a summary in [`map.md`](./map.md). Resume from unchecked criteria; checked criteria should be repeated only when a regression or changed requirement invalidates their evidence.

## Problem Statement

Sales representatives can currently create and advance orders containing custom, special-order, or otherwise non-returnable products without a durable record that the customer reviewed the complete order and accepted the no-return/no-exchange policy. The ambiguity is especially risky for configured doors and related work where sizes, styles, quantities, handing, glass, bore, frame or jamb, finish, hardware, pricing, and other custom specifications may be difficult or impossible to resell after purchasing or production begins.

The business needs a simple whole-order classification rather than component-level marking. When an internal Sales Order is a Special Order, the customer must receive the current order, policy, and a secure approval action; the customer must acknowledge the policy, provide a printed name, and draw a signature. The resulting evidence must remain attached to the exact Approval Revision that was reviewed.

The business must also be able to choose how strongly missing approval affects operations. A Super Admin needs one global Sales setting that can provide warnings only, block purchasing and production, or block every purchasing, production, packing, and dispatch action. The launch must default to warnings so the workflow can be observed before stronger enforcement is enabled.

## Solution

Add a mandatory Special Order Declaration to the internal dashboard Sales Order flow. The declaration applies to the complete order: Yes classifies that Sales Order as a Special Order, while No records that approval is not required. Draft work may continue without an answer, but Save & Close requires an explicit decision.

A Special Order can be saved and closed while customer approval is pending. Direct Sales Order document emails and order reminders automatically include a revision-bound approval action whenever the order lacks Current Approval. The public approval experience presents the complete customer-visible Approval Revision and the versioned Special Order policy. The customer can approve by checking the acknowledgment, entering a printed name, and drawing a signature, or decline by entering a required reason.

Approval capabilities are secure, revision-bound, reusable while active, configurable from one to thirty days, and single-use after approval or decline. The default lifetime is seven days. Customer-visible order changes supersede Current Approval, revoke stale capabilities, preserve the historical evidence, and place the order in Reapproval Required. Sales Overview provides state-aware request, resend, review, reapproval, and removal actions.

Super Admin configures policy wording, capability lifetime, and enforcement mode in a dedicated Special Order section of Sales settings. Policy wording is versioned. Existing Current Approvals remain valid under the wording accepted by the customer, while new Approval Revisions use the latest published policy.

Customer invoice/order documents carry a state-aware Special Order stamp and the applicable policy. Production and packing documents show a compact Special Order status without exposing the customer's signature. Customer communications, assigned-salesperson notifications, Sales Activity, approval history, and email delivery evidence provide an auditable record of every material transition.

A governed Special Order must have a valid email on the selected customer record. Selecting Yes or manually saving a Special Order with no customer email opens a focused update dialog. The dialog updates the canonical customer record before continuing. Sales Overview email uses the same interruption flow and automatically resumes the original send after a successful email update.

## User Stories

1. As a salesperson, I want to explicitly answer whether an order is a Special Order, so that the classification is intentional rather than inferred from product text.
2. As a salesperson, I want the declaration to apply to the entire order, so that I do not have to classify invoice lines, service lines, HPT sizes, moulding rows, or individual components.
3. As a salesperson, I want to save an unfinished draft before answering the declaration, so that normal drafting and recovery are not interrupted.
4. As a salesperson, I want Save & Close to require an explicit Yes or No answer, so that a completed order cannot silently skip the decision.
5. As a salesperson, I want a persistent Special Order control in the invoice summary area, so that I can see and change the classification while editing.
6. As a salesperson, I want an unanswered Save & Close attempt to open a focused review prompt, so that I can resolve the missing declaration without losing work.
7. As a salesperson, I want a Special Order to save and close while approval is pending, so that the customer can receive a stable order-specific approval link.
8. As a salesperson, I want manually enabling Special Order on an existing order to require confirmation and a reason, so that the change is deliberate and explainable.
9. As a salesperson, I want manually enabling Special Order to add an actor-attributed Sales Activity, so that colleagues can see who changed the policy and why.
10. As a salesperson, I want ordinary orders to display Not Required, so that I can distinguish a completed declaration from an unanswered legacy record.
11. As a salesperson, I want legacy orders to remain operationally exempt until deliberately enrolled, so that launch does not unexpectedly stop active work.
12. As a salesperson, I want a clear Signature Pending state after classifying an order as special, so that the next required customer action is obvious.
13. As a salesperson, I want Sales Overview to show the current Special Order state, so that I can manage approval without reopening the editor.
14. As a salesperson, I want Sales Overview actions to change with the order state, so that I see only meaningful approval actions.
15. As a salesperson, I want to send or resend an approval request while approval is pending, so that I can follow up without changing the order.
16. As a salesperson, I want to request reapproval after a valid approval, so that I can intentionally obtain new evidence even when the order content is unchanged.
17. As a salesperson, I want Request Re-Approval to require a reason, so that superseding valid evidence is auditable.
18. As a salesperson, I want Request Re-Approval to immediately supersede Current Approval and send a new customer request, so that the order does not continue to appear approved during follow-up.
19. As a salesperson, I want an email failure during reapproval to remain visible and retryable, so that a superseded approval is not mistaken for a delivered request.
20. As a salesperson, I want to review the customer's decline and reason, so that I can correct the order or contact the customer.
21. As a salesperson, I want to send a revised request after a decline, so that the customer can approve a corrected Approval Revision.
22. As a salesperson, I want removing Special Order classification to require confirmation and a reason, so that customer-protection evidence is not casually removed.
23. As a salesperson, I want removal to preserve all prior approvals and declines as Superseded Approvals, so that historical evidence is never erased.
24. As a salesperson, I want removal to create Sales Activity, so that the order timeline explains why approval no longer applies.
25. As a salesperson, I want removal to notify the customer only when a request was delivered or an approval/decline exists, so that uninformed customers do not receive confusing policy-removal messages.
26. As a salesperson, I want removal to succeed with a visible skipped-delivery warning when no customer email exists, so that an incorrect classification does not trap the order.
27. As a customer, I want the approval email to identify the order clearly, so that I know what I am being asked to review.
28. As a customer, I want the approval page to show the complete customer-visible order, so that I can verify products, services, specifications, quantities, prices, discounts, tax, and total.
29. As a customer, I want to read the exact Special Order policy before signing, so that I understand that the classified order is non-returnable and non-refundable.
30. As a customer, I want to affirm an acknowledgment checkbox, so that acceptance of the policy is explicit.
31. As a customer, I want to enter my printed name, so that the approval record identifies the signer as represented by the link holder.
32. As a customer, I want to draw my signature on desktop or mobile, so that the company retains recognizable approval evidence.
33. As a customer, I want to decline approval with a required reason, so that the salesperson knows what must be addressed.
34. As a customer, I want expired or stale links to explain why approval cannot continue, so that I know to request a current link.
35. As a customer, I want reopening a consumed link to show an Approval already completed receipt, so that I receive confirmation without being able to submit twice.
36. As a customer, I want an approval-completion email, so that I have an independent record of the completed action.
37. As a customer, I want a removal email when a previously communicated Special Order policy is removed, so that I understand the updated order status.
38. As a customer, I want each order to require its own approval, so that approval never carries over to a different order for the same customer.
39. As a customer, I want an earlier email link to stop authorizing approval after the order changes, so that I cannot accidentally approve obsolete details.
40. As a customer receiving an email containing multiple orders, I want a separate approval action for each pending Special Order, so that each order is reviewed independently.
41. As a salesperson, I want direct order document emails to append the approval action automatically, so that I cannot accidentally omit it.
42. As a salesperson, I want approved current orders to stop showing the approval action in future Sales emails, so that customers are not asked to sign repeatedly.
43. As a salesperson, I want order reminders and resends to use the same approval rules, so that alternate delivery paths cannot bypass the workflow.
44. As a salesperson, I want the system to reuse an active unexpired link for the same Approval Revision, so that older emails remain usable.
45. As a salesperson, I want an expired link to be replaced when I resend or send another eligible Sales email, so that the customer receives a valid capability.
46. As a salesperson, I want a Sales email to fail visibly if a required approval action cannot be generated, so that the system never sends an incomplete compliance request.
47. As a salesperson, I want email delivery attempts and retries in the existing Sales email ledger, so that failures are operationally visible.
48. As a Super Admin, I want a dedicated Special Order section in Sales settings, so that policy configuration is centralized with other Sales behavior.
49. As a Super Admin, I want only Super Admins to change Special Order settings, so that compliance behavior cannot drift by salesperson.
50. As a Super Admin, I want one global enforcement mode, so that every office follows the same active policy.
51. As a Super Admin, I want Warning Only mode, so that missing approval is visible without stopping operations.
52. As a Super Admin, I want Block Purchasing & Production mode, so that approval can be required before irreversible procurement or manufacturing work begins.
53. As a Super Admin, I want Block All Operations mode, so that purchasing, production, packing, and dispatch can all require Current Approval.
54. As a Super Admin, I want Warning Only to be the launch default, so that behavior can be observed before enforcement becomes restrictive.
55. As a Super Admin, I want enforcement changes to apply immediately to active Special Orders, so that one current company policy governs operations.
56. As a Super Admin, I want to configure approval-link lifetime from one to thirty days, so that security and customer response time can be balanced.
57. As a Super Admin, I want seven days as the default link lifetime, so that links are not indefinitely reusable.
58. As a Super Admin, I want to draft and preview policy wording before publication, so that customer-facing language can be checked safely.
59. As a Super Admin, I want publishing policy wording to create an immutable version, so that every approval can reproduce the text accepted.
60. As a Super Admin, I want existing Current Approvals to remain valid after publishing new wording, so that policy maintenance does not invalidate completed evidence retroactively.
61. As a purchasing employee, I want a clear warning or block when an unapproved Special Order is governed by the active mode, so that I understand why procurement may or may not continue.
62. As a production employee, I want a clear warning or block before production progression, so that I do not unknowingly manufacture an unapproved Special Order.
63. As a packing employee, I want compact Special Order status on packing documents and screens, so that I can recognize customer-approval risk without seeing private signature evidence.
64. As a dispatch employee, I want Block All Operations mode to prevent dispatch progression without Current Approval, so that fulfillment follows the configured policy.
65. As an operations employee, I want cancellation, correction, rollback, and safe receiving of already-ordered goods to remain available, so that enforcement does not prevent risk-reducing work.
66. As an operations employee, I want automated and batch actions to follow the same enforcement rules as manual actions, so that alternate entry points cannot bypass policy.
67. As an operations employee, I want warning and blocking messages to include the order and next action, so that I can route the issue to Sales quickly.
68. As a salesperson, I want customer-visible changes to automatically create a new Approval Revision, so that signed evidence never silently follows a changed order.
69. As a salesperson, I want customer, line, description, specification, quantity, price, discount, tax, and total changes to invalidate Current Approval, so that every commercially meaningful change requires review.
70. As a salesperson, I want internal-only metadata and harmless presentation changes not to trigger reapproval, so that customers are not asked to sign unnecessarily.
71. As a salesperson, I want an invalidating save to set Reapproval Required without automatically emailing, so that autosaves and iterative edits do not spam customers.
72. As a salesperson, I want the next eligible Sales email to include the current reapproval action automatically, so that ordinary communication can deliver the request.
73. As an auditor, I want every approval and decline to retain the Approval Revision, policy text/version, signer evidence, order identity, customer snapshot, salesperson snapshot, and server timestamp, so that the historical record is self-contained.
74. As an auditor, I want Superseded Approvals to remain immutable and readable, so that later changes cannot rewrite prior evidence.
75. As an auditor, I want approval, decline, invalidation, reapproval, removal, request delivery, and significant failure events in Sales Activity, so that the order timeline explains the workflow.
76. As an assigned salesperson, I want in-app and email notification when a customer approves or declines, so that I can act promptly.
77. As an assigned salesperson, I want notification when Special Order classification is removed, so that I know the protection no longer applies.
78. As a support employee, I want notification delivery failures to be visible and retryable without reversing completed domain changes, so that evidence and communication can recover independently.
79. As a document recipient, I want customer invoice/order PDFs to display a state-aware Special Order stamp, so that Pending, Approved, Reapproval Required, and Declined are not confused.
80. As a document recipient, I want the applicable Special Order policy printed on customer invoice/order documents, so that the document matches the approval context.
81. As an internal production or packing employee, I want only compact status rather than the customer's raw signature, so that private evidence is disclosed only where necessary.
82. As a salesperson, I want current documents to be invalidated and regenerated when approval state changes, so that stale stamps are not reused.
83. As a security reviewer, I want approval tokens stored as non-reversible hashes, so that database access does not reveal active customer capabilities.
84. As a security reviewer, I want the public mutation to verify current revision, expiry, consumption, and request status transactionally, so that stale or concurrent submissions fail safely.
85. As a security reviewer, I want signature documents private and permission checked, so that customer evidence is not publicly enumerable.
86. As a security reviewer, I want public approval to avoid claiming verified legal identity beyond possession of the secure link and captured signer evidence, so that product wording accurately represents its assurance level.
87. As an engineer, I want one package-owned Special Order domain policy, so that the sales form, email, documents, and operational commands share the same state and enforcement meaning.
88. As an engineer, I want stable error codes for approval-required and stale-link outcomes, so that every caller can render consistent feedback.
89. As an engineer, I want additive schema and compatibility behavior, so that existing orders and current production flows remain safe during rollout.
90. As an engineer, I want idempotent request, approval, decline, notification, and activity writes, so that retries do not create duplicate evidence.
91. As a salesperson, I want selecting Special Order to verify the selected customer has a valid email, so that an approval request can actually be delivered.
92. As a salesperson, I want a focused email-update dialog when that email is missing, so that I can repair the customer without abandoning the Sales Form.
93. As a salesperson, I want manual save of an already-governed order to perform the same email prerequisite check, so that stale or imported data cannot bypass the requirement.
94. As a salesperson sending a Sales email from Sales Overview, I want a missing-email dialog to save the customer email and automatically resume the original send, so that I do not have to repeat the action.

## Implementation Decisions

1. **Release scope**: Release one applies only to internal dashboard Sales Orders. Quotes, dealership, storefront, and mobile enrollment are excluded. An order is independently classified; classification never belongs to the customer account and never carries to another order.

2. **Whole-order classification**: Special Order is an order-level concept. Do not add flags to individual invoice items, service items, HPT sizes, moulding lines, components, or other nested configuration rows. All customer-visible content in the order participates in approval review.

3. **Declaration semantics**: Model the Special Order Declaration as three distinguishable values: unanswered/unmanaged, No, and Yes. Draft/autosave may persist unanswered. Save & Close and final save for newly governed internal orders require Yes or No. No produces Not Required; Yes produces Signature Pending unless Current Approval already matches the Approval Revision.

4. **Legacy compatibility**: Existing orders with no policy enrollment remain legacy-unmanaged and are not blocked or warned by Special Order enforcement. Editing a legacy order does not enroll it automatically. A salesperson deliberately enrolling it through the Special Order control begins the governed lifecycle and requires confirmation, reason, and Sales Activity.

5. **Canonical staff states**: Staff-facing state is one of Legacy/Not Evaluated, Not Required, Signature Pending, Customer Approved, Reapproval Required, or Customer Declined. Link delivery/expiry is request metadata, not a replacement for the business state.

6. **Approval lifecycle**:
   - Yes on an unapproved order creates Signature Pending.
   - Successful approval creates Current Approval and Customer Approved.
   - Customer decline creates Customer Declined and retains the required reason.
   - A governed customer-visible change revokes active capabilities, supersedes Current Approval or the prior decline/request evidence, computes a new Approval Revision, and produces Reapproval Required when prior customer evidence existed; otherwise the order remains Signature Pending for its new revision.
   - Manual Request Re-Approval immediately supersedes Current Approval, requires a reason, creates a new request for the current order revision, records Sales Activity, and attempts delivery.
   - Removing the classification revokes active capabilities, supersedes prior evidence, records a required reason, and produces Not Required.
   - Re-enabling classification later creates a new governed Approval Revision; historical approvals never become current again automatically.

7. **Approval Revision**: Build a deterministic revision from a canonical customer-visible projection. It includes order/customer identity, all line and grouped configuration content shown to the customer, descriptions, dimensions and specifications, quantities, handedness, pricing, additional costs, discounts, taxes, and totals. It excludes internal notes, activity, operational statuses, signature/request metadata, and presentation-only ordering that does not change customer meaning. Normalize keys, arrays with semantically stable identities, decimals, dates, and blank values before hashing.

8. **Policy version relationship**: Every issued approval request snapshots one published policy version and its exact acknowledgment text. Publishing a new policy does not mutate active issued requests or invalidate Current Approvals. The next newly issued Approval Revision uses the latest published version.

9. **Initial policy content**: Seed a policy based on the approved business brief: the order contains special/custom or non-returnable items; those items are non-returnable and non-refundable; the customer has reviewed the complete order including sizes, styles, quantities, handing, glass, bore, frame/jamb, finish, hardware, pricing, and custom specifications; and the customer confirms the order is correct. Super Admin may replace this text through versioned publication.

10. **Sales settings**: Add a Super Admin-only Special Order section to the existing global Sales settings surface. It owns enforcement mode, approval-link lifetime, current published policy, policy draft/preview, and policy version history. Preserve unrelated Sales settings during every write.

11. **Enforcement modes**:
    - Warning Only permits purchasing, production, packing, and dispatch while surfacing the missing/stale approval state.
    - Block Purchasing & Production blocks new purchasing commitments and production progression while continuing to allow packing/dispatch if otherwise valid.
    - Block All Operations adds packing and dispatch progression to the blocked set.
    - The launch default is Warning Only. Super Admin changes apply immediately to every governed active Special Order.

12. **Enforcement safety exceptions**: Enforcement never blocks viewing, editing, sending approval requests, cancellation, release, rollback, reconciliation, error recovery, or recording receipt of goods already ordered. It does not reverse existing purchasing, production, packing, or dispatch evidence. Payment collection is outside the enforcement matrix. There is no employee override in release one.

13. **Server authority**: UI warnings and disabled controls explain the active policy but are not the integrity boundary. One package-owned assertion evaluates the current order declaration, Approval Revision, Current Approval, enforcement setting, and requested operation category. Every authoritative manual, automated, batch, and background-task entry point must call it before creating new governed operational effects.

14. **Stable enforcement contract**: Blocked callers receive a stable Special Order approval-required code plus order identity, current approval state, active enforcement mode, and recommended Sales action. Warning Only callers receive equivalent warning metadata without failing the operation. Logging and observability should deduplicate repeated attempts by order/revision/operation rather than flooding Sales Activity.

15. **Persistence model**: Use additive, queryable relational state rather than JSON-only metadata:
    - The order stores the nullable declaration/enrollment marker, current state, current revision, current policy/request context, and optional Current Approval pointer.
    - An immutable approval-evidence aggregate stores approval or decline outcome, revision, exact policy text/version, complete customer-visible order snapshot, signer printed name, signature document reference when approved, decline reason when declined, customer/salesperson identity snapshots, server timestamps, invalidation/supersession context, and request identity.
    - A request/capability record stores order, revision, policy version, token hash, expiry, delivery/consumption/revocation state, and idempotency identifiers.
    - Historical evidence is never overwritten or deleted as part of ordinary state transitions.

16. **Capability security**: Generate high-entropy random capabilities and persist only a cryptographic hash. At most one active unexpired capability exists per order and Approval Revision. Eligible repeated emails reuse it. Revision change, manual reapproval, classification removal, or explicit replacement revokes it. Expiry uses the configured 1-30 day value captured at issuance; default is seven days.

17. **Single-use behavior**: Approval or decline consumes the active capability transactionally. A repeated GET may render a minimal read-only completion receipt. A repeated mutation cannot approve, decline, or replace evidence. Concurrent submissions resolve to one committed outcome; the loser receives the already-completed response.

18. **Signer evidence**: Approval requires the acknowledgment checkbox, non-empty bounded printed name, and canonical PNG drawn signature within a strict size limit. Decline requires a non-empty bounded reason and does not require a signature. Record server time and bounded request/user-agent evidence for troubleshooting, but describe the assurance honestly: link possession plus captured signer representation, not verified legal identity.

19. **Signature storage**: Register approved signatures through the shared private document platform, owned by the immutable approval evidence. Raw data URLs never remain in Sales order metadata. Staff reads require existing Sales/order access; production and packing DTOs never include the raw signature.

20. **Transactional approval command**: The public command reloads request, order, current revision, and policy; validates active/unexpired/unconsumed capability; verifies revision equality; stages or claims the signature document; creates immutable evidence; consumes the request; updates Current Approval/state; and writes Sales Activity atomically. Document invalidation, query events, and notifications run after commit with idempotent retry evidence.

21. **Public responses**: Invalid capabilities reveal no order details. Expired or revision-stale capabilities explain that a current request is required. Consumed capabilities display only a safe completion receipt. The public page does not require customer login.

22. **Sales Form experience**: Add a persistent order-level control in the invoice summary/details region. Save & Close or final save opens a focused required-declaration prompt when unanswered. Enabling an existing order requires confirmation and reason. The form header/summary displays state and a concise next-action message without confusing it with save status or the existing fulfillment lifecycle.

23. **Sales Overview experience**: Display a separate Special Order badge/status, never reuse the general Sales order lifecycle status. Provide state-aware actions:
    - Signature Pending: Send/Resend Approval Request.
    - Customer Approved: Request Re-Approval.
    - Reapproval Required: Send Re-Approval Request.
    - Customer Declined: Review Decline and Send Revised Request.
    - Governed states: View Approval History and Remove Special Order where authorized.

24. **Manual reapproval delivery**: Request Re-Approval requires a reason, supersedes Current Approval immediately, writes Sales Activity, creates or resolves the current revision request, and sends the customer email. If delivery fails, the order stays Reapproval Required, the failure appears in the Sales email ledger, and the state-aware action offers retry.

25. **Automatic invalidation delivery**: Saving a customer-visible change supersedes Current Approval and creates Reapproval Required but does not automatically email. This prevents autosave and iterative edits from generating customer spam. Explicit Sales Overview action or the next eligible Sales email delivers the request.

26. **Approval-aware email scope**: Apply automatic approval actions to direct internal Sales Order document emails, their resends, and their order reminders. Do not add them to payment receipts, customer statements, or unrelated operational emails. Approved current orders omit the action. Each pending Special Order in a multi-order email receives its own action.

27. **Email fail-closed rule**: If an eligible email requires an approval action and the system cannot produce a valid link for every included pending Special Order, fail the Sales email visibly and write failed delivery-ledger evidence. Never silently send the document without the mandatory action.

28. **Email ledger and retry**: Extend the existing Sales email delivery ledger payload/evidence so resend can reconstruct approval-aware messages without accepting stale caller-provided links. Retry resolves current server state and either reuses the active capability, issues a replacement after expiry, or suppresses the action after Current Approval.

29. **Customer completion/removal communication**: Successful approval or decline sends the customer a result email and sends the assigned salesperson email plus in-app notification. Removing classification emails the customer only if a request was delivered or customer evidence exists; otherwise customer delivery is skipped with an explicit internal result. Missing customer email never rolls back removal.

30. **Sales Activity contract**: Record actor-attributed, idempotent activities for manual classification, request/retry outcome, approval, decline and reason, automatic invalidation, manual reapproval and reason, classification removal and reason, skipped removal delivery, and material workflow failures. Public customer actions use customer-safe actor labels plus immutable evidence identity; employee actions use authenticated server identity.

31. **Document behavior**: Customer invoice/order HTML and PDF render a prominent state-aware stamp for Signature Pending, Customer Approved, Reapproval Required, or Customer Declined, and print the policy version applicable to the current request/approval context. Approved documents include printed signer name and approval date; raw signature presentation is limited to the customer acknowledgment section where explicitly intended. Production and packing documents show compact status only.

32. **Document cache invalidation**: Declaration, policy/request context, approval, decline, supersession, reapproval, and removal invalidate affected current Sales document snapshots. Regenerated documents resolve state server-side and cannot trust stale caller flags.

33. **Permissions**: Existing order-edit authority is required to set/remove classification and request/retry approval. Existing order-read/document access controls staff status/history/signature access. Only Super Admin can manage global settings and publish policy. Public approval authority derives only from a valid capability scoped to one order revision. Operational permissions remain required in addition to passing the Special Order gate.

34. **Notification failure semantics**: A notification or receipt-email failure after a successful approval/decline/removal does not roll back the domain transition. Persist retryable delivery evidence and show the failure to staff. A failure to build the mandatory approval capability before sending a Sales email prevents that email.

35. **Compatibility and rollout**: Deploy additive storage and read-compatible state first. Enable declaration UI and Warning Only mode for governed new orders. Observe pending age, approval/decline rates, stale-link rate, email failures, reapproval frequency, warning encounters, and would-block counts before enabling stronger modes. Existing unmanaged orders remain exempt unless explicitly enrolled.

36. **Brain and durable documentation**: Implementation must update the Sales feature documentation, database schema/relationships/migrations, API endpoints/contracts/permissions, task state, progress log, and an ADR for the durable revision-bound approval aggregate and centrally configurable enforcement boundary.

37. **Customer email prerequisite and continuation**: A valid email must exist on the selected canonical customer before Yes is applied or a governed Special Order is manually saved. Missing email opens one reusable Shadcn dialog following the Midday customer-edit pattern: local Zod validation, mutation-owned pending/error state, exact query invalidation, and continuation only after the customer update succeeds. Cancellation leaves classification/save/send incomplete. Sales Overview direct Sales email stores the pending send intent and resumes it exactly once with the newly saved email. The server independently rejects non-autosave governed saves without a customer email. The focused update mutation permits existing customer-edit or order-edit authority and remains dealer-customer read-only.

## Testing Decisions

1. **Testing philosophy**: Tests assert externally observable behavior—returned status, persisted business state, rendered communication/document content, emitted activity/notification evidence, and permitted or blocked operations. Do not couple tests to private helper names, internal query ordering, React component state, or exact storage implementation beyond durable public contracts.

2. **Primary workflow seam**: Exercise the highest API/service boundary that owns protected employee commands, public capability commands, and operational enforcement. This seam must cover declaration/finalization, request creation/reuse, approval, decline, invalidation, reapproval, removal, settings application, permission checks, idempotency, and blocked/warning operation results. Reuse the repository's existing transaction-oriented new Sales Form adjustment and customer-approval testing style as prior art.

3. **Domain matrix beneath the primary seam**: Add focused deterministic tests for Approval Revision normalization/hash stability, governed-change classification, state transitions, capability decisions, enforcement-mode decisions, and legacy exemption. These are justified because the same rules serve API, jobs, email, documents, and UI; they prevent caller drift while the API tests remain the acceptance authority.

4. **Sales email seam**: Test the existing simple/composed Sales document notification interfaces with realistic order projections. Assert button presence/suppression, one action per pending Special Order, active-link reuse, expiry replacement, multi-order behavior, fail-closed generation, ledger retry, and server-side re-resolution after approval or revision change. Follow current Sales PDF attachment and quote-acceptance email tests as prior art.

5. **Sales document seam**: Test the shared Sales print-data projection and HTML/PDF renderers using pending, approved, reapproval-required, declined, removed, and legacy fixtures. Assert state stamp, policy text/version, approved signer/date, compact production/packing presentation, signature privacy, and cache invalidation behavior. Follow existing template-mode and snapshot-invalidation tests as prior art.

6. **End-to-end UI seam**: Use authenticated browser coverage for one internal Sales Order journey and public browser coverage for the capability journey. Validate mandatory Save & Close declaration, persistent control, reason confirmations, Overview state/actions/history, email request, responsive public review, drawn signature, completed receipt, automatic reapproval after a customer-visible edit, decline, removal, and all three enforcement presentations.

6a. **Customer email prerequisite seam**: Cover Yes selection, existing governed manual save, and Sales Overview direct email with a selected customer whose email is null. Assert the dialog validates and persists the canonical email, cancellation leaves the original action incomplete, successful save continues classification/save, and successful Overview repair resumes exactly one email send without another click.

7. **Declaration scenarios**:
   - Draft save succeeds while unanswered.
   - Save & Close/final save fails with a focused prompt while unanswered.
   - No persists Not Required and emits no approval CTA.
   - Yes persists Signature Pending and includes the whole order rather than line flags.
   - Legacy unmanaged order remains exempt until explicit enrollment.

8. **Revision scenarios**:
   - Equivalent normalized payloads produce the same revision.
   - Customer, line, specification, quantity, price, discount, tax, and total changes produce a new revision.
   - Internal notes, operational status, and harmless presentation changes do not.
   - Old Current Approval and capabilities become superseded/revoked after governed changes.
   - Publishing new policy does not invalidate completed Current Approval or mutate an issued request.

9. **Capability scenarios**:
   - One active capability is reused for the same revision.
   - Expiry produces a replacement on eligible resend.
   - Revision change revokes the prior capability.
   - Approval/decline consumes it once.
   - Concurrent submissions create one outcome.
   - Invalid/stale tokens disclose no order details.
   - Consumed-link GET displays a receipt while mutation remains disabled.

10. **Approval/decline validation**:
    - Approval requires acknowledgment, bounded printed name, and valid PNG signature.
    - Oversized, malformed, missing, or unsupported signatures fail without Current Approval.
    - Decline requires a reason and no signature.
    - Successful outcomes preserve immutable snapshots and actor/timestamp evidence.
    - Post-commit notification failure leaves the domain outcome intact and retryable.

11. **Enforcement matrix**: For each mode, exercise manual, automated, batch, and task-based entry points for purchasing, production, packing, and dispatch. Assert Warning Only permits with warning metadata; Block Purchasing & Production blocks only governed commitment/progression; Block All adds packing/dispatch; approved/not-required/legacy orders continue; and cancellation, release, rollback, reconciliation, and receipt of already-ordered goods remain available.

12. **Settings and permissions**:
    - Only Super Admin reads management detail and mutates/publishes policy settings.
    - Link lifetime rejects values outside 1-30 days.
    - Writes preserve unrelated Sales settings.
    - Mode changes affect active governed orders immediately.
    - Ordinary order permissions cannot bypass Super Admin settings or operational gate requirements.

13. **Communication scenarios**:
    - Approved current order emails omit approval action.
    - Pending, declined, and reapproval-required orders include state-appropriate actions.
    - Multi-order email contains independent actions.
    - Capability-generation failure marks email failed and sends nothing.
    - Customer completion/removal and salesperson email/in-app notifications deduplicate across retries.
    - Removal with missing customer email records skipped delivery and succeeds.

14. **Document scenarios**: Verify all supported customer invoice/order templates and modes, plus production and packing documents. Test that a state change expires/warmups snapshots and that the next preview/download resolves fresh server-owned status.

15. **Migration/compatibility scenarios**: Validate additive migration against legacy null/unmanaged rows, newly governed rows, and data with existing Sales metadata/documents. Confirm no backfill infers Special Order from descriptions and no existing order becomes blocked merely because the feature deploys.

16. **Acceptance gate**: Broad validation includes relevant package/API tests, Sales notification/email tests, sales-document tests, dashboard typecheck, the narrowest relevant builds, and authenticated browser evidence for the complete pending-to-approved-to-reapproval journey. Stronger enforcement must not be enabled until warning-mode telemetry and browser rehearsal meet the rollout thresholds documented during implementation.

## Out of Scope

- Per-item, per-service, per-component, HPT-size, moulding-line, or configuration-step Special Order designation.
- Quotes, dealership portal, storefront, mobile Sales Form, and customer-account dashboard enrollment in release one.
- Automatic Special Order inference from catalog names, descriptions, “special order only” text, custom components, or product types.
- Retroactive enrollment or blocking of existing orders without deliberate salesperson action.
- Customer login, password creation, identity-document verification, notarization, third-party e-signature providers, or a claim of verified legal identity.
- Automated SMS, WhatsApp, or postal approval delivery. Existing direct Sales Order email is the release-one transport.
- Returns, exchanges, RMA, refund, wallet-credit, chargeback, or inventory-disposition policy after approval.
- Reversing or deleting purchasing, production, packing, dispatch, payment, or historical approval evidence when state changes.
- Payment collection as a Special Order enforcement category.
- Employee override of the configured enforcement policy.
- Implementation of the feature within this specification-writing task.

## Further Notes

- Canonical domain terms are Special Order Declaration, Special Order, Special Order Enforcement Mode, Approval Revision, Current Approval, Reapproval Required, and Superseded Approval. Avoid “special-order customer,” “component special order,” and “cancelled signature.”
- The feature is a compliance and operational acknowledgment workflow, not a replacement for quote acceptance, payment authorization, production material review, or customer-approved sales adjustments. Reuse their proven token, immutable snapshot, activity, and document patterns without merging their business meanings.
- The existing general Sales order status feeds fulfillment lifecycle calculations and must not store Special Order state. Expose Special Order as an independent queryable status and badge.
- The public approval flow demonstrates possession of an order-specific capability and captures signer-provided evidence. Legal counsel or the business owner should review final policy wording and any jurisdiction-specific electronic-signature claims before stronger enforcement is enabled.
- The local Wayfinder map and decision tickets remain supporting planning history. This `implementation-in-progress` specification and its ticket checklists are the implementation handoff and execution ledger produced from the stakeholder conversation, repository analysis, implementation, and validation evidence.
