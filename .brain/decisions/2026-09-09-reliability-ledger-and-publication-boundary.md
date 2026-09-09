# Reliability ledger and publication boundary

Status: Accepted for local implementation; hosted activation pending.

The [research](../research/2026-09-03-autonomous-production-error-management.md)
requires durable cross-provider incident tracking without making telemetry the
authority for sales, payments, or inventory correctness.

Shared intake policy lives under the server-only observability reliability export.
Database queries own serializable ingestion, scoped dedupe, and atomic delivery
intent creation. Existing jobs will own background work; thin API routes will
verify provider transport and resolve configured identities. Browser/mobile
observability imports must not pull in Node crypto or database dependencies.

An occurrence and its outbound intent must commit together. A persisted intent
does not prove delivery. External publication remains independently gated, and
ambiguous remote responses must be reconciled before a second create operation.
Current code persists intents only; delivery and activation are not implemented.

Use provider-native problem grouping within scoped service registration. Shared
traces/operation labels establish relationships but cannot prove a shared cause.
Preserve original severity on weaker subsequent evidence and reopen investigation
for verified post-resolution recurrence; explicit downgrade remains an audited
future operator action.

Local schema push is not a substitute for a deployable migration artifact.
The current migration-history drift remains an open task gate; no database reset
is authorized by this decision.
