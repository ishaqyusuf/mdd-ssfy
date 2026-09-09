# Production receipt reconciliation and cancellation contract

Status: implementation contract; receipt reconciliation/cancellation not yet enabled.

Production progress and actionable attention are separate presentation dimensions.
The shared Sales resolver reads canonical evidence and reports submitted work as
reported, retaining pending approval as attention. It does not change canonical
completion, memberships, staffing, payroll or packing eligibility. Calendar and
table consume one orderPresentation contract; normal material readiness is not
an alert. Existing commercial/fulfillment completion semantics remain intact.

A successful Production receipt must retain its durable originating action in
order detail, including after navigation/reload. The compact confirmation uses
that action's inbound identity, Open inbound and Cancel review. Cancellation is
a compensating command, not deletion of the event or a generic Needs unapply.
Physical receipt changes stock and movements; Needs unapply alone is insufficient.

Before integrating reconciliation, extend receipt audit to a versioned exact
before/after snapshot of touched shipment items, Needs, allocations, physical stock
movements, approved reviews and their derived payroll/payment/completion effects.
The transaction must prove which changes belong to this request. Legacy receipts
without adequate provenance cannot acquire a fabricated reversal; they retain
Inventory navigation with an explicit reason cancellation is unavailable.

After scoped allocation, identify pending reviews linked to the affected components
and authorized assignments. Validate the entire recorded review scope and current
material evidence. Only eligible reviews use the canonical transaction-level
review decision, including exactly-once payroll and its completion effects.
Unrelated duplicate allocations, changed assignments, missing configuration or
other unresolved material conditions remain actionable. Do not let automatic
receipt reconciliation invoke unrelated order-wide material repairs.

Cancellation rechecks current actor scope, feature policy and exact originating
revision under the receipt transaction locks. It reverses only that action's
still-current effects, records compensation and recalculates projections. Replays
must not subtract stock or payroll twice. Subsequent consumption, payment,
packing/dispatch or changed evidence which cannot safely be compensated must
refuse cancellation with an actionable reason. Never reverse unrelated receipts,
allocations, review decisions or externally settled financial effects.

Both commands require current calendar, table, open Production and Inventory data
after success. Failed compensation must roll back entirely. Required evidence:
real isolated transaction tests for retries/races/rollback; disposable authenticated
UI receipt/cancel flow; permission-on/off/assignment changes; and downstream gates.

Read-only diagnosis on 09495PC confirms current covered Needs and pending review
414 / allocation 1251. The old originating receipt audit is absent locally; spoken
SKU 2668-100 is not proven because variant SKU fields are null. No live correction
or inferred cancellation has been performed.
