# 01 — Special Order Declaration And Lifecycle Foundation

**What to build:** Make Special Order classification an explicit, whole-order decision in the internal Sales Order workflow. Salespeople can keep an unanswered draft, must choose Yes or No before Save & Close, and can see the resulting Special Order state independently from fulfillment status in the Sales Form and Sales Overview.

**Blocked by:** None — can start immediately.

**Status:** in-progress

- [x] Draft and autosave accept an unanswered Special Order Declaration without enrolling the order.
- [x] Save & Close and final save require an explicit Yes or No for newly governed internal Sales Orders and return a focused, stable validation result when unanswered.
- [x] Yes classifies the complete order as Special Order and produces Signature Pending; No produces Not Required.
- [x] No invoice, service, HPT-size, moulding-line, component, or customer-account Special Order flags are introduced.
- [x] Existing orders remain legacy/unmanaged and operationally exempt until a salesperson deliberately enrolls them.
- [x] Deliberately enabling Special Order on an existing order requires confirmation and a bounded reason and records actor-attributed Sales Activity.
- [x] The Sales Form exposes a persistent order-level declaration and concise state/next-action feedback.
- [x] Sales Overview exposes the independent Special Order state without changing or overloading the fulfillment lifecycle status.
- [x] Additive persistence, server-owned transitions, permissions, and query invalidation support the declaration without changing existing order behavior.
- [x] Behavioral tests cover draft, finalization, Yes, No, legacy enrollment, permissions, activity, and separation from fulfillment status.

## Implementation progress (2026-08-13)

- Implemented and covered by the Special Order domain, save-validation, Sales Form, and Sales Overview code paths.
- Remaining: consolidate the full declaration/permission/activity matrix into the final acceptance run.
