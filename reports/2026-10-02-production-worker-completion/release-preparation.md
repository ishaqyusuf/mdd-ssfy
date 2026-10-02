# Worker release preparation

## Release preparation result (2026-10-02)

Source commits pushed to master: a90993b4e (worker completion fixes), 6cd2132fc (regenerated jobs Prisma schema), 1b62ab9e8 (declare existing lucide-react dependency in shared Sales plus minimal lockfile entry). Remote master confirmed at 1b62ab9e8 when this preparation completed. Concurrent new-sales-form edits appearing after the initial commit remain uncommitted and outside this release. Raw browser/database evidence remains local.

The configured redland Production worker readback is 20261001.1 with 51 tasks / nine schedules. Its task manifest exactly matches the existing maintenance config. Isolated release checkout: /Users/M1PRO/.codex/worktrees/production-worker-jobs-release/gnd. Frozen dependencies installed; generated client built without connecting to a database. Trigger maintenance dry-run succeeds after fixing the undeclared icon dependency. Nonfatal skill-discovery bundling warning recorded in the build log. No worker has been deployed or promoted by this follow-up.

Read-only Prisma diff proves Production needs ten additive columns across six tables and two indexes before the latest generated jobs client is compatible. Exact target: mysql://aws.connect.psdb.cloud/gndprodesk#identity=ba57b207. SQL: reports/2026-10-02-production-worker-completion/production-schema-diff.sql. It includes inventory alert/location/provenance, Assistant pendingPreview, and Messaging configuration/device fields. No dropped table/column, reset or data deletion. A read-only MessagingDevice tokenHash duplicate-group count returned zero for the proposed unique index. The owner was asked to approve this concrete Production schema update because the original schema changes were local-only and the repository requires confirming the Production target. Approval is pending; do not apply schema or deploy until received.

After approval: recheck source and Production diff/fingerprint; apply the approved additive update via the repository db:push --prod workflow without any data-loss flag; confirm schema parity; deploy the committed maintenance worker, verify task/schedule manifest, promote, and read back current deployment. Update this evidence and Brain with actual outcomes. Existing release-assurance baseline is advisory/missing and must not be described as a fully attested seven-target release.

Brain files updated: .brain/bugs/2026-10-02-production-worker-completion.md, .brain/database/migrations.md, .brain/tasks/in-progress.md, .brain/progress.md.
