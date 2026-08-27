# Full Local-Browser Sales QA

Date: 2026-08-26
Owner: Sales Form Team
Status: Complete

## Objective

Prove the complete internal new-sales workflow in an authenticated browser
against the synchronized local database, fix every reproducible in-scope defect,
and retain evidence that editor, persistence, copy/conversion, and print all use
the same commercial graph.

## Scope

- Internal dashboard quote and sale creation/editing.
- Quote-to-sale conversion and historical-sale copy.
- Door, House Package Tool, Moulding, Shelf, Service, flat cost, tax, discount,
  and print-preview behavior.
- Save/reopen, source isolation, relational integrity, stale-preview prevention,
  validation, duplicate submission, revision conflict, and practical performance.
- Authenticated browser behavior on `https://gndprodesk.localhost` using only the
  local database.

Dealership quote approval, payments, fulfillment, inventory application, hosted
Preview, Production, and schema migrations are outside this campaign unless a
sales test proves a direct regression that requires adding them.

## Architecture And Product Constraints

1. The relational Sales graph is the sole commercial source of truth per
   ADR-056. JSON editor metadata cannot override rows, quantities, prices, costs,
   or totals.
2. Published line totals are authoritative per ADR-016. Editor rates, grouped
   averages, summaries, and documents must reconcile to those totals.
3. Copy and quote conversion create independent target identities while leaving
   the source unchanged. Retries must not create another target.
4. Print consumes the same ordered commercial graph as the editor and is
   regenerated after every material edit.
5. Fixes belong in `packages/sales` when they express shared commercial rules;
   app and API files remain orchestration boundaries.
6. New UI is not planned. If a verified defect requires UI work, reuse installed
   `@gnd/ui` shadcn primitives and the repository's React/Next.js standards.
7. Existing unrelated inbound-receiving work in the checkout is not part of this
   campaign and must not be staged, stashed, rewritten, or committed.

## Goal Checklist

Roadmap: 7/7 non-deferred done (100%).

| ID | Outcome | Status | Exit evidence |
| --- | --- | --- | --- |
| F1 | Baseline, fixtures, persisted checklist, and QA report | Done | Local browser authenticated; baseline health 97/100; Pablo oracle and historical source captured |
| F2 | Full-component quote creation and editing | Done | Quote `03566PC` saved/reopened with every item family; editor, DB, and preview all match `$308.61 + $21.60 = $330.21` |
| F3 | Quote-to-sale conversion and comparison | Done | Fixed conversion order `09471PC` has one independent target; source unchanged; editor/DB/preview graph matches |
| F4 | Historical-sale copy and isolation | Done | Legacy order `08731DB` copied to `09472PC`; semantic hashes match, identities are fresh, source unchanged, editor/preview parity fixed |
| F5 | Component edit matrix | Done | Authorized local remove/re-add and cleanup passed on `03566PC` and `09473PC`; editor, relational database, and regenerated print agree |
| F6 | Reliability and integrity gates | Done | Two-tab stale conflict, missing-data no-write, retry idempotency, clean reload/preview, timing, and scoped orphan/duplicate scans pass |
| F7 | Fixes, regressions, review, final report, Brain, and handoff | Done | Nine defects fixed; 139 tests / 475 assertions pass; targeted Biome, UI typecheck, scoped typecheck review, diff, browser, and database integrity gates pass |

Every non-deferred feature must be Done before this Goal is complete.

## Fixture Strategy

| Fixture | Mutation policy | Purpose |
| --- | --- | --- |
| Quote `03565PC` | Read-only | Pablo persisted-price and editor/preview oracle |
| Quote `03566PC`, PO `NSF-MIXED-001-LOCAL-20260826`, database id `26560` | Disposable local record | Full-component quote, edits, conversion, and repeat-save tests |
| Order `08731DB` / database id `23820` | Copy only; source read-only | Legacy copy parity and source isolation across Door/HPT, Moulding, Service, Shelf, and flat lines |
| Converted target sale `09471PC` / database id `26565` | Disposable local record | Fixed post-conversion graph, edits, preview invalidation, and conflict tests |

The exact historical source and generated local IDs are recorded once selected.

## Milestone Test Matrix

### F1 Baseline

- Confirm current commit, local database, app route, authentication, and console.
- Select a historical source with the broadest available relational graph.
- Record baseline source totals and relation counts before mutation.
- Capture the Pablo editor/preview oracle and initial sales-list health.

### F2 Full-Component Quote

- Create a quote with Door, HPT, Moulding, Shelf, Service, and one explicit cost.
- Exercise titles, quantities, components, size/swing, addons/custom pricing,
  service flags, shelf product selection, tax, discount, and fulfillment fields.
- Save, hard reload, reopen from the quote list, and compare editor with preview.

### F3 Quote To Sale

- Convert the saved quote exactly once and retry the action.
- Compare source and target customer, addresses, PO, profile, ordered lines,
  children, quantities, commercial amounts, costs, tax, discount, and document.
- Prove source immutability and fresh target identities in the local database.

### F4 Historical Sale Copy

- Copy a representative legacy sale through the real browser action.
- Compare ordered graph, commercial values, print, and editable defaults.
- Prove source isolation, fresh identities, and no inherited adjustment authority.

### F5 Component Edit Matrix

- Door: product, size, swing, LH/RH, base, addon, custom, remove, and re-add.
- HPT: multiple doors/sizes, quantities, steps, explicit Repair, and grouping.
- Moulding: product, piece length, quantity, calculator, addon, custom, remove.
- Shelf: section/category/product search, quantity, price, flags, remove, re-add.
- Service: title, quantity, rate, tax, production, remove, re-add.
- Duplicate and reorder mixed lines; verify identity and print ordering.

### F6 Reliability And Integrity

- Save/reload/new-tab persistence and dirty-state behavior.
- Preview regeneration after edits and no stale document cache.
- Double-submit/retry safety and stale-revision conflict behavior.
- Invalid/missing input recovery without partial writes.
- Browser console/network health and bounded interaction/save/preview timing.
- Local relational counts, identities, totals, and orphan/duplicate checks.

### F7 Closure

- Fix issues by severity with focused regression coverage and real-browser reruns.
- Review every changed file against the plan and architecture boundaries.
- Publish baseline/final health, defect ledger, evidence links, Brain updates,
  remaining risks, and atomic sales-only commits.

## Defect Ledger

| Severity | Found | Fixed | Verified | Deferred |
| --- | ---: | ---: | ---: | ---: |
| Critical | 0 | 0 | 0 | 0 |
| High | 6 | 6 | 6 | 0 |
| Medium | 2 | 2 | 2 | 0 |
| Low | 1 | 1 | 1 | 0 |

## Evidence And Reporting

- Live report: `.gstack/qa-reports/sales-full-2026-08-26/qa-report.md`
- Screenshots: `.gstack/qa-reports/sales-full-2026-08-26/screenshots/`
- Browser evidence must include before/action/result for each defect.
- Each milestone updates this plan, the live report, and `.brain/progress.md`
  when a material result or fix is completed.

## Progress Log

- 2026-08-26: Goal activated. Authoritative sales architecture, parity matrix,
  fixture catalog, browser gates, print contract, ADR-016, and ADR-056 reviewed.
  F1 baseline and fixture selection started.
- 2026-08-26: F1 completed at 97/100 baseline health. Authenticated local
  Sales Orders loaded with zero console errors. Quote `03565PC` retained exact
  editor/preview parity for `$99.72`, `$106.14`, `$108.84`, and `$495.24`.
  Historical source `08731DB` was selected because its relational graph covers
  eight items, six HPT records, eight doors, 38 steps, one Shelf row, Moulding,
  Service, and flat lines. Its source hashes were frozen before mutation.
- 2026-08-26: F1 found high-severity `ISSUE-001`: order `08731DB` is
  `$4,788.38` in its authoritative database row and Sales preview but the new
  editor shows `$4,977.89` after two clean loads, a `$189.51` divergence before
  any edit. F2 is now in progress, with the fixture remaining read-only until
  the defect is diagnosed and fixed.
- 2026-08-26: F2 completed. Created quote `03566PC` / database id `26560`
  from the authenticated browser with Moulding, taxable Service, Shelf, and a
  Door/HPT line. The quote persisted four parent items, one shelf child, one HPT,
  one door, zero-value Labor/Delivery costs, 7% tax, delivery fulfillment, and
  PO marker `NSF-MIXED-001-LOCAL-20260826`. After route transition and reload,
  editor, relational database, and preview all matched subtotal `$308.61`, tax
  `$21.60`, and total `$330.21`; the preview retained the same ordered line
  families and quantities. The Height selector's initial `0 components` state
  was confirmed to be transient loading; its fresh API and settled browser state
  both exposed `6-8`, `7-0`, and `8-0`. F3 conversion is now active.
- 2026-08-26: `ISSUE-001` now has a deterministic two-second local diagnostic
  loop. The editor display `$4,977.89` decomposes into recalculated base total
  `$4,832.90` plus recalculated card charge `$144.99`; the print path retains
  settled order total `$4,788.38` plus stored charge `$143.65`, yielding print
  display total `$4,932.03`. The source is fully paid and remains read-only;
  correction will be based on the copy/edit contract, not mutation of the
  historical settlement.
- 2026-08-26: F3 converted quote `03566PC` / id `26560` once to order
  `09470PC` / id `26563`; retry returned that same target, source hashes stayed
  unchanged, and copied parent, step, HPT, and door identities were fresh.
  Semantic comparison exposed high-severity `ISSUE-002`: the source Shelf parent
  had one active relational shelf row while the target had none, degrading its
  print section to a generic line item despite matching totals. Root cause was
  the shared copy projection/create graph omitting `ShelfItem`. The copy layer
  now selects and recreates active shelf children, and its focused regression
  passes 7/7 tests. Fresh local-browser verification passed through copied quote
  `03567PC` / id `26564` and converted order `09471PC` / id `26565`: both graphs
  retain 4 items, 19 steps, 1 Shelf row, 2 HPT records, 1 door, and totals of
  `$308.61 + $21.60 = $330.21`. Shelf ids `389` and `390` are independent; the
  preview renders the exact product in a Shelf section. A retry retained one
  live target; the additional `order-hx` row is the expected history snapshot.
  F3 is complete and F4 historical-sale copy is active.
- 2026-08-26: F4 copied frozen historical order `08731DB` / id `23820`
  through the authenticated browser to `09472PC` / id `26567`. Source and
  target share exact semantic hashes for eight items, 38 steps, one Shelf row,
  six HPT records, eight doors, and two tax rows; target identities are fresh,
  adjustment authority was not inherited, the source stayed read-only, and the
  copy correctly resets its paid `$0` due balance to `$4,788.38` unpaid.
  The copy reproduced `ISSUE-001`, proving it affected editable targets. Root
  cause was pristine persisted records being replaced during hydration/render
  by an inferred live tax calculation. Persisted header/tax authority is now
  retained until a real edit makes the form dirty; edits still switch to the
  live calculator. Focused API, application, and overview regressions pass
  16/16. Browser verification shows idle editor/preview parity at `$4,516.72`
  subtotal, `$313.26` tax, `$4,788.38` principal, `$143.65` card fee, and
  `$4,932.03` card total. F4 is complete and F5 component edits are active.
- 2026-08-26: F5 reviewed edits on disposable order `09472PC` exercised Door,
  Moulding, Service, and Shelf values and exposed `ISSUE-003`: the approved
  adjustment job persisted parent/grouped/HPT changes and the header but omitted
  Shelf-child and tax-row projections. The job now projects approved Shelf rows
  and replaces `SalesTaxes`; focused projection coverage passes 3/3. A clean
  allocation-backed rerun on `09473PC` is fully verified: the single approved
  adjustment reached `APPLIED_WITH_REVIEW`, editor reload is `Idle`, and the
  relational Shelf, HPT door, tax row, order header, and regenerated preview all
  agree at `$5,350.19 + $374.12 = $5,724.31` principal and `$5,896.04` card total.
- 2026-08-26: Direct edits on clean copy `09473PC` verified Shelf quantity `2`
  across editor, database, and preview, then added a taxable Service row at
  `2 x $12.34` and moved Shelf from Item 7 to Item 1. Both the grouped Service
  addition and print order persisted. The reorder exposed `ISSUE-004`, where
  normalized Shelf metadata shape marked a pristine reload dirty. Shelf sync
  now compares row economics rather than raw object shape; its regression passes
  and the reordered browser reload is `Idle`. Temporary Service-row removal is
  staged pending explicit deletion confirmation; the rest of F5 remains active.
- 2026-08-26: Additional F5 add/edit coverage on `09473PC` persisted a second
  Shelf product, a second Service row, and a second Door/HPT product and size.
  The reviewed follow-up changed Shelf line 2 from quantity `1` to `2` and the
  allocated `2-6 x 6-8` HPT swing from LH `2` to `3`; database and preview show
  Shelf `$295.38`, Door `$1,200.00`, HPT `11 / $2,190.00`, taxable subtotal
  `$5,344.52`, tax `$374.12`, and principal `$5,724.31`. Browser retry retained
  exactly one adjustment. Local Trigger realtime monitoring returned an invalid
  public-token 401, so the already-approved idempotent application handler was
  invoked directly for local verification; this environment concern is tracked
  separately from sales graph correctness.
- 2026-08-26: F6 reliability and integrity gates completed. Two simultaneous
  tabs on quote `03566PC` proved stale-version rejection without a competing
  write, after which the original PO marker was restored. That test exposed
  medium `ISSUE-005`: passive Moulding hydration added optional derived
  `estimateUnit`/`unit` fields and falsely marked pristine mixed quotes dirty.
  Semantic Moulding synchronization now compares persisted identity and real
  commercial fields while ignoring those derived display-only values; its TDD
  regression and the 15-test focused Moulding suite pass, and quotes `03566PC`
  and `03567PC` reload `Idle`. Missing-customer create attempted no write
  (`26,345` rows before/after), reload-to-idle measured about `0.9s`, preview
  readiness about `3.2s`, and scoped current-fixture Shelf/HPT/Door/Step orphan,
  document-type uniqueness, and adjustment-idempotency scans are clean.
- 2026-08-26: Sales-only review found and closed a duplicate-product Shelf
  identity edge in the new adjustment projector. Product/category fallback now
  consumes each persisted Shelf row at most once, so a second approved row for
  the same product creates a fresh child instead of updating the first twice.
  The failing regression passes with focused projection coverage at 3/3.
- 2026-08-26: Extended the authenticated F5 browser matrix on disposable quote
  `03566PC`. Editor, relational database, and regenerated preview agreed for a
  Moulding custom price and calculator quantity, Service tax/production flags,
  Shelf custom price, Door addon/custom price, Delivery cost, Discount, and Flat
  Labor Cost. Every commercial value and profile change was restored; the quote
  reloads `Idle` at `$308.61 + $21.60 = $330.21`. Discount and Flat Labor remain
  as zero-value test rows because removing them is confirmation-gated. Switching
  the customer profile repriced HPT rows immediately and restored cleanly; no
  explicit Repair control appeared because the live row was normalized rather
  than left in profile-price drift, and a scan of 1,000 recent local Door rows
  found no persisted drift fixture. F5 now remains open for confirmation-gated
  remove/re-add, duplicate/cleanup, and the resulting print-order proof. The
  then-current focused run passed 47 tests / 152 assertions across 10 files.
- 2026-08-26: F5 duplicate-line proof exposed and closed high-severity
  `ISSUE-006`. Pre-fix, duplicating the Service card showed five editor items and
  saved `$410.46`, but the grouped row retained its original UID, so persistence
  updated item `172433` instead of creating a second relation; the header then
  exceeded the four active items by `$75`. Grouped duplicates now receive fresh
  row UIDs in addition to cleared database ids and a fresh group UID. Hydration
  also rejects a stored header when every active relational item has a total and
  their sum contradicts it, while retaining saved authority for incomplete
  legacy graphs. The corrupted fixture first self-recovered to the four-item
  `$330.21` relational graph; a fresh duplicate then persisted as item `172581`.
  Database and print now contain five ordered items, two independent Service
  groups, and matching `$383.61 + $26.85 = $410.46`; reload is `Idle`. Expanded
  regression coverage passes 73 tests / 319 assertions across 12 files. F5 now
  remains open only for confirmation-gated remove/re-add and cleanup actions.
- 2026-08-27: The user authorized deletion and re-addition of disposable local
  rows on `03566PC` and `09473PC`. Quote `03566PC` completed Service, Shelf,
  Moulding, and HPT/Door removal/re-addition, retained the requested print order,
  and returned to its four-item `$308.61 + $21.60 = $330.21` baseline. Order
  `09473PC` removed its temporary Shelf, Service, and Door/HPT additions through
  reviewed adjustment `cmtb5vv4q001c9ko89la17ma3` and settled at eight items,
  `$4,861.21 + $340.28 = $5,201.49`. That reduction exposed high-severity
  `ISSUE-007`: approved grouped reduction omitted sibling Service rows from the
  proposal but left them active. The worker now retires omitted grouped parents
  and their HPT/Door dependents; an exact-guarded local repair retired only the
  two stale QA Service rows. Editor, database, and regenerated preview now agree.
- 2026-08-27: Closed low-severity `ISSUE-008` by replacing blocking native
  Service deletion confirmation with the shared two-step button and exposing an
  explicit armed accessible label for every `ConfirmBtn`. Live Chrome proved
  first-click arming, second-click removal, no JavaScript dialog, and clean
  reload for Service and Shelf controls. Closed medium `ISSUE-009` by polling
  for a refreshed sale after an uncertain adjustment-create response: if the
  post-commit task response fails but the sale version advances, the UI now
  continues as success; a genuine failure with no refreshed version is still
  rethrown. Final validation passes 139 tests / 475 assertions across 14 files,
  targeted Biome and `@gnd/ui` typecheck, changed-path typecheck review, and
  `git diff --check`. The exact-fixture integrity scan found no header/item
  mismatch, Shelf/HPT/Door/Step orphan, duplicate active Door identity, or
  duplicate current document type. F5 and F7 are complete.

## Frozen Historical Source Baseline

| Field | Value |
| --- | --- |
| Order | `08731DB` |
| Database id | `23820` |
| Subtotal | `$4,516.72` |
| Tax | `$313.26` |
| Grand total | `$4,788.38` |
| Items / HPT / doors / steps / shelves / costs | `8 / 6 / 8 / 38 / 1 / 0` |
| Header hash | `158de53d8d1203e8b1fb612348390255` |
| Items hash | `9f2f63eeed0e0da6053a3d9710dc0011` |
| HPT hash | `93cb86b1502bcad996dfe91f55d9a078` |
| Doors hash | `405e01fd3dec3e7fc81d064a90e68c9c` |
| Steps hash | `64053c1072bc2f50e7be3bc2a668b1fe` |
| Shelf hash | `621a23c477635205c4168089b892ceb2` |
| Taxes hash | `3867672dc9b498cfd2e2e95e6bf82ba5` |
