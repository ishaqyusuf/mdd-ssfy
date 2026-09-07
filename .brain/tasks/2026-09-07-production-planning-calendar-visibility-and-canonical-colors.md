# Production planning Calendar and canonical colors

- Status: Done — 18/18 acceptance checks verified

Final production dpl_2a6aYAmYhupqpKz9PMRDr2NFySA9 is READY/www aliased.
Authenticated reload verifies corrected material label. All acceptance complete;
Scratch release record contains rollback and local/live evidence. Batch195/196,
17/18 tickets done. Ticket14 exact environment deletion/final closure remains.

Live completed/Planning checks pass (09426DB emerald and excluded; partial
24-0327-1282 present). Final QA corrected unknown material display to avoid
simultaneous ready/unavailable. Five card tests pass; redeploy session79253
from same isolated bundle. Final acceptance awaits corrected live label.

Deployment READY and www aliased: dpl_GNa1u7qhohQAmBHJS8rziCuGDvb7. Live
authenticated Calendar has new controls. 09502PC shows Awaiting review with
blue primary fill and overdue ring; Completed=0, so green is not warranted by
current state. Finish completed-example and Planning live checks before closure.

Candidate dpl_GNa1u7qhohQAmBHJS8rziCuGDvb7: upload/install/generation complete,
optimized remote build running under session 39883. Production QA tab 8 is
authenticated at reported order 09502PC/Sep 2; verify only after build/alias.

Deployment started: session 39883, isolated Ticket 18 bundle, correct dashboard
project. API/Sales typechecks pass; Dashboard existing baseline remains with
clean scoped new-change diagnostics. Await build and alias verification.

Release scope correction: shared.tsx and search-filter-trpc.tsx have partial
overlays only (Planning invalidation and Escape guard). Full workspace copies
would pull unrelated missing-dependency changes. Preserve these scoped bundle
versions when syncing updates. New executor fixture type corrected. Forty-nine
boundary/filter/invalidation tests pass; Dashboard/API checks 77116/33551 run.

Release candidate: /private/tmp/gnd-ticket18-release-Fp6GCw/source, based on
verified Ticket 17 with explicit Scratch allowlist. Correct dashboard project
confirmed; root workspace link is storefront and excluded. Frozen install,
dummy-URL Prisma generation, and 54 tests / 138 assertions pass. Typechecks
running. No new deploy; rollback CTJRtcF9uerErnk1k2bM1Qk7V8Ua verified Ready.

Current acceptance: URL/search/priority/date/mode, loading/empty/error/retry
complete. Browser proves next-week zero, month one, preserved Schedule state;
real QueryObserver and rendered Retry test prove failed-query recovery.
Thirteen focused tests pass. Scratch first: 17/18, batch 194/196. Final release
QA/rollout/rollback remains; no Production deployment in this step.

Escape QA finding resolved: shared SearchFilterTRPC clears filters only when
Escape originates in its search input, preserving menu dismissal even after
Radix closes first. Authenticated local browser verified retained q/priority,
zero High-priority gaps, and one restored gap after removing the priority chip.
Ten focused tests pass; remaining loading/error and date/mode evidence is open.
Reload verified persisted Planning/search/date, visible loading, and resolution
to the same one matching gap. Error/retry evidence remains outstanding.

Contrast acceptance verified from actual Tailwind OKLCH tokens and app dark
background/card surfaces: all six status text palettes meet WCAG AA 4.5:1.
Eight focused contrast, hydration and assignment-guard tests pass. Initial
contrast harness percentage parsing was corrected before recording this result.
Scratch first: 16/18, batch 193/196. Full URL/state browser matrix and final
release QA remain; no Production change in this verification step.

Acceptance audit closes card information/responsive fallbacks, secondary signal
hierarchy and action routing (8/12/14). Edit navigation verified against local
24-0327-1282's existing Apr 1, 2024 Production date, with no save. Existing
rendering, palette, permission and committed assignment evidence supports the
other parts. Scratch first: 15/18, batch 192/196. Contrast, complete URL/state
matrix and final release remain; no Production mutation.

Status-only local QA recorded for 24-0401-1294; green Schedule card and explicit
badge verified. Read-only audit confirms casing assignment 13482 still has no
submissions. Scratch first: acceptance 11 checked, 12/18, batch 189/196.
8GB Dashboard typecheck completes with baseline errors; new matcher errors fixed
using Node assertions, existing it.each replaced with equivalent test loop.
No Production write; local QA assignment and declaration retained.

Regression matrix accepted after fresh 81-test Planning/UI/invalidation run and
80-test Production/API run; Scratch first: 11/18, batch 188/196. Local 09426DB
FULL_WORKFLOW card verified emerald/completed. Status-only browser case still
needs a suitable local fixture. Dashboard typecheck hit default 4GB heap limit;
8GB command-local retry session 94874 remains running, not claimed successful.

Worker acceptance verified with local Izri login: own order present, known
Carlos order absent, admin Planning route redirects, forced Planning URL
remains assignment-only without admin controls. Scratch updated first to
10/18, batch 187/196. Removed worker presentation-only filter chip. Mixed
completion move lock preserved per Ticket 16; readable tooltip verified.

Committed local assignment refresh verified: casing quantity 4 on 24-0401-1294
assigned to Izri. Planning 16→15, Past Due 264→265, Today 0; one Schedule group
with three assignments and one Past Due row. Scratch updated first to 9/18,
batch 186/196. Local test assignment retained. New unfinished-group completed
move-lock discrepancy remains open; no Production changes.
- Scratch authority: `.scratch/sales-pipeline-lifecycle-implementation/issues/18-production-planning-calendar-visibility-and-canonical-colors.md`
- Branch: existing `master`; no branch creation, per user.

Add a separate admin Planning gaps projection for order-level Production due
dates, preserving assignment-backed Schedule and worker scope. Reuse canonical
snapshot quantities, command eligibility, date semantics and completion
provenance. Ticket 14 already retired cohort logic; do not reintroduce it.

Baseline inspection confirms the existing Calendar cannot select an order
without assignments. Package projection work is next, followed by API, admin
presentation, bounded-query verification and authenticated responsive QA.
Scratch was updated first. No schema, API or deployed behavior changed yet.

## Package milestone

The separate planning membership and query modules are implemented. They reuse
canonical quantities and command decisions, batch source evidence, preserve
date provenance and bound calendar reads to 42 days / 1,500 candidates with
explicit truncation. Sixteen tests / 38 assertions pass, including database
loader integration, exclusion/coverage/permission cases and DST/date validation.
The initial Sales typecheck passes. API/UI integration, measured database plan,
colors, invalidation and authenticated QA remain; acceptance stays at 0/18.

## API/UI integration milestone

Separate permissioned query and URL-backed admin Calendar mode are implemented,
with independent loading, matching prefetch, week/month cards and overflow,
existing detail/edit navigation, canonical colors and status-only provenance.
`sales.pipeline.changed` refreshes planning alongside Schedule and summaries.
Read grants: viewOrders/editOrders/editProduction; assignment: editProduction.
Worker-only viewProduction does not authorize planning reads.

Combined regression: 134 tests / 427 assertions pass. API typecheck passes.
Dashboard broad baseline remains; focused diagnostics show no changed runtime
errors. Browser QA was attempted but Mac is locked. Database plan/latency,
authenticated security/responsive acceptance and deployment remain. Scratch
updated first to 2/18, batch 179/196. No schema or Production write.

## Local database and edge-case milestone

Scratch first: 5/18, batch 182/196. Read-only local EXPLAIN uses the existing
fulfillment index, date filter and filesort. A populated 42-day range returns
73 planning gaps in 109–129 ms warm (181 ms cold maximum); no new index needed
for the measured 500 ms target. Evidence lives in Scratch
`ticket18-planning-measurements.md` with the guarded rerunnable script.

Canonical commercial `void`/`voided` now maps to cancelled for both headline
and commands. Unknown planning requirements expose a stable reason code and
readable message. Focused lifecycle/command/palette verification: 55 tests /
129 assertions. Local 09502PC currently awaits review (4 assigned, 0 completed,
no completion declaration), so its expected color is blue. Browser QA remains
blocked by locked Mac; no Production deployment or data mutation occurred.

Final milestone verification: 174 tests / 530 assertions and Sales/API
typechecks pass. Release audit must inspect stored void/voided order projections
for any refresh needed after the canonical alias correction.

## Card/isolation milestone

Scratch first: 8/18, batch 185/196. Direct rendering verifies zero/partial
quantities, permission-aware actions, required details and separate overdue
emphasis. Card permissions/navigation are resolved once per Calendar, Normal
priority is visible, duplicate state labels are removed, and edit links use
stored order slugs. Strict Production schedule input rejects Planning payloads;
exact-group/concurrency/worker-lock regressions remain green. Older batch and
material-review invalidation now includes Planning.

Focused matrix: 60 tests / 225 assertions. Local void/voided population is zero;
no local projection refresh needed. Browser rechecked: Mac still locked.

## Canonical refresh and palette checkpoint

Scratch updated first; verified totals remain 8/18 and batch 185/196.
Assignment/submission/Production convenience hooks now emit
`sales.pipeline.changed`. A real QueryClient with typed tRPC keys verifies
Planning, Schedule, summary, Due Today and Past Due invalidation together.
Palette evidence covers full-workflow declaration provenance and completed
green despite unavailable material/overdue dates, without reviving retired
aggregate-only completion. Truncated empty Planning results now describe the
loaded subset honestly. Fresh focused run: 51 tests pass, 0 fail, 265 assertions.
Committed assignment, authenticated worker security and responsive visual QA
remain open: browser availability was rechecked and the Mac is still locked.

Execution is now blocked (not complete) after repeated confirmed Mac-lock
failures across consecutive goal turns. Scratch records the gate first.
Resume at authenticated browser acceptance after manual unlock, preserving
8/18 verified checks; no deployment or further data writes are claimed.

Resume checkpoint: Mac is unlocked. Scoped restart recovered orphaned hung
local dashboard; authenticated Planning renders zero current-week gaps and
16 for Apr 1–7, 2024. Browser found calendarMode incorrectly shown as a filter
chip, so acceptance 15 remains open pending correction. Scratch updated first;
8/18 checks unchanged. Shared proxy/database preserved, no Production write.

Calendar mode is now hidden from data-filter chips through the existing header
configuration, following Midday's URL-state separation. Five focused tests pass;
authenticated browser confirms the chip and spurious Clear filters are gone
while the same 16 Planning results remain. Scratch records the remaining
worker-filter affordance mismatch and acceptance 15 stays open.

Worker-filter affordance corrected using the existing header's mode-specific
filter policy: Planning offers search/priority; Schedule retains Assigned To.
Six tests pass (9 assertions), with browser menu verification in both modes.
Authenticated local month has 66 gaps / 78 separate schedule groups. Checked
390×844 week cards and month overflow plus 768×1024 month grid; viewport reset.
Scratch updated first. Full authenticated worker, assignment and color matrix
remain open; no acceptance count increment or Production write.

Assignment QA found local 24-0401-1294's first door displays staffed/completed
source assignment alongside NOT ASSIGNED/1 available derived analytics.
Cancelled without submitting. Single-item create-sales-assignment also lacks
the batch route's canonical command transaction wrapper. Scratch records the
required command/quantity seam correction before committed assignment QA;
counts remain 8/18. This is a new observed consumer-parity defect, not accepted
historical reconciliation cleanup.

Identity diagnosis confirmed locally: assignments 3338/3340 store `-` from
plain-item UID generator misuse. Shared generator now calls itemItemControlUid;
exact item matching treats `-` as missing. One regression (3 assertions) passes;
read-only replay reports zero pending total for both doors, casing unchanged.
No persisted repair. Mixed old LH versus no-handle quantities still yield a
negative hand component; normalization and canonical single-item guard remain.

Implemented canonical single-item guard with locked fresh item/capacity read,
identity checks, source labor cost and revision enforcement. No-handle pending
quantities no longer expose negative hands. Fourteen focused tests / 51
assertions pass; Sales typecheck passes. Scratch updated first; runtime
assignment/concurrency and dashboard diagnostics still pending, counts 8/18.
