# Task: Historical dispatch status-only completion import

## Status
Done

## Priority
High

## Created Date
2026-09-07

## Last Updated
2026-09-07

## Global Ticket
- Ticket Position: 1/1

## Source Context
User authorizes treating every completed dispatch missing delivery proof as a historical shortcut completion, without requiring old job/action evidence. Build a dry-run-first, repeatable audited status-only migration; validate locally, then preview production and obtain confirmation before production apply. Preserve later cancellations/reopenings and operational records. Include migration-scoped recovery.

## Implementation Progress
- Completion: 100%
- Current Checklist: 6/6 — Production preview, approval, apply and verification
- Blockers: None.

## Implementation Checklist
- [x] Establish candidate policy, environment binding, and existing command boundary
- [x] Implement dry-run manifest and focused behavioral validation
- [x] Implement revision-bound import, idempotency, journal, and scoped recovery
- [x] Run local dry-run/import/replay and verify projections and operational non-effects
- [x] Review, document runbook, validate types/tests, and commit on current branch
- [x] Produce production dry run; apply and verify only after user confirmation

## Validation Evidence
- Current checkout is master and was clean at task start.
- Canonical proof criterion is meta.dispatchCompletion.status === completed.
- Existing status-only command writes completion ledger/history and supports transactional projection refresh.
- Use focused behavioral regression validation and local dry-run/apply harness; no separate TDD seam approval workflow is necessary for this authorized migration implementation.

- Six focused policy tests pass (11 assertions). Runner implementation now binds an explicit root profile, sealed target identity, per-order source/revisions, and deterministic request IDs. Integration validation remains pending.

- Local v3 preview: 912 candidates, 497 already completed, two later dispatches held. Sample order 03389LM/4717 imported successfully as status-only through the dedicated migration transaction. No production writes.
- Dedicated transaction replaces the interactive mark command: 15 qualifying candidates have unrelated Production conflicts, which must not narrow the user-approved migration rule. Ordinary app policy is unchanged.

- Disposable local integration fixture passed 19 assertions covering preview/import/replay, unchanged operational data, recovery/recovery replay and stale-source refusal; fixture cleaned up.
- Browser sample 03389LM shows Marked as completed; packing remains 0/15.
- Full local apply was rejected by automatic approval review before execution: explicit approval required for reviewed 912 orders (911 new, one sample replay). User question pending.

- User explicitly approved applying the full reviewed 912-order local manifest. Apply session started; full verification remains pending.

- Full local apply finished: 911 imported + one replay, zero failures. Independent verify passed all 912: operational source hashes unchanged, status-only ledger identities/dates, paired audits, canonical administrative Fulfillment and persisted projection. Whole-manifest replay is running.
- Browser acceptance: 03389LM absent from Past Due; present in Completed with Marked as completed and 0/15 packing.
- Standards review: no remaining hard findings. Spec review recovery issue resolved by preserving current operational source while cancelling only migration-owned records.

- Whole local manifest replay: 912 replayed, zero duplicate writes. Read-only production preview started against fingerprint c2c5a23d5bc1143411a1b3c4072268cf548ef84521ba1a4d8502c4d124872b3f. No production changes.

- Final focused suite: 10 tests / 44 assertions pass, including post-import verify and unrelated-manifest recovery refusal. Focused TypeScript check passes. Final local census with batched preview finds zero remaining candidates; 1,409 already-completed orders and two later-dispatch holds.
- Production preview per-order loader was stopped read-only and replaced with bounded 100-order source batches plus canonical bulk snapshot loading; integration/type validation rerun successfully. Production preview v2 is running, with no production mutations.

- Implementation committed on master as e5dcff3af. Only this task files and its ledger pointer were committed; unrelated concurrent task changes remain untouched.

- Production preview completed read-only: 1,403 eligible orders; five already completed; three later-dispatch holds (07276DB, 08647DB, 08970PC). Production actor 1 verified as Pablo Cruz. Manifest: /Users/M1PRO/Documents/Codex/2026-09-07/wh/outputs/historical-completion-production-preview-v2.json. Candidate CSV and summary exported alongside it. Explicit production approval requested; no production writes.
- Local runbook/results exported under this task outputs directory. Goal remains active pending production apply/verification.

- Blocked audit: explicit production approval remains absent across three consecutive goal turns. Local validation and production preview are complete; no production apply has been started. Awaiting approval for the reviewed 1,403-order production manifest.

- Production approval received. Applying only the saved reviewed manifest, then verifying operational non-effects and idempotency.

- First production transaction aborted at the database-enforced 20-second timeout. Independent database check confirmed zero migration ledger rows and zero migration audits. No candidate was committed.
- Timeout fix reuses canonical pipeline resolution from normalized source evidence and moves only derived list refresh after the atomic ledger/audit transaction. Replay repairs missing/stale projections. Local integration simulates interruption before projection refresh: 10 tests / 46 assertions pass; focused types pass.

- Production v2 imported four orders successfully. Stopped the identified process (confirmed exit 143) to remove repeated per-order projection loading; a fifth prepared transaction will be resolved via the same deterministic request identity. Chunked runner uses at most four independent per-order transactions, groups of 20, serialized durable journal writes, and repairs successful in-flight work before surfacing failures. Verification uses batches of 100.

- Five-order LOCAL test exposed SERIALIZABLE gap-lock contention under concurrent workers. Production concurrency was never launched. Final runner keeps transactions sequential and batches only derived refresh/verify work. Ten tests / 53 assertions and focused types pass. Review found no remaining hard correctness issues. Production v3 resumed using the original approved manifest and request identities.

- Production v3 failed during actor lookup with P1017 before any mutation. V4 resumed successfully; stopped with confirmed exit 143 after 54 new ledger commits plus four existing records (40 terminal rows, 18 awaiting group refresh). No production concurrent workers ran.
- Final performance fix batches up to 20 approved orders in one serializable transaction: bulk evidence and completion projection reads, every new-row source/revision guard, deterministic completion insert and paired audit inserts. Mixed owned/new chunks replay safely. Recovery remains sequential per order. Twenty-order local fixture passes whole-batch stale rejection with zero writes, import/replay, interrupted projection repair and scoped recovery: 10 tests / 71 assertions. Types pass; spec review has no hard findings. V5 is applying the original approved manifest and repairing prior checkpoints.
- Production browser sample 23-0810-351 shows Marked as completed, remains 0/100 packed, is absent from Past Due and present in Completed.

- V5 completed60 total then rejected the next20 while loading source evidence before inserts (34-second client transaction expiry). Final group size reduced to5. Existing canonical completionRevision is exported with a minimal structural record input and reused on sorted source records, removing a redundant graph query. Transaction reads preserve order/nondeleted guards. Local type-only-change regression added. Ten tests / 73 assertions and focused types pass; review has no remaining hard findings.
- Independent production prefix verification passed all60 imported orders: unchanged operational hashes, exact ledger/audit identities and canonical/persisted projection agreement. V6 resumed the original full approved manifest with five-order atomic groups.

- V6 reached130 terminal orders with135 ledger commits. Stopped with confirmed exit143 to batch outer source/projection work in groups20 while retaining inner atomic transactions of5. Fully owned groups skip write transactions and fresh post-repair records determine terminal replay/cancellation status. Local integration covers a later subgroup failure repairing the earlier committed5, mixed-owned resume, and cancelled replay. Ten tests / 80 assertions and focused types pass; scoped review confirms the journal race fixed. V7 resumed the exact approved manifest.

- Production v7 progress checkpoint: 1,000 approved orders committed, 980 terminal imports/replays with projection refresh complete. V7 has reported no failures. Full-manifest verification/replay remains pending after apply.

- V7 stopped safely on source drift for08593DB/id23350 after1,015 terminal imported/replayed rows. The guarded source query found order.updatedAt=2026-09-07T16:02:20.285Z, later than the15:04:05 preview; no post-preview Sales History was available to attribute the specific edit. Dispatch4044 still completed/missing proof, same effective date2026-06-18, and fresh classification remains eligible. Refreshing read-only checks within the original approved population; no added orders or override of cancellations/reopenings.

- All1,015 imported orders passed original-manifest verification. Fresh preview found exactly the388 remaining approved IDs, no new or removed IDs. Only guard hashes/revisions changed for08593DB/23350,09474DB/26575,09514DB/26765; dispatch IDs, order numbers and effective dates are identical. Original batchId retained. Saved a388-order resume apply manifest, combined1,403-order verification manifest and guard-refresh provenance report under outputs. V8 resumed the388 remaining orders; no policy or population expansion.

- Production apply complete: V7 finalized1,015 original orders; V8 imported the remaining388 after unchanged-scope guard refresh. Total1,403 approved status-only completions; all list projections refreshed. V8 exited 0 with388 imports and no failures. Whole-manifest verification and replay are running next.

- Final whole-population production verification passed1,403/1,403: operational source hashes unchanged from their audited pre-import evidence, exact active status-only ledger/effective dates, paired migration events, canonical administrative Fulfillment and persisted projection revision agreement. Full-manifest replay is running to verify no duplicate ledger/audit writes.

## Final result
- All 1,403 approved production orders imported as audited status-only completions and independently verified. Scope unchanged; original eight holds preserved.
- Full production replay: 1,403 replayed, zero new completion/audit rows and zero projection repairs. Both final verification and replay exited 0.
- Operational source hashes unchanged from audited pre-import evidence; packing/proof/inventory allocations/payments/taxes preserved. Three guard refreshes after read-only revalidation are documented in the output provenance report; dispatch IDs/effective dates unchanged.
- Local validation: 912 verified and replayed without duplicates. Final focused checks: 10 tests / 80 assertions; TypeScript passed. Reviews resolved all hard findings.
- Browser 03389LM: Marked as completed, 0/15 packing, absent from Past Due and present in Completed.
- Latest implementation commit: ff19f7dc5. Final report/results/runbook and all manifests/journals are under /Users/M1PRO/Documents/Codex/2026-09-07/wh/outputs.
