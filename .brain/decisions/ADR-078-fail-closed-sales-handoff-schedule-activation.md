# ADR-078: Fail-Closed Sales Handoff Schedule Activation

## Status

Accepted — 2026-08-31

## Context

The Sales Handoff reconciliation worker can repair many orders on every run.
Local canaries and categorized diagnostics are complete, but production still
requires a fingerprint-confirmed dry run and explicit approval. Trigger deploy
discovers task files automatically, so an unconditional `schedules.task` would
activate the 15-minute production loop as a side effect of deploying unrelated
jobs.

## Decision

Deploy the reconciliation implementation as a regular Trigger task by default.
Register the recurring 15-minute schedule only when the target environment sets
`SALES_HANDOFF_RECONCILIATION_SCHEDULE_ENABLED=true`.

The flag is fail-closed: missing, blank, or any value other than case-insensitive
`true` leaves the task unscheduled. Enabling the flag remains a separate rollout
step after the production dry-run evidence is reviewed and approved.

## Consequences

- Ordinary jobs deployments cannot accidentally start backlog repair.
- The worker remains deployable and manually inspectable before recurring
  activation.
- Production dry-run and approval remain mandatory for the cron, without
  blocking deployment of unrelated jobs.
- Rollback is immediate by removing or disabling the flag and redeploying jobs.
