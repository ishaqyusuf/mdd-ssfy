# 02 — Surface Material Handoff Actions

**What to build:** Show each sales representative a durable Material Handoff Action when one of their payment-qualified orders has applicable tracked demand without real inbound coverage. The Sales Orders alert must take them directly to the existing inbound workflow and remove the action when canonical coverage is recorded.

**Blocked by:** 01 — Configure the Sales Handoff Trigger.

**Status:** completed

- [x] One server-owned projection derives Material Handoff Actions from the configured payment policy, order lifecycle, applicable inventory demand, fulfillment, and linked inbound evidence.
- [x] Positive applicable tracked demand is actionable only for its uncovered quantity; non-stock, untracked, not-applicable, zero-required, cancelled, and fulfilled demand is excluded.
- [x] Active linked inbound quantity counts as coverage before receipt, while partial coverage leaves the remainder actionable.
- [x] Prompt-only `ORDERED` status and terminal, cancelled, deleted, or unrelated inbounds do not count as coverage.
- [x] A canonical supplier-less legacy inbound counts only when linked through inventory-demand ownership.
- [x] Durable action epochs open, resolve, and genuinely reopen idempotently, preserving responsible representative, policy revision, timestamps, evidence revision, and audit identity.
- [x] API-owned payment/refund, policy, order ownership/lifecycle, demand/inbound, fulfillment/cancellation, and production-review mutations reconcile explicit affected order ids after commit; background Trigger and legacy Dashboard writers remain in Ticket 07's durable recurring-repair scope and do not rely on client invalidation for correctness.
- [x] The protected action read derives representative scope from the authenticated session, ignores forged representative input, returns stable bounded counts, and does not broaden mutation permissions.
- [x] Sales Orders renders a standard shadcn alert immediately before the table with title `Paid sales need action` and clickable `#ORDERID — Material` button-semantic pills.
- [x] A Material pill opens the matching Sales Overview Inventory Needs surface with Create inbound expanded; the destination repeats ordinary authorization checks and closing it restores focus to the opening pill.
- [x] The alert shows at most six actions initially, each `+N more` activation reveals the next six within the bounded response, pills wrap on narrow screens, visible keyboard focus and accessible labels remain, and there is no permanent dismiss control.
- [x] A permanent, non-editable `Needs Action` page tab displays the unique count of scoped Sales Orders with either unresolved action type and filters the existing table/count/pagination contract to exactly those orders.
- [x] Loading reserves compact space, read failure displays `Unable to load paid sales actions` with Retry, and resolving the final action removes the alert through central invalidation.
- [x] Projection, epoch persistence, protected read, permission, alert integration, deep-link, responsive, accessibility, and browser-adjacent interaction tests cover the completed slice. Authenticated integrated browser acceptance remains centralized in Ticket 07.
- [x] No alert action fabricates an inbound, supplier order, receipt, allocation, fulfillment, or inventory evidence.
