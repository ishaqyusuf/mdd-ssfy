# Production worker reassignment

## Behavior (2026-09-09)

Production assignment rows expose a pencil action beside the date controls.
Calendar cards expose the same worker picker for that card's grouped assignment
IDs. Selecting a worker saves immediately and publishes the existing assignment
refresh event for overview, production lists, calendar and counters.

Only unsubmitted quantities move. Active reports, including PENDING material
reviews, remain under the original assignment and worker. Partial assignments
are split: the original retains the reported quantity; a new assignment receives
the remaining total/LH/RH quantities, same item/control references, labor rate and
due date. Fully reported assignments cannot be reassigned. Deleted, rejected and
cancelled reports do not consume transferable quantity.

The action requires authenticated editProduction, validates an active Production
worker, binds every assignment to the requested order and locks assignment rows
before rereading reports. The existing canonical production.assign transaction
continues to enforce lifecycle/revision rules. Worker and dispatch-mode assignment
views do not expose this action. Existing terminal/conflict guards remain.

Ownership changes retain actor and assignment notes; split records reference the
original assignment. Verified PENDING review snapshots advance only their
assignment revision after the quantity split (valid legacy snapshots upgrade together); pre-existing stale evidence is not
repaired. Submission and payroll records are never transferred.

## Validation

Nine focused reassignment tests and seven existing assignment-ledger checks
pass. Live browser and real-database concurrency acceptance have not been run.
The Sales typecheck has an existing copy-sales.ts nullable string error.
