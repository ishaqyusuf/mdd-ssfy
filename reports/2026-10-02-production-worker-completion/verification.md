# Production worker completion: local verification — 2026-10-02

The owner requested incremental Production-to-local synchronization and local browser testing under multiple production-worker accounts. Changes and submissions are local; no Production data writes or hosted deployment were performed.

## Incremental synchronization

Reused saved last-update cursors in `.local-db-sync/gnd-prod-to-local.json`. Dry run preceded apply; no reset, cursor deletion, static refresh or full replacement. Production `aws.connect.psdb.cloud/gndprodesk` → local `127.0.0.1:3307/gnd-prisma2`.

Apply: 358 tables considered, 20,412 rows read, 6,507 written; 39 tables without timestamps skipped. Mutable tables use updatedAt/createdAt cursors; createdAt-only tables are insert-only. Four conflicting tables were omitted conservatively with their previous cursors preserved: HousePackageTools (orderItemId 176992), LineItem (salesItemId 174669), NoteTags, SalesOrders (orderId/type 09224PC-hx08-order-hx). This is a partial synchronization for those tables, not a completed full database refresh. Existing local records were preserved. Test-order source/local parity was verified before writes for 09865DB, 09344AD and 08950PC.

## Reproduced defects and local corrections

1. Martin / 09560PC: Mark done opened inventory receipt/review preflight requiring permissions a production worker does not have. It failed with Permission required and no production job. Worker-only routing now starts the existing authorized production task directly; inventory approval remains a separate permission and administrator preflight remains in place. Retest records awaiting_review with no error.
2. Carlos / 09344AD: after all eight doors were reported, Mark done scheduled an empty child submission and failed with “Unable to complete, nothing to submit!”. Fully reported active assignments awaiting material review now return review_required / awaiting_review without another submission.
3. Carlos / 08950PC: whole-order submission initially created four assignments for unassigned quantities, including another worker’s door and trim. Worker jobs now prohibit assignment creation, retain only existing owned assignments, and calculate repeat-action capacity per worker. Seven local test submissions and four newly generated test assignments were soft-deleted, and their single test review cancelled; a local backup is retained. Imported original assignments were preserved. The corrected rerun saved three submissions totaling Carlos’s ten doors, preserved Izri’s unreported door, retained exactly four original assignments, and left unassigned trim untouched. A second Mark done returned awaiting_review without adding rows.
4. Valid assignment scopes with mismatched/missing material component evidence were incorrectly described as missing or deleted submissions. The warning now identifies material configuration requiring supervisor attention; eligibility stays false and no review is automatically approved.

The jobs dev worker also needed a dev-only Sharp package-root link repair to start; that repair is already in the current HEAD. Shared HTTPS Portless configuration was reused.

## Browser matrix

| Worker | Order / scenario | Verified result |
| --- | --- | --- |
| Izri | 09865DB: individual RH submission, then selected Submit All | Three one-door reports, no extra capacity; pending review |
| Carlos | 09344AD: partial LH/RH, then selected Submit All, then Mark done | Exactly eight doors; retry awaiting review without empty child failure |
| Carlos | 08950PC: whole-order Mark done and repeat with another worker remaining | Exactly ten own doors / three submissions; other worker and unassigned quantities untouched |
| Martin | 09560PC: already reported work with pending inventory/material review | Permission failure reproduced, corrected routing succeeds awaiting review |
| Samuel | Completed queue and another worker’s order search | Own completed order visible; other worker’s order absent |

Final database audit: no new payroll linked to pending test submissions, no ACTIVE production completion record, canonical completedQty remains zero, quantities never exceed assignments. Pending review is deliberately distinct from finalized completion. Evidence: `final-audit.json`, screenshots `martin-mark-done-before.png`, `martin-mark-done-after.png`, `carlos-mark-done-after.png`, and earlier worker screenshots.

## Validation

- Final command/executor/worker scope/authorization/transaction batch: 87 pass, 0 fail, 271 assertions.
- Separate completion regression batch: 29 pass / 71 assertions; failing-before and passing-after logs retained.
- Worker scope and mixed-worker status regression: 12 pass / 34 assertions, failing-before evidence retained.
- Material-warning local database integration: 22 pass, 29 environment-gated skips, 186 assertions; disposable fixtures cleaned.
- Sync/QtyControl contracts: 26 pass / 58 assertions.
- Initial submission/review/authority policy: 40 pass / 99 assertions.
- Dashboard menu bundles successfully; changed source diff whitespace check passes.
- Broad typecheck remains unsuccessful due to existing unrelated workspace diagnostics. Dashboard retry with 8 GiB heap completed with existing API/request-generation/UI diagnostics; no diagnostic names the modified sales-menu, bulk completion, material warning, or sales-control files. Sales package retains copy-sales and dealer-pricing-surface errors. Jobs/root checks also retain unrelated baseline errors.

Brain impact: feature behavior, API completion outcomes, permission boundaries, and task status updated. No Prisma schema or migration change. Available Midday and React UI skills were applied; required agency-engineering skill was not installed despite filesystem search. This focused routing fix reuses the existing task and UI architecture.

Production team’s exact reported worker/order/error remains unknown. The tested local failures are concrete reproductions; Production needs a separately authorized release before users receive these corrections.

## Brain files updated

- `.brain/bugs/2026-10-02-production-worker-completion.md`
- `.brain/features/production-material-availability.md`
- `.brain/api/contracts.md`
- `.brain/api/permissions.md`
- `.brain/decisions/2026-10-02-production-worker-completion-reporting-scope.md`
- `.brain/tasks/done.md`
- `.brain/progress.md`

## Authorized release follow-up

On 2026-10-02 the owner authorized committing all code, deploying jobs and pushing Git. Production before release: 20261001.1, 51 jobs and nine schedules. Use the existing maintenance config whose task manifest matches current Production; it includes both bulk production completion and update-sales-control. Raw database backups and runtime logs remain local. Release result will be recorded after provider readback.
