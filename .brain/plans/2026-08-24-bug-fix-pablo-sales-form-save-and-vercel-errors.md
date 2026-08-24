# Pablo Sales Form Save And Vercel Error Follow-up

## Objective

Read Pablo Cruz's 2026-08-24 WhatsApp reports in the native macOS app, confirm
each bug against source and Vercel evidence, implement narrow regression-backed
fixes, and distinguish production incidents from Preview-only environment
failures.

## Assumptions

- WhatsApp access is read-only; no reply or conversation mutation is required.
- Production and hosted database changes require explicit guarded rollout.
- Order `09433PC` is the production save incident identified in today's Vercel
  logs unless Pablo's messages show otherwise.
- The Preview `sales.getSalesHandoffActions` cluster is a separate follow-up,
  not evidence for the production save root cause.

## Detailed Execution Plan

1. Audit Codex threads from 2026-08-24 for earlier Pablo work and read any
   related completed thread to avoid duplication. **Complete:** no earlier
   thread today; the 2026-08-20 fulfillment-permission fix was separate.
2. Open native WhatsApp with Computer Use, select Pablo Cruz, and capture only
   today's symptom, order identifiers, reproduction steps, and attachments.
   **Complete:** reviewed today's text and both videos. Video 1 reproduces the
   Fulfilled dependency-resolver denial on `09403DB`; Video 2 proves the
   dedicated fulfillment grant is checked. The first clip contains only a faint
   intelligible “So”; the second has no intelligible narration.
3. Review Vercel's last 24 hours, separate production from Preview, and record
   exact request/deployment evidence. **Complete:** one production save 500 at
   17:04 for `09433PC`; five Preview handoff GET 500s today; no console-level
   error or fatal entries.
4. Build a deterministic failing contract for the production save's database
   boundary. **Complete:** the test failed for both the `VARCHAR(191)` mapping
   and missing widening migration.
5. Test alternative causes: identifier overflow, legacy compatibility rewrite,
   shared save/handoff route, missing Preview handoff schema, and data-specific
   null handling. **Complete for source evidence:** free-form step `value` is
   the only hypothesis matching the Prisma model and column-width trace.
6. Widen `DykeStepForm.value` to `TEXT`, add an additive migration, generate the
   client, and rerun focused persistence coverage. **Complete in repository:**
   2 schema-contract tests and 39 API tests / 217 assertions pass.
7. Apply and verify the migration locally with the guarded `db:migrate` and
   `db:push` workflows. **Complete:** migration applied to the local fingerprint
   and `db:push` reports it is in sync.
8. Reproduce the fulfillment authorization mismatch from Pablo's clip, add an
   action-aware permission regression, and fix the boundary without granting
   broad workspace permissions. **Blocked on explicit authorization:** the
   proposed scoped fix would allow holders of `viewMarkSalesOrderFulfilled` to
   receive linked inbound stock and approve pending production-material reviews
   for the selected order. No authorization change is currently applied.
9. Inspect the production Special Order audience. **Complete read-only:** the
   live setting is `Super Admin only`; the code already supports `All staff`, so
   this is a rollout configuration change rather than a save-path defect.
10. Verify whether Preview lacks `20260823100000_paid_sales_operational_handoff`;
   if confirmed, apply the Preview migration through the guarded workflow and
   recheck `sales.getSalesHandoffActions`. **Pending hosted action.**
11. After the authorization decision, build and test the scoped change in a clean deployment worktree, deploy to
   Preview, run authenticated regression proof, then promote the verified
   artifact to Production. **Pending.**
12. For Production, present the printed database target fingerprint and obtain
   confirmation before applying the widening migration, switch Special Order
   enrollment to `All staff`, repeat Pablo-session proof, and canary today's
   failing Vercel routes. **Pending hosted action.**

## Risks And Mitigations

- Widening a populated column may lock or rebuild the table: inspect the hosted
  provider plan and perform a guarded migration/canary rather than an ad hoc SQL
  change.
- Client-side truncation would silently alter invoices: retain the complete
  value and fix storage capacity instead.
- Preview and Production evidence can be conflated: keep environment, route,
  order, deployment, and request IDs separate.
- The worktree contains unrelated active changes: touch only the schema,
  migration, fulfillment boundary/tests, and scoped Brain records; stage and
  deploy from an isolated clean worktree.
