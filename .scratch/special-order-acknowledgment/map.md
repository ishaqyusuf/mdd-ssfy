# Special Order Acknowledgment And Customer Approval

## Destination

Deliver the stakeholder-approved Special Order acknowledgment workflow on internal dashboard Sales Orders, covering mandatory whole-order declaration, global Super Admin policy settings, revision-bound customer approval and signature, Sales email behavior, documents, notifications and Sales Activity, reapproval/removal, operational enforcement, legacy compatibility, validation, and rollout. This map is now the execution ledger for the approved implementation.

## Notes

Domain: GND Sales Orders and their customer-facing approval evidence. Every decision session must use the `grilling` and `domain-modeling` skills and preserve the language in `CONTEXT.md`.

Published implementation handoff: [`spec.md`](./spec.md) (`implementation-in-progress`). Fourteen approved tracer-bullet implementation tickets are published under [`issues/`](./issues/) with explicit blocking edges. Each ticket checklist is the authoritative record of completed versus remaining work. The earlier fourteen discovery and decision questions are preserved under [`decision-history/`](./decision-history/).

Standing stakeholder constraints established before charting:

- Classification belongs to the entire Sales Order, not individual invoice/service lines, HPT sizes, moulding rows, or components.
- Release one covers internal dashboard orders only. Existing orders remain exempt unless deliberately classified as Special Orders.
- Save & Close requires an explicit Yes/No Special Order Declaration. A Yes order may save and close while approval is pending.
- Customer approval uses an order-specific email action, complete customer-visible review, acknowledgment, printed name, and drawn signature without requiring login.
- Direct Sales Order document emails must append the approval action whenever the current Approval Revision lacks Current Approval; required-link generation fails the email rather than silently omitting the action.
- Approval links are revision-bound, time-limited, reused while active, single-use after completion, and replaced after expiry or revision change. Default expiry is seven days and Super Admin may configure 1-30 days.
- Customer-visible changes supersede Current Approval. Sales Overview provides state-aware send/resend and Request Re-Approval actions; manual reapproval requires a reason and records Sales Activity.
- Super Admin selects one global enforcement mode in Sales settings: Warning Only, Block Purchasing & Production, or Block All Operations. Warning Only is the launch default, and policy changes apply immediately to active Special Orders.
- Super Admin may publish versioned policy wording. Existing approvals preserve and remain valid under the wording they accepted.
- Customer decline requires a reason. Removing Special Order classification requires confirmation and a reason, records Sales Activity, and notifies the customer only after a request was delivered or an approval/decline exists.
- Customer completion/removal communication uses email; the assigned salesperson receives email and in-app notification; every event is represented in Sales Activity.
- Customer invoice/order PDFs carry a state-aware stamp and full policy. Production and packing documents carry compact Special Order status.
- A Special Order requires a valid email on its selected customer record. Selecting Yes or manually saving a governed order opens a focused customer-email dialog when missing. Sales Overview email follows the same interruption flow and automatically resumes the original send after the email is saved.

## Decisions so far

- The synthesized specification is the canonical product and engineering contract.
- The approved implementation breakdown contains fourteen vertical slices. Ticket 14 extends the declaration and Sales-email slices with one reusable customer-email prerequisite flow; later tickets declare their direct blockers.
- Discovery questions remain historical context and are not agent-grabbable implementation work.

## Implementation status (2026-08-13)

| Ticket | Status | Verified criteria | Remaining acceptance focus |
| --- | --- | ---: | --- |
| 01 — Declaration and lifecycle | complete | 10/10 | None |
| 02 — Policy and settings | complete | 10/10 | None |
| 03 — Request and public review | complete | 10/10 | None |
| 04 — Approval and signature | complete | 10/10 | None |
| 05 — Decline and terminal links | complete | 10/10 | None |
| 06 — Invalidation and reapproval | complete | 10/10 | None |
| 07 — Approval-aware email | complete | 10/10 | None |
| 08 — Sales documents | complete | 10/10 | None |
| 09 — Removal and re-enrollment | complete | 10/10 | None |
| 10 — Purchasing enforcement | complete | 10/10 | None |
| 11 — Production enforcement | complete | 10/10 | None |
| 12 — Packing and dispatch enforcement | complete | 10/10 | None |
| 13 — Rollout and acceptance | complete | 10/10 | None |
| 14 — Customer email prerequisite | complete | 11/11 | None |

All fourteen tickets are complete. Reopen an acceptance criterion only when a regression invalidates its recorded evidence.

### Completion evidence

- Automated: 77 focused tests pass with 290 assertions across 23 files. Coverage includes declaration/lifecycle, immutable settings, cryptographic capability reuse, complete public projection, approve/decline concurrency, direct customer/address invalidation, reapproval delivery ledger, notification retry, removal from pending/approved/declined, re-enrollment, all enforcement modes and operation categories, Sales email rendering, and document privacy.
- Type safety: `@gnd/sales`, `@gnd/api`, `@gnd/email`, and `@gnd/pdf` focused typechecks pass. The full dashboard graph was executed with an 8 GiB heap; feature-owned diagnostics were resolved, while the command remains nonzero on the repository's established unrelated cache API, legacy app-deps, Bun matcher, duplicate React, and Node typing baseline.
- Database: `db:generate` and `db:push` pass against local MySQL and report the schema current. `db:migrate` was attempted repeatedly; the repository's documented split-root/shadow migration preflight still cannot observe the active Docker engine, as recorded in ADR-053. No hosted database was touched.
- Browser: authenticated desktop and true 390×844 mobile QA covered declaration, missing-email repair, request/resend, complete order review, drawn signature, consumed-link receipt, customer-visible revision invalidation, reapproval, Warning Only and Block All presentations, removal/history/notifications, re-enrollment, and Sales-email resume. A final fabricated capability displayed only the generic invalid-link error. All test recipients use `.invalid`.
- Runtime: the shared `dashboard jobs` development stack remains active at `https://gndprodesk.localhost`; the Sales Overview QA order is retained in the in-app browser for handoff.

## Out of scope

- Component-, HPT-size-, moulding-line-, service-line-, or invoice-line-level Special Order flags.
- Dealership, storefront, mobile, and quote enrollment in release one.
- Customer account login, third-party e-signature providers, and formal identity verification beyond the secure capability link and captured signer evidence.
- Retroactively classifying historical orders without an explicit salesperson action.
- Returns, exchanges, RMA, or refund execution after a Special Order has been approved.
- Direct implementation inside this planning map; execution is owned by the published implementation tickets.
