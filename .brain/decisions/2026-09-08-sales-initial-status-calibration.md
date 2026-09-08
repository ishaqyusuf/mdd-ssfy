# Generate initial sales workflow status after save

Status: Accepted; implemented and locally verified.

The user requires newly saved sales to resolve Ready when no production is required,
or Not Assigned when production is required without an assignment. Missing derived
controls and inventory failures must not replace these states with Needs Review.

Reuse the existing post-save background job and shared control reconstruction,
then persist the order-list summary. Keep saved-item/configuration calculations
out of the list query. Generate workflow scope before independent inventory sync;
legacy saves can request calibration while retaining their inventory-adaptation flow.
Preserve actual operational progress on edits and serialize reconstruction with
workflow commands through the order row lock. Retries read current persisted facts.

Local verification covers initial/edit status transitions, history preservation,
configuration overrides, and scoped existing-row calibration. Database imports do
not automatically enqueue jobs; unrelated missing inventory components remain a
separate repair concern. See the
[task](../tasks/2026-09-08-sales-mark-as-eligibility-and-archive.md).
