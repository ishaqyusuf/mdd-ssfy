# Sales Fulfillment 20-order Stress Run

Date: 2026-08-26
Surface: authenticated Sales-team Chrome tab
Runtime: `bun run dev -f dashboard jobs`

## Outcome

- 20 of 20 requested Sales Orders display `Fulfilled` in Chrome.
- All 20 have a persisted completed `OrderDelivery` row and non-null
  `deliveredAt` timestamp.
- All 20 `update-sales-control` Trigger runs completed successfully.
- One inventory-resolution HTTP 500 was reproduced on `09430DB`, fixed, and
  then verified against the same order and two further resolver-dependent
  orders.

## Fulfillment ledger

| # | Order | Sales id | Dispatch | Trigger run | Resolver path |
|---:|---|---:|---:|---|---|
| 1 | 09460DB | 26518 | 4518 | run_06g3t5hlfdh65vrakc2s92j401.1 | Clean |
| 2 | 09426DB | 26375 | 4519 | run_06g3t5nqff1c4mekej7qb24f01.1 | Production |
| 3 | 09451DB | 26472 | 4520 | run_06g3t6s4b7ah2h307976rji201.1 | Clean |
| 4 | 09459DB | 26513 | 4521 | run_06g3t723b9niiq41h907miqd01.1 | Clean |
| 5 | 09429DB | 26386 | 4522 | run_06g3t74rcj9t8frn6ls0qkls01.1 | Clean |
| 6 | 09430DB | 26388 | 4523 | run_06g3t856infqboulvrjtaj7801.1 | Stale-review repair |
| 7 | 09428DB | 26382 | 4524 | run_06g3t89l9ih9lrhsidol43ni01.1 | Clean |
| 8 | 09432DB | 26396 | 4525 | run_06g3t8ccdb721bladr80jcof01.1 | Clean |
| 9 | 09422DB | 26367 | 4526 | run_06g3t8fblvodm0fremvpba3r01.1 | Production, 1 unit |
| 10 | 09401DB | 26270 | 4527 | run_06g3t8i89k06stv1n5e4m5db01.1 | Clean |
| 11 | 09400DB | 26266 | 4528 | run_06g3t8iva7a3dv06rpn3mroo01.1 | Clean |
| 12 | 09398DB | 26260 | 4529 | run_06g3t8lmjltcaq3v2f5itpqi01.1 | Clean |
| 13 | 09393DB | 26241 | 4530 | run_06g3t8mdq4m1q1rkq97igj4u01.1 | Clean |
| 14 | 09327DB | 25959 | 4531 | run_06g3t8qjcbjis1tmsb44seur01.1 | Clean |
| 15 | 09325DB | 25956 | 4532 | run_06g3t8rfqasq6mkeh5qt0ops01.1 | Clean |
| 16 | 09319DB | 25930 | 4533 | run_06g3t8udppc010qdgknsfkua01.1 | Clean |
| 17 | 09318DB | 25928 | 4534 | run_06g3t8v6uup59kg95i30q5ug01.1 | Clean |
| 18 | 09312DB | 25902 | 4535 | run_06g3t92s7n6af6igjmv6f8ca01.1 | Clean |
| 19 | 09308DB | 25891 | 4536 | run_06g3t93sn9l4mhcsgpjpe83501.1 | Production, 1 unit |
| 20 | 09306DB | 25884 | 4537 | run_06g3t974lqljt2h9t2iv863d01.1 | Clean |

## Reproduced failure and root fix

`09430DB` reached legacy review `162`. Its three assignment revisions were not
strictly older than their submissions, so the review decision correctly
cancelled it with `staleAssignmentScope`. The resolver incorrectly treated that
repair transition as terminal and returned HTTP 500.

Fulfilled resolution now performs at most three preparation/decision passes.
A stale-scope cancellation regenerates production from the current assignment
scope and evaluates the replacement review in the same request. The retry
created and approved review `227`, returned HTTP 200, and completed dispatch
`4523`. Other cancellation reasons and exhausted convergence still fail.

## Other runtime findings

### Reconciliation system actor

The Sales Handoff reconciliation scheduler still depended on
`SALES_HANDOFF_RECONCILIATION_ACTOR_USER_ID`. It now uses the same explicit
code-designated system actor user ID `1` as the escalation scheduler, retains
the active-user guard, and no longer exposes the env setting.

The first real post-fix tick proved actor attribution and scanned 200 orders. It
reconciled 43 and failed closed on 157 existing source-projection repairs:

- 152 canonical `PaymentProjection` rows are missing on historical orders.
- 3 inventory projections are `not_synced`.
- 1 inventory projection is `syncing`.
- 1 inventory projection is `failed`.

This is pre-existing local migration/backfill debt, not an actor/configuration
failure. The scheduler intentionally recorded deterministic order repair cases,
persisted failure history, and failed visibly rather than inventing payment or
inventory evidence.

### Post-completion review residue

Fifteen completed orders own a pending material-review row created by the
existing pack-all auto-assignment path after terminal continuation. It did not
block, roll back, or change any fulfilled status. The rows are retained as
fail-closed audit evidence; this run did not reinterpret or delete them.

### Local email delivery

After the campaign, local `.env.local` was set to `SKIP_EMAIL=true` at the
user's request. The project env wrapper confirms the restarted worker receives
the flag. Dashboard and jobs were restarted; local worker build
`20260826.40` is ready.

## Validation

- `bun test packages/sales/src/sales-status-mark-as-resolution.test.ts packages/jobs/src/tasks/sales/sales-handoff-reconciliation-schedule.test.ts`
  — 16 passed, 0 failed, 51 assertions.
- Targeted Biome — four changed resolver/scheduler files passed.
- `git diff --check` — passed.
- Package typechecks still report only unrelated existing inbound-demand
  nullability, sales assignment-id, and Email JSX-runtime diagnostics.
- Midday conformance: the Sales route and virtual table remain unchanged; the
  fix stays in the package-owned domain resolver, the API route remains thin,
  and the scheduler configuration stays in the jobs boundary.
