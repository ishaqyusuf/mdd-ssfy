# 02 — Add Batch Archiving And Shared-Consumer Parity

**What to build:** Extend the proven single-order journey into a safe cleanup
workflow for selected Sales Orders and complete parity for the secondary
consumers of the canonical query. Authorized users can archive or restore up to
100 selected orders with truthful partial-success feedback, while saved views,
exports, mobile defaults, summaries, and read-model modes continue to agree
with the selected archive scope.

**Blocked by:** 01 — Ship Reversible Single-Order Sales Order Archiving.

**Status:** ready-for-agent

- [ ] The archive command accepts 1–100 unique positive Sales Order identifiers and rejects invalid or oversized requests before mutation.
- [ ] The ordinary selected-row bar exposes Archive and the Archived selected-row bar exposes Restore, using the same permission and domain command as the row actions.
- [ ] Batch archive confirmation identifies the selected count and strengthens its warning when any selected order is non-terminal.
- [ ] A mixed batch changes every currently eligible order, skips harmless stale or ineligible selections, and reports accurate changed and skipped counts without hiding committed successes.
- [ ] Repeating an uncertain batch request cannot toggle state, duplicate Sales History evidence, or overstate success.
- [ ] Selection is cleared only for changed rows and only after the authoritative Sales Orders query refresh completes.
- [ ] Archived scope can be saved and restored as a page tab, and default plus Archived saved-tab counts refresh after archive and restore.
- [ ] Filtered Excel export preserves Archived scope and produces the same order set represented by the canonical filtered query.
- [ ] Shared mobile order-list calls exclude archived orders by default without adding mobile archive controls or an Archived filter.
- [ ] Default and Archived summaries, payment-review fallback, legacy reads, and projected candidate selection remain parity-covered for single and batch transitions.
- [ ] The archive-supporting index is checked against representative default and Archived query plans before release.
- [ ] Focused batch orchestration, partial-result, saved-tab, export, mobile-query, invalidation, and accessibility tests pass alongside the complete Ticket 01 regression set.
- [ ] Authenticated browser validation proves multi-order archive and restore, non-terminal warning copy, partial/no-op feedback, refreshed counts, saved Archived scope, and filtered export without new console errors.
- [ ] Project Brain feature, schema, migration, API contract, permission, task, and progress documentation reflects the shipped behavior and validation evidence.

