# Special Order Rollout Runbook

## Launch state and authority

- Deploy with `Warning Only`. Implementing or deploying the feature must never
  select a stronger mode automatically.
- Only a Super Admin may publish policy wording, change link lifetime, or change
  enforcement. Sales, purchasing, production, packing, and dispatch staff have
  no per-order override.
- Record the approver, date, reviewed metrics, and chosen mode in the operational
  change record before moving beyond Warning Only.

## Observation period

Remain in Warning Only for at least 14 consecutive calendar days and until the
sample includes at least 25 governed orders and at least one observed operation
in each category used by the business. Restart the seven-day stability window
after any severity-one workflow defect or material approval/security change.

Review the Super Admin Sales settings dashboard daily during the first three
business days and at least twice weekly afterward:

- pending approval count and oldest pending age;
- approved and declined outcomes;
- stale and expired link use;
- initial request, status-notification, and retry failures;
- reapproval frequency;
- Warning Only would-block counts by purchasing, production, packing, and
  dispatch; and
- support reports where cancellation, rollback, release, reconciliation, or
  receipt of already-ordered goods was unavailable.

## Promotion thresholds

`Block Purchasing & Production` may be enabled only when all conditions hold:

- no unresolved security or evidence-integrity defect;
- no known authoritative purchasing/production bypass;
- zero failures of cancellation, rollback, release, reconciliation, or safe
  receipt recovery in the trailing seven days;
- at least 95% of valid-address approval-request deliveries reach a terminal
  provider result without manual engineering intervention;
- no unexplained duplicate approval/evidence/activity outcome;
- all notification failures are visible and retryable; and
- Sales and operations owners accept the observed pending-age and would-block
  volumes.

`Block All Operations` requires a second seven-day stable period in Block
Purchasing & Production plus explicit packing and dispatch owner sign-off. The
packing/dispatch UI and direct-bypass acceptance criteria in Tickets 12 and 13
must be checked before promotion.

## Support and retry procedure

1. Open Sales Overview and confirm the independent Special Order state and
   current revision.
2. Repair a missing customer email through the canonical customer-email dialog.
3. Use Resend Approval Request only when the current revision still needs
   approval; the active unexpired capability is reused automatically.
4. Use the delivery-history Retry action for failed post-commit notifications.
   Do not recreate approval or decline evidence.
5. For customer-visible order changes, save the order, verify Reapproval
   Required, and send the current revision request deliberately.
6. For a stale or expired link, issue/resend a current request. Never restore or
   mutate the old capability.
7. Escalate signature retrieval failures as security-sensitive. Do not expose a
   Blob URL or copy encrypted storage content to a public document.

## Rollback

- A Super Admin can immediately return enforcement to `Warning Only`; the next
  operation reads the setting from the server and takes effect without deploy or
  data migration.
- Rollback must not delete declaration, request, approval, decline, notification,
  activity, or operation-event evidence.
- Continue capturing warning/would-block telemetry while the incident is
  investigated.
- If public response security or encrypted-signature retrieval is compromised,
  stop issuing new requests at the application/deployment layer while preserving
  existing evidence; Warning Only alone is not a security containment control.

## Completion evidence

Attach the final focused/broad test results, package typechecks, authenticated
and public browser evidence, migration status, enforcement-mode approval, and
the reviewed metric snapshot to Ticket 13 before marking rollout complete.
