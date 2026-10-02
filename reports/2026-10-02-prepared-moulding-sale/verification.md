# Prepared moulding sale verification — 2026-10-02

- Environment: owner-prepared in-app browser, https://gndprodesk.localhost; local DB profile, explicitly guarded to localhost/127.0.0.1. No production reads/writes, sync or deployment.
- Saved once as 09955PC /33385. Casing qty15 at $13.46=$201.90; board qty18 with $12 override=$216.00. Subtotal $417.90, tax $29.25, principal $447.15, CCC $13.41, inclusive total $460.56.
- Manual Credit Card record applied once. Notify customer disabled. Automatic Print invoice was disabled after automatic approval review rejected its extra printing side effect. No external Square charge was initiated. Overview shows one transaction, $447.15 paid principal/$0 due.
- Preview first blocked: stale door summaries for item177732, candidate subtotal $636.44, false extra due $233.84. Foreign garage door70248 has salesOrderId28224, null item owner, HPT66620, lineTotal$420.44; new casing item177732/HPT66620 belongs to33385 and totals$201.90. The mismatched foreign row remains untouched.
- Fix: evaluator filters explicitly foreign order/item owners; canonical loader and audit select ownership scalars; readiness validator v2 forces old cached attestations through normal evaluation. Real owned financial discrepancies still fail closed.
- Tight read-only loop: `bun --env-file=/dev/null ../../local-infra-kit/bin/with-env.ts --profile gnd --mode local -- bun reports/2026-10-02-prepared-moulding-sale/inspect.ts`. Initial financial_review/exit1, fixed ready/exit0, zero money deltas. `database-evidence.json` contains the final result. Escalation was necessary for sandbox localhost connectivity.
- Regression tests failed before the fix on the exact foreign-order case and same-order foreign-parent case. Final: `bun test packages/sales/src/document-readiness/evaluator.test.ts packages/sales/src/document-readiness/service.test.ts packages/sales/src/pdf-system/application/sales-overview-document-readiness.test.ts`:15 pass/45 assertions. Old validator invalidation also covered.
- Scoped Biome and diff checks pass. Sales package typecheck exits2 with existing assistant providerAttempted, copy-sales nullable string and print findLastIndex library errors, no changed-file errors; typecheck.log retained.
- Browser reload followed by fresh Preview action succeeded. Invoice shows PAID, original two rows (board rate$12.00), $447.15 principal/$13.41 CCC/$460.56 recorded card total/$0 due. Preview remains open. Screenshots: preview-blocked.jpg, preview-paid.jpg; preview-paid-dom.txt captures successful rendered content.
- Console: no persistence/payment errors during the submitted actions. Prior EPIPE/getOrders traces predate save; payment-opening DialogTitle/Description and preview Description accessibility warnings recorded in console-findings.json. Those warnings are outside this financial fix.
- Production's reported error was not inspected, so identical production data is not established. No commit, push or deployment performed.

Brain impact: .brain/features/sales-document-readiness.md; .brain/api/contracts.md; .brain/database/relationships.md; .brain/decisions/ADR-20261002-sales-document-child-ownership.md; .brain/tasks/done.md; .brain/progress.md. No schema/migration or permission changes.

## Why package ids appear shared

HPT ids are unique auto-increment values. New-save HPT creation at apps/api/src/db/queries/new-sales-form.ts:4519 supplies no id. The apparent sharing comes from an old foreign child reference to an id later allocated to a new local parent. Prisma relationMode=prisma means imports are not rejected by a physical foreign key.

The saved sync cursors show package rows at September28 while door rows were synced through October1; today's sync wrote250 door rows and skipped702 HPT rows due to duplicate orderItemId176992. This is strong evidence for incomplete local parent/child sync as the origin, but the exact import run for door70248 is not proven. Production origin is unverified. See .brain/bugs/2026-10-02-prepared-moulding-preview-foreign-door.md. The read filter fixes Preview; dependency-safe sync prevention is separate work.
