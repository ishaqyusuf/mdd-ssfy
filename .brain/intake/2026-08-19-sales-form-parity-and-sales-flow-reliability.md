# Brain Intake: Sales Form Parity And Sales Flow Reliability

## Status
Completed

## Created Date
2026-08-19

## Last Updated
2026-08-19

## Raw Input
- Restore the missing floating step search/action surface in the new sales form, including legacy step options such as Tabs, Select All, Pricing, Component, Refresh, and Enable/Disable Custom.
- For Garage Door and Exterior Door size rows, use `In-Swing` and `Out-Swing` choices.
- When `can.editSalesComponent` is true, render a leading `[ + ]` component card that opens creation.
- Make Address Line 1 optional in the sales-linked customer/address form.
- Fix the production quote -> Create Invoice path that opens, loads, and then reaches the Vercel 15-second runtime timeout.
- When a sales quantity changes, request inbound disposition only when the reduced line actually affects open inbound quantity, and save directly when no inbound/payment decision is required.

## Generated Plans And Handoffs
- [x] New Sales Form Step Picker And Component Creation Parity
  - Plan: `.brain/plans/2026-08-19-feature-new-sales-form-step-picker-parity.md`
  - Handoff: `.brain/handoffs/ready/2026-08-19-new-sales-form-step-picker-parity-handoff.md`
  - Agent: `gpt-5.6-terra`
- [x] Optional Address Line 1 In Sales Customer Forms
  - Plan: `.brain/plans/2026-08-19-bug-fix-sales-address-line-one-optional.md`
  - Handoff: `.brain/handoffs/ready/2026-08-19-sales-address-line-one-optional-handoff.md`
  - Agent: `gpt-5.6-terra`
- [x] Quote To Invoice Runtime Timeout
  - Plan: `.brain/plans/2026-08-19-bug-fix-quote-to-invoice-runtime-timeout.md`
  - Handoff: `.brain/handoffs/ready/2026-08-19-quote-to-invoice-runtime-timeout-handoff.md`
  - Agent: `gpt-5.6-sol`
- [x] Sales Quantity Decision Gating
  - Plan: `.brain/plans/2026-08-19-bug-fix-sales-quantity-decision-gating.md`
  - Handoff: `.brain/handoffs/ready/2026-08-19-sales-quantity-decision-gating-handoff.md`
  - Agent: `gpt-5.6-terra`

## Recommended Execution Order
1. Quote To Invoice Runtime Timeout (`gpt-5.6-sol`) because it is a production revenue-path failure and may create duplicate invoices when a timed-out request is retried.
2. Sales Quantity Decision Gating (`gpt-5.6-terra`) because it affects inventory/payment decisions on existing orders.
3. New Sales Form Step Picker And Component Creation Parity (`gpt-5.6-terra`).
4. Optional Address Line 1 In Sales Customer Forms (`gpt-5.6-terra`).

Tickets 1 and 2 can run in parallel with the two UI/form tickets. The three Terra tickets are independent review units and should not be bundled into one oversized implementation task.

## Agent Assignment Rationale
- Terra owns the bounded parity and decision-gating tickets because the shared UI capabilities, customer schemas, adjustment engine, and focused tests already exist.
- Sol is reserved for the timeout ticket because the failing interval can span the copy transaction, post-copy side effects, Vercel function execution, and the newly opened invoice load. Correctness requires stage timing, idempotency, and duplicate-write analysis before optimizing.

## Duplicate Or Existing Work
- `.brain/new-sales-form-missing-features-execution-plan.md` Phase 3 already names the floating step actions, but current code contains a toolbar implementation whose runtime placement and action completeness must be verified rather than rebuilt.
- `.brain/plans/2026-07-01-feature-sales-order-inventory-repair-on-updates.md` and `.brain/features/in-form-sales-order-adjustments.md` own the broader adjustment architecture. The new quantity ticket is a narrow correlation/gating fix inside that system.
- No existing Brain item specifically covers the production quote-to-invoice Vercel timeout.

## Approval Notes
- The user's request to create handoff tickets and save them to Brain is treated as approval of the listed scope.
- These are Codex model handoffs, not Hermes/OpenCode queue items. No global Brain-loop queue item or worktree was created.
