# Historical Dispatch completion import

Implementation: `scripts/historical-dispatch-completion.ts` and its isolated migration policy module. Decision: [historical adoption](../decisions/2026-09-07-historical-dispatch-status-only-adoption.md). Task: [progress](../tasks/2026-09-07-historical-dispatch-completion-import.md).

## Runbook
Run from the GND repository. Each output must be a new path. Reports contain internal order/audit data and are written with mode 0600. The migration writes no credentials to reports.

1. Preview local: `bun run sales-pipeline:historical-completion --environment local --mode preview --output /absolute/local-preview.json`
2. Review candidate/held lists and printed target fingerprint. `--order-id ID` may restrict a preview to one order.
3. Apply approved local manifest: `bun run sales-pipeline:historical-completion --environment local --mode apply --manifest /absolute/local-preview.json --actor-id ACTOR --confirm-target FINGERPRINT --output /absolute/local-apply.jsonl`
4. Verify all candidates: `bun run sales-pipeline:historical-completion --environment local --mode verify --manifest /absolute/local-preview.json --output /absolute/local-verify.jsonl`
5. Rerun the same apply manifest to a new journal to verify replay. Previously imported records are not duplicated; cancelled imports remain cancelled.
6. After local validation, preview production with `--environment production --mode preview`. Review its actual population, then obtain explicit user approval before running apply with that production manifest and fingerprint. Local approval does not approve production.
7. Verify production with the same manifest and `--mode verify`; repeat apply to check replay if required.

Recovery: use the original manifest with `--mode recover`, the same environment, an authorized actor, explicit target fingerprint, and a new journal path. This audits cancellation only for the migration-owned active status-only records. Run only when recovery is explicitly intended; recovered records will not be reactivated by replay.

If a run fails, inspect the final journal entry. Previously committed orders remain committed. Rerun the same manifest/output-new-path for transient failures; generate a new preview for source changes. Do not overwrite the old manifest or journal. Archive partial/failed preview files rather than using them as approval manifests.

## Production transaction boundary
Up to five approved completion ledgers and their paired audits commit together in one serializable transaction. Every new row is revalidated before any insert; one stale candidate rolls back the entire group. Groups run sequentially to avoid gap-lock contention. Recovery remains per order. Full derived list refresh runs outside the transaction in groups of up to 20, respecting the hosted database’s 20-second transaction cap. The durable `ledger_committed` checkpoint precedes refresh; `imported`/`replayed` is written only after repair. A failed group repairs its committed orders before exiting. Replay repairs missing/stale projections without duplicate ledger/audit rows. Verification reads in groups of 100.

## Verification
Focused tests: `bun test scripts/historical-dispatch-completion.test.ts scripts/historical-dispatch-completion-policy.test.ts`.
Local fixture integration: `GND_MIGRATION_TEST_LOCAL=1 bun test scripts/historical-dispatch-completion.integration.test.ts` (local only, creates/cleans its uniquely named fixture; actor 1 must have completion permission).
Types: `bun node_modules/typescript/bin/tsc --project scripts/tsconfig.historical-completion.json --pretty false`.

Read-only verify checks every order's operational source hash, ledger identity/method/state/effective date, audit evidence, canonical administrative Fulfillment state and persisted list projection. Browser acceptance additionally checks the Marked as completed label and pending/completed queue membership.

Fully owned groups skip write transactions, still repair projections from current canonical evidence, then read owned records again before journaling replay/cancellation status.
