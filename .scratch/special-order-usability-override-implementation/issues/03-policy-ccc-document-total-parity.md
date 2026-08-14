# 03 — Align Policy, C.C.C, And Customer Document Totals

**What to build:** Make approval review and customer invoice/order output use a
simple Policy label, place the full policy and existing notes beside the price
footer, and show the same canonical derived C.C.C and customer-payable total as
the Sales Order without changing accounting principal or operational documents.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Public approval, customer HTML, and customer PDF surfaces display Policy without a visible version suffix.
- [ ] Settings, requests, approval evidence, history, audit data, and internal projections retain the immutable policy version.
- [ ] Customer invoice/order HTML and both PDF templates render the full policy in the footer's left column beside the price summary and preserve existing notes beneath it.
- [ ] Production and packing documents retain compact Special Order status and do not gain the full policy or customer signature expansion.
- [ ] Approval-request issuance resolves customer-visible C.C.C through the canonical Sales display calculation instead of trusting missing or stale cached summary values.
- [ ] Applicable card, link, and terminal snapshots expose principal, C.C.C with percentage, and total with C.C.C exactly once; non-applicable payment methods omit the charge.
- [ ] `grandTotal` and `amountDue` remain C.C.C-exclusive principal, and actual charged C.C.C remains owned by payment transaction or ledger evidence.
- [ ] The immutable approval snapshot and Approval Revision include the customer-visible payment method and repaired C.C.C display values so a material change requires reapproval.
- [ ] Calculation tests cover applicable and non-applicable methods, stale/missing C.C.C, configured percentages, decimal rounding, total composition, and double-count prevention.
- [ ] Renderer tests and representative HTML/PDF comparison cover policy placement, notes, hidden customer-facing version suffix, internal version preservation, C.C.C rows, total parity, and compact operational output.
