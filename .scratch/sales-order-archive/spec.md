# Reversible Sales Order Archive Workspace

Status: ready-for-agent

Source: [`map.md`](./map.md) and the approved proposed-answer comments on all
four local Wayfinder decision tickets.

## Problem Statement

The canonical Sales Orders workspace accumulates orders that staff no longer
need in their everyday working set. Existing deletion sends an order to Sales
Bin and therefore carries a materially different meaning. Production,
payment, inventory, dispatch, fulfillment, and accounting statuses also cannot
safely represent a purely organizational choice.

Staff need a reversible way to remove selected Sales Orders from the default
workspace while preserving the order, its direct links, its complete history,
and every commercial and operational fact. They also need a predictable way to
find and restore archived orders. The shared list query currently serves
dashboard, summary, export, saved-tab, mobile, legacy, and optional projected
read paths, so archive scope must remain consistent across all of them.

## Solution

Introduce Archived Sales Order as a nullable timestamp-backed visibility state
on the authoritative Sales Order. A missing archive timestamp means the order
belongs to the default Sales Orders working set. An archive timestamp means the
order is excluded from that default list and available through
`Show > Archived`.

Archive remains independent from Sales Bin deletion and every Sales Order
lifecycle. Any non-deleted order may be archived. When an order is not
terminal, confirmation explicitly warns that production, payment, inventory,
dispatch, fulfillment, and other operational work continues. Purpose-built
operational queues and direct order links do not silently hide archived work.

Users with the existing order-editing capability can archive or restore one
row or a selected batch. The server rechecks permission and current state,
updates only eligible orders, records each changed order in Sales History, and
returns changed and skipped results. Restore is exposed from the Archived
view. List, summary, saved-tab, export, mobile-default, and projected/legacy
query behavior all use the same canonical archive scope.

## User Stories

1. As a sales user, I want archived orders excluded from the default Sales Orders workspace, so that my daily working environment stays focused.
2. As a sales user, I want the default behavior to require no URL parameter, so that existing links naturally open the active working set.
3. As a sales user, I want `Show > Archived`, so that I can find orders removed from the default workspace.
4. As a sales user, I want Archived to compose with customer, date, status, Sales Rep, Special Order, search, and sorting filters, so that I can narrow old records normally.
5. As a sales user, I want the Archived scope shown as an active filter chip, so that I always understand why the visible rows differ from the default list.
6. As a sales user, I want Special Order scope presented separately from Show, so that Archived and Special Order filters can be combined.
7. As a sales user with order-editing authority, I want an Archive row action, so that I can remove one order from the default workspace.
8. As a sales user with order-editing authority, I want to archive selected orders together, so that periodic cleanup does not require repetitive row actions.
9. As a sales user, I want every archive action confirmed, so that an accidental menu click cannot immediately hide an order.
10. As a sales user, I want a stronger warning for non-terminal orders, so that I understand archiving does not stop operational work.
11. As a sales user, I want an archived order to disappear after the command succeeds, so that the default workspace immediately reflects the change.
12. As a sales user, I want a Restore row action in the Archived view, so that archiving remains reversible.
13. As a sales user, I want to restore selected archived orders together, so that I can recover a batch efficiently.
14. As a sales user, I want a restored order to leave the Archived view and return to the default scope, so that both workspaces remain truthful.
15. As a sales user, I want stale archive or restore selections reported as skipped rather than catastrophic failures, so that safe retries remain understandable.
16. As a sales user, I want batch results to report changed and skipped counts, so that I know whether every selected order changed.
17. As a user without order-editing authority, I want archive and restore actions hidden and rejected server-side, so that visibility cannot be changed without permission.
18. As an operations user, I want archived non-terminal orders to remain in relevant production, inventory, dispatch, fulfillment, and accounting queues, so that workspace cleanup cannot conceal required work.
19. As a sales user following a direct order link, I want archived orders to remain accessible, so that references in messages and history do not break.
20. As a sales user, I want Sales Bin to continue showing deleted orders independently of archive state, so that archive never replaces deletion or recovery behavior.
21. As a sales user, I want summaries to count only the scope currently displayed, so that cards and rows agree.
22. As a sales user, I want filtered Excel export to honor Archived scope, so that the downloaded report matches the visible query.
23. As a sales user, I want to save an Archived filtered tab, so that recurring historical views are reusable.
24. As a sales user, I want saved-tab counts to refresh after archive and restore, so that badges never retain stale totals.
25. As a mobile user, I want archived orders excluded from the ordinary shared order list, so that mobile and dashboard defaults agree.
26. As an auditor, I want every archive and restore attributed in Sales History, so that changes can be reconstructed after the current timestamp is cleared by restoration.
27. As an auditor, I want archive to leave payment, production, inventory, dispatch, fulfillment, and accounting evidence unchanged, so that organization cannot rewrite business history.
28. As a system operator, I want archive scope enforced before count and pagination, so that pages, totals, and cursors remain coherent.
29. As a system operator, I want legacy and projected reads to return the same archived scope, so that rollout mode cannot change what users see.
30. As a system operator, I want existing orders to remain non-archived after migration, so that deployment causes no unexpected disappearance.
31. As a support operator, I want archive and restore commands to be idempotent, so that retrying an uncertain request cannot toggle or duplicate state.
32. As a keyboard or screen-reader user, I want archive and restore actions, warnings, and result feedback to be labeled and operable accessibly, so that cleanup is not pointer-only.

## Implementation Decisions

- Add a nullable `archivedAt` timestamp to the authoritative Sales Order. Null
  means active in the default Sales Orders workspace; non-null means Archived
  Sales Order. Existing rows require no data backfill because null is the
  intended default.
- Add an index shaped for the canonical order list scope across order type,
  deletion, archive state, created date, and stable identity. Confirm the exact
  column order against representative query plans before finalizing it.
- Do not add archive behavior to the global soft-delete extension. Archive is a
  Sales Orders workspace concern and must not silently remove records from
  purpose-built operational queries.
- Keep `deletedAt` authoritative for Sales Bin. Default list scope is
  non-deleted plus non-archived. Archived scope is non-deleted plus archived.
  Bin scope is deleted and does not depend on archive state.
- Add a typed archive-scope input with `archived` as its explicit value. An
  absent value selects non-archived orders. The scope is applied before count,
  sorting, cursor/offset pagination, and row loading.
- Apply the same scope to the standard list, summary, payment-review fallback,
  filtered export, saved-tab count, and optional projected-read candidate ID
  selection paths.
- Preserve independent composition with Special Order filters. Present
  Archived under the visible `Show` control and rename the existing visible
  Special Order scope label as needed so two unrelated controls do not both
  appear as Show. Existing Special Order URL semantics remain compatible.
- Shared mobile order-list calls inherit the absent/default non-archived scope.
  No mobile archive or restore control and no mobile Archived filter are added
  in this feature.
- Add one protected, set-state archive command accepting an archive/restore
  intent and 1–100 unique positive Sales Order identifiers. Reuse the existing
  `editOrders` permission and resolve the actor from the authenticated session.
- Recheck that every target exists, is an order, is non-deleted, and is in the
  opposite archive state. Update eligible orders idempotently and return
  changed identifiers plus structured skipped results for missing, deleted,
  already archived, or already active targets.
- Record one Sales History entry per changed order in the same transaction as
  its state change. Evidence includes archive or restore action, actor,
  timestamp, and the prior and next archive state. A free-text reason is not
  required in the first version.
- Add Archive to normal row actions and Restore to archived-row actions. Add
  matching selected-row batch actions to the existing floating batch bar.
- Confirm every archive. If any selected row is not in a terminal lifecycle,
  explain that archiving changes only Sales Orders workspace visibility and
  does not stop ongoing operations. Restore requires normal confirmation but
  no operational warning.
- The active Archived query state supplies presentation context; do not add a
  redundant archived badge to every row. Restore remains visually explicit in
  row and batch actions.
- Report complete success, partial success, and no-op outcomes with changed and
  skipped counts. Clear only rows that actually changed from the current table
  selection after the canonical query refresh completes.
- Publish the established Sales Order query-invalidation event after commit.
  Refresh default and Archived list variants, summaries, saved-tab counts, and
  affected order detail caches without duplicating bespoke invalidation lists
  in each component.
- Keep archive state out of the compact Sales Order list projection payload
  unless implementation proves row presentation needs it. Canonical candidate
  selection owns archive filtering. Updating the Sales Order revision makes a
  stale projection fall back and refresh under the existing guarded read-model
  contract, so no projection version bump or deployment backfill is planned.
- Direct Sales Overview and edit loaders continue resolving archived orders
  under their ordinary authorization and lifecycle rules.
- No existing order is automatically archived by migration, age, completion,
  payment, or deployment.

## Testing Decisions

- Prefer external behavior at the command and canonical query seams. Tests
  should assert visible scope, returned outcomes, durable audit effects, and
  permission behavior rather than private helper calls.
- Extend the existing Sales Orders query suite to prove default exclusion,
  Archived inclusion, independent Sales Bin behavior, filter composition,
  summary parity, count-before-pagination correctness, and stable sorting.
- Exercise both the legacy query and guarded projected-read candidate-selection
  paths. The same fixture set must produce the same IDs for default and Archived
  scopes. Payment Review remains covered on its legacy fallback path.
- Add command tests for permission denial, archive, restore, repeated requests,
  mixed eligible/stale batches, deleted-order skips, 100-order bounds, Sales
  History attribution, and rollback when audit persistence fails.
- Extend filter-contract tests to prove `Show > Archived`, independent Special
  Order composition, URL parsing, active-chip presentation, saved-tab
  serialization, and filtered export inputs.
- Extend row and batch orchestration tests to prove the correct action appears
  in each scope, non-terminal warnings are shown, changed/skipped feedback is
  accurate, selection clears only after refresh, and keyboard activation does
  not open the underlying row.
- Verify central invalidation covers default and Archived list/summary caches,
  saved-tab counts, and detail state without duplicate user feedback.
- Run the narrow schema/API/dashboard checks required by the repository, then
  validate the full archive/restore journey in an authenticated browser:
  archive one order, observe default disappearance, select Show > Archived,
  locate the order, restore it, and observe its return without console errors.
- Include one non-terminal order in browser or deterministic UI proof and stop
  before confirming any unrelated operational mutation. Confirm its
  purpose-built operational visibility through read-only evidence.

## Out of Scope

- Automatic archival by age, lifecycle, payment, or inactivity.
- Deployment-time archival or retroactive cleanup of existing orders.
- Physical deletion, permanent purge, or redesign of Sales Bin.
- Changing Sales Order cancellation, completion, payment, production,
  inventory, dispatch, fulfillment, accounting, or Administrative Completion
  semantics.
- Suppressing archived orders from purpose-built operational queues.
- Mobile archive/restore controls or a mobile Archived filter.
- A new archive-specific permission or mandatory archive reason.
- A dedicated archive badge on every row.
- Projection payload version changes or projection backfill unless an
  implementation discovery makes archive data part of the row contract.

## Further Notes

- The local Wayfinder comments were explicitly approved before this spec was
  published. No additional spec approval checkpoint is required.
- The earlier GitHub map and its four child issues contain no approved pipeline
  comments. They remain unchanged and are superseded by this local tracker at
  the user's direction.
- Implementation tickets must remain vertical, preserve the existing Sales
  Orders architecture, and update Project Brain documentation alongside any
  schema, API, permission, or feature behavior changes.

