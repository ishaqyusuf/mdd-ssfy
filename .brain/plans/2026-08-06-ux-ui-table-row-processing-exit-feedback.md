# Plan: Table Row Processing And Exit Feedback

## Objective

Give operators clear feedback when a table action changes a record so that it no
longer matches the active view. Use Sales Orders as the first implementation:
the row stays visible while the action runs, turns amber for processing, green
for committed success, or red for failure, and only leaves after a short success
handoff when the refreshed server result excludes it.

The implementation must keep TanStack Query and server filters authoritative.
It must not delay invalidation, mutate cached list results to fake membership, or
persist stale table rows across navigation or reloads.

## Assumptions

- The first rollout is the canonical `/sales-book/orders` virtualized table.
- A row may disappear because of any active URL filter or saved-tab baseline,
  not only a future/default paid-and-fulfilled view.
- Sales Orders direct mutations already complete through the global TanStack
  mutation cache, while production and fulfillment use the persistent task
  monitor and terminal query-event effects.
- Numeric `SalesOrders.id` is the stable activity identity. The row UUID remains
  the TanStack Table selection key and must be captured for selection cleanup.
- No database, Prisma, API response, permission, or business-state change is
  needed for this UX layer.
- Initial timing defaults are 1.6 seconds of visible success feedback followed
  by a 200-250ms fade; failure feedback remains for about 6 seconds or until a
  retry/dismissal. These values require browser validation before lock-in.
- Existing toasts and the task monitor remain the durable textual feedback.
  Row color supplements them and must not be the only status signal.

## Detailed Execution Plan

### Phase 0 - Baseline And Behavior Matrix

1. Reproduce and record the current behavior on `/sales-book/orders` with a
   saved view or URL filter whose membership changes after an action.
   - Required fixtures: paid + fulfillment pending, outstanding + fulfilled,
     payment-review pending, production pending, and a forced task failure.
   - Capture the active query parameters, row identity, action, invalidation
     event, and whether the row remains or leaves after refetch.
   - Dependency: use existing non-production fixtures; do not create or change
     payment/fulfillment data without explicit QA authorization.
2. Build an action matrix for the pilot:
   - direct mutations: payment review, payment application/recording where
     launched from the table, delete, and any inline inbound/status mutation;
   - background tasks: production completed, fulfillment completed, and
     production cancellation;
   - later candidates: Sales Overview actions, Quotes, Production, Dispatch,
     inventory queues, and other `tables-2` surfaces.
3. For each action, record:
   - stable entity id;
   - human-readable present/progress/success/failure labels;
   - direct mutation or monitored-task owner;
   - query event emitted on success;
   - filters that can remove the row;
   - retry and cancellation behavior.
4. Decision gate: approve the initial timing and whether a canceled task uses
   the red failure tone or a separate neutral canceled tone. Recommendation:
   use red only for failure and a muted neutral tone for user cancellation.

Validation: the matrix must explain every pilot action without relying on a
generic `isPending` flag that is lost when a menu or sheet unmounts.

### Phase 1 - Define The Reusable Row Activity Contract

1. Add a small client-only, non-persisted row activity store, likely under
   `apps/dashboard/src/store/table-row-activity.ts`.
2. Model one activity per `tableId + entityId`, with:
   - operation id;
   - action key and accessible labels;
   - `processing | success | error | canceled` phase;
   - start, terminal, and expiry timestamps;
   - optional source run/mutation id;
   - whether controls are temporarily disabled;
   - whether success may retain a filtered-out snapshot.
3. Expose explicit lifecycle commands:
   - `begin` before work starts;
   - `succeed` only after the server reports committed success;
   - `fail` with a safe display message;
   - `cancel`;
   - `clear` after the presentation window or view change.
4. Make concurrency deterministic:
   - the newest operation for a row wins;
   - late completion from an older operation cannot overwrite a newer state;
   - batch actions create one activity entry per affected order;
   - repeat clicks are blocked while the active operation is processing.
5. Keep domain payloads out of the global store. The table adapter, not the
   activity store, owns any short-lived row snapshot needed for retention.

Validation: unit-test lifecycle transitions, timer cleanup, latest-operation
guards, batch independence, cancel/error handling, and store cleanup on unmount.

### Phase 2 - Add Opt-In Tables-2 Presentation Support

1. Extend `components/tables-2/core/VirtualRow` with an optional typed activity
   prop rather than making every table adopt the behavior.
2. Render `data-row-activity`, `aria-busy`, and `aria-disabled` attributes.
3. Apply the activity background to every cell, including sticky columns:
   - processing: amber/orange;
   - success: emerald/green;
   - error: destructive red;
   - canceled: muted/neutral if approved.
4. Define state precedence so activity colors remain visible over normal hover,
   inbound `PENDING ORDER` highlighting, and sticky-cell backgrounds, while
   selection remains recognizable through its checkbox and focus treatment.
5. Disable row-open and nested action interaction only during processing and
   the terminal success dwell. Failed rows remain actionable for retry.
6. Update the `VirtualRow` memo comparator so phase or operation changes repaint
   a row even when the server row object is unchanged.
7. Add reduced-motion behavior: retain the status dwell, but remove nonessential
   fade/slide animation when `prefers-reduced-motion` is set.

Validation: focused core tests must prove sticky and ordinary cells share the
same tone, pending rows cannot double-submit, activity updates rerender, and
tables without the prop are unchanged.

### Phase 3 - Implement Filtered-Row Retention Without Changing Cache Truth

1. Add a reusable table-local composition hook, likely
   `useTableRowsWithActivity`, that receives authoritative query rows, the
   table/view scope key, and entity/row-key selectors.
2. While a row is processing, capture its current row value and original visual
   index in memory.
3. After normal query invalidation/refetch:
   - if the row remains in the authoritative result, render the new server row
     with its terminal tone and then return it to normal;
   - if the row is absent and has a qualifying successful activity, render the
     captured snapshot at its prior index for the success dwell, fade it, then
     remove it from the composed UI list;
   - if the action fails, use the authoritative row and never synthesize a
     successful departure;
   - if a row disappears without a known activity, remove it normally.
4. Clear retained snapshots immediately on route/view/filter/sort scope change,
   logout, table unmount, or reload. Retained snapshots must never carry into a
   different saved tab or search.
5. Keep counts and summaries server-authoritative. The list may temporarily show
   one green retained row while the refreshed summary and saved-tab badge
   already reflect the committed result.
6. Remove affected row UUIDs from selection at terminal success so the batch
   bar cannot retain invisible or completed selections. Preserve unrelated
   selections.
7. Avoid exit-height animation inside the virtualizer. Recommendation: retain
   at the original index, show the green dwell, fade opacity over 200-250ms, then
   remove the snapshot and let the virtualizer reposition rows once.

Validation: test row-stays, row-leaves, no-activity disappearance, scope change,
selection cleanup, multiple simultaneous departures, pagination, and a row near
the virtual viewport boundary.

### Phase 4 - Bridge Direct TanStack Mutations

1. Extend the registered React Query mutation metadata with an optional typed
   `rowActivity` descriptor containing table id, affected entity ids, labels,
   and retention policy.
2. Update the global `MutationCache` lifecycle:
   - `onMutate`: begin row activity before the request;
   - `onSuccess`: mark committed success, run/await the existing query-event
     invalidation, then start the terminal dwell;
   - `onError`: mark failure and preserve the authoritative row;
   - cleanup must run even if presentation/toast code fails.
3. Preserve ADR-013: query events remain the only owner of cache invalidation.
   Row activity metadata owns presentation only and must not add direct raw
   query-key invalidation.
4. Add metadata at Sales Orders call sites that can change current membership,
   starting with payment review and table-launched payment/status actions.
5. When a direct action is launched from a sheet over the table, pass the same
   Sales Orders activity descriptor if the table context is active; otherwise
   allow the normal invalidation without creating a retained ghost.

Validation: an integration test must prove the sequence `amber -> committed
green -> query-event refetch -> retained green if absent -> cleared`, plus the
error sequence `amber -> red -> authoritative row remains`.

### Phase 5 - Bridge Background Sales Tasks

1. Reuse the existing persisted `TaskMonitorIntent`; do not create a second job
   monitor or poller.
2. Add a row-activity adapter for the three existing sales task intents:
   - `sales.mark-as-production-completed`;
   - `sales.mark-as-fulfilled`;
   - `sales.cancel-production-completion`.
3. Start local amber feedback as soon as the operator confirms the action. When
   Trigger returns a run id, associate the row activity with that monitored run.
4. Extend `useTaskTrigger` callback context only as needed so a start failure can
   fail the exact queued row activities, including multi-row actions.
5. Map task monitor states:
   - `SYNCING` -> processing;
   - `COMPLETED` -> success before/while the existing terminal query event
     refetches;
   - `FAILED` -> error;
   - `CANCELED` -> canceled.
6. Preserve reload resilience: the task monitor remains authoritative for a
   running job. If the filtered server row is still present after reload, the
   table can reconstruct the amber state from the stored task intent. Do not
   persist full row snapshots merely to show an exit after reload.
7. Ensure task-monitor removal clears its activity only after the terminal row
   feedback window has elapsed.

Validation: focused tests must cover task start failure, completion, job output
failure, cancellation, realtime-token reconciliation, component unmount, batch
tasks, and exactly-once terminal invalidation/effect handling.

### Phase 6 - Sales Orders Pilot Integration

1. Compose authoritative `sales.getOrders` pages with activity-retained rows in
   `components/tables-2/sales-orders/data-table.tsx` before creating the TanStack
   Table row model.
2. Use numeric sales id for activity matching and row UUID for TanStack selection
   cleanup.
3. Combine activity tone with the existing inbound-row class deliberately;
   active processing/success/error wins, then the existing inbound tone returns.
4. In the Sales Orders Status cell, temporarily show an icon and accessible
   action label such as:
   - `Fulfilling...` / `Fulfilled` / `Fulfillment failed`;
   - `Completing production...` / `Production completed`;
   - `Reviewing payment...` / `Payment reviewed`;
   - `Recording payment...` / `Payment recorded`.
5. Keep existing toasts and the bottom-right task monitor. They provide textual
   status when the Status column is hidden or outside the horizontal viewport.
6. Prevent duplicate row and batch actions while processing. On batch success,
   each row resolves independently so partial failures produce green and red
   rows in the same result.
7. Pilot the behavior on payment review and fulfillment first. Add payment
   recording, production, delete, and inbound actions only after the first two
   pass operator acceptance.

Decision gate: do not roll this into other tables until the operator approves
the Sales Orders timing, color strength, labels, and row-removal feel.

### Phase 7 - Automated Validation

1. Add pure unit tests for the activity state machine and retained-row composer.
2. Add `VirtualRow` rendering tests for tone precedence, sticky cells, disabled
   interaction, accessibility attributes, and reduced motion.
3. Extend query-client/mutation-event tests to prove row activity never changes
   event selection, query targets, or invalidation ordering.
4. Extend task-monitor tests to prove activity follows existing intent and
   exactly-once handled-effect semantics.
5. Extend Sales Orders tests for:
   - filtered-out after payment review;
   - filtered-out after fulfillment;
   - successful action whose row remains;
   - direct mutation error;
   - background task failure;
   - mixed batch success/failure;
   - retained row selection cleanup;
   - route/filter change during processing.
6. Run focused tests, focused Biome, scoped typecheck scans, and
   `git diff --check`. Run the broad dashboard typecheck only in accordance with
   the repository's known baseline and report unrelated failures separately.

### Phase 8 - Authenticated Browser Acceptance

1. Use a safe local fixture and an active filter that will definitely exclude
   the row after the selected action.
2. Verify desktop and `390x844` mobile behavior:
   - amber appears immediately and the action cannot be submitted twice;
   - success turns green and remains understandable long enough to register;
   - the row leaves after the dwell without a blank gap, jump-back, or stale
     selection/batch bar;
   - failure turns red, stays in the list, and remains retryable;
   - sticky columns and dark mode show the same state;
   - hidden Status column still has toast/task-monitor textual feedback;
   - saved-tab counts and summaries update immediately from server truth;
   - changing filters/navigation clears transient retained rows;
   - reduced-motion mode avoids nonessential animation.
3. Check for console errors, document-level overflow, query loops, repeated
   invalidations, and virtualizer measurement warnings.
4. Restore any mutable fixture data after proof.

Acceptance gate: the operator explicitly approves the feedback duration and
visual strength before rollout beyond Sales Orders.

### Phase 9 - Rollout And Documentation

1. Document the final row activity contract under the Sales Orders feature doc
   and, if reused by multiple domains, add a dedicated shared table-row activity
   feature doc.
2. Update the query invalidation feature doc to state that presentation feedback
   observes mutation/task lifecycle but does not own invalidation.
3. Add an ADR only if the reusable metadata/store contract becomes a durable
   cross-table architecture boundary. A Sales Orders-only pilot does not require
   an ADR.
4. Roll out table by table, prioritizing filtered operational queues where a
   successful action commonly removes rows. Each table must define stable entity
   identity, labels, departure-causing actions, and browser acceptance fixtures.
5. Do not enable a global default for every mutation or every `tables-2` row.
   Adoption remains opt-in until performance and interaction behavior are proven.

## Skills List Used

- `plan` - produced an implementation-ready phased plan aligned with the current
  Sales Orders, task-monitor, virtual-table, and centralized invalidation design.

## Risks And Mitigations

- **Stale ghost rows appear as real data.** Keep snapshots presentation-only,
  visually terminal, noninteractive, short-lived, and scoped to the exact
  filter/sort view; never write them into TanStack Query cache.
- **Invalidation is delayed to preserve animation.** Never delay or suppress
  ADR-013 query events. Refresh server truth immediately and retain only the
  table-local snapshot.
- **Background task state is lost when menus unmount.** Reuse persisted task
  monitor intents and terminal handled-effect semantics.
- **Direct mutations resolve after invalidation has removed the row.** Capture
  the snapshot at `onMutate`/processing time and mark success at the global
  mutation boundary before awaiting query-event refresh.
- **Virtualized exit animation causes layout jumps.** Avoid animated height;
  dwell and fade the retained row, then remove it once and let the virtualizer
  recalculate.
- **Sticky cells ignore the row background.** Apply activity tone to cells via
  row data attributes and test sticky/non-sticky parity.
- **Color-only meaning is inaccessible.** Pair tones with spinner/check/error
  icons, status labels, `aria-busy`, and existing toast/task-monitor copy.
- **Batch actions produce misleading all-or-nothing feedback.** Track each row
  independently and display partial successes/failures accurately.
- **Selection allows duplicate processing.** Remove only terminal affected rows
  from selection and disable controls during processing/success dwell.
- **Old task completion overwrites a newer retry.** Guard every transition by
  operation id and use latest-operation-wins semantics.
- **Scope expands into a broad table-core rewrite.** Keep core support opt-in and
  small; prove Sales Orders first, then reuse the contract incrementally.

## Completion Criteria

- Payment review and fulfillment demonstrate amber processing, green committed
  success, red failure, and delayed presentation-only departure under an active
  membership-changing filter.
- Query invalidation, summaries, saved-tab counts, permissions, and server
  business behavior remain unchanged.
- Direct mutations and monitored tasks share the same visible state semantics.
- No stale retained row survives navigation, filter changes, logout, unmount, or
  reload.
- Focused automated tests, desktop/mobile authenticated browser proof, dark
  mode, reduced motion, and operator timing approval are recorded before wider
  rollout.
