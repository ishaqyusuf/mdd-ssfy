# Task: Historical dispatch status-only completion import

## Status
In Progress

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
- Completion: 83%
- Current Checklist: 6/6 — Production preview, approval, apply and verification
- Blockers: Awaiting explicit approval to apply the reviewed 1,403-order production manifest.

## Implementation Checklist
- [x] Establish candidate policy, environment binding, and existing command boundary
- [x] Implement dry-run manifest and focused behavioral validation
- [x] Implement revision-bound import, idempotency, journal, and scoped recovery
- [x] Run local dry-run/import/replay and verify projections and operational non-effects
- [x] Review, document runbook, validate types/tests, and commit on current branch
- [ ] Produce production dry run; apply and verify only after user confirmation

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
