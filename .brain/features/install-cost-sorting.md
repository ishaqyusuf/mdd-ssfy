# Install Cost Sorting

## Goal
Standardize install-cost ordering across admin and jobs flows so install cost rows always follow the builder task sequence. The canonical sort key is `builderTask.taskIndex`, with `builderTask.createdAt` as the fallback when `taskIndex` is missing. This should apply consistently in web admin, web jobs form, and Expo/mobile jobs form.

## Scope
- In scope
- Server-authoritative sorting for relational install-cost queries
- `community.getModelInstallTasksByBuilderTask` sorting updates
- `community.getJobForm` sorting updates for `job.tasks`
- Web admin install-cost sidebar/template editor alignment
- Web jobs form alignment
- Expo/mobile jobs form alignment
- Focused validation for mixed `taskIndex` and fallback scenarios

- Out of scope
- Reordering legacy `install-price-chart` settings payloads that do not carry `builderTask` relations
- Changing install-cost totals, rate calculations, or mutation semantics
- Introducing manual drag-and-drop sorting UI

## Flow
1. Entry
- Install-cost data is fetched from relational builder-task backed queries.
- The API loads each install cost row with access to `builderTask.taskIndex` and `builderTask.createdAt`.

2. Main actions
- The server sorts install-cost rows by `builderTask.taskIndex` ascending.
- If `builderTask.taskIndex` is null or unavailable, the server falls back to `builderTask.createdAt` ascending.
- A stable tertiary tie-breaker is applied to avoid nondeterministic order, preferably `builderTask.id` then `installCostModel.title` or `installCostModel.id`.
- Sorted rows are returned to all consumers without platform-specific client sorting.

3. Success/failure outcomes
- Success: web admin, web jobs form, and Expo/mobile render the same install-cost order.
- Success: older rows without `taskIndex` still sort predictably via `createdAt`.
- Failure: if a query cannot access `builderTask` metadata, it must either remain explicitly out of scope or be migrated before claiming parity.

## Data Model
- Key entities
- `BuilderTask`
- `BuilderTaskInstallCost`
- `CommunityModelInstallTask`
- `InstallCostModel`
- `Jobs`
- `JobInstallTask`

- Important fields
- `BuilderTask.id`
- `BuilderTask.taskIndex`
- `BuilderTask.createdAt`
- `BuilderTaskInstallCost.builderTaskId`
- `BuilderTaskInstallCost.installCostModelId`
- `CommunityModelInstallTask.communityModelId`
- `InstallCostModel.id`
- `InstallCostModel.title`
- `JobInstallTask.communityModelInstallTaskId`

## APIs
- Primary procedures
- `apps/api/src/trpc/routers/community.route.ts`
- `community.getModelInstallTasksByBuilderTask`
- `community.getJobForm`

- Related query sources to audit
- `apps/api/src/db/queries/jobs.ts`
- `jobs.getInstallCosts`

- Supporting consumers
- `apps/www/src/hooks/use-model-install-config.ts`
- `apps/expo-app/src/hooks/use-job-form-v2.tsx`

## UI
- Web admin
- `apps/www/src/components/forms/community-template-v1/install-cost-resizable-panel.tsx`
- `apps/www/src/components/modals/model-install-cost-modal/install-configuration.tsx`
- `apps/www/src/components/modals/model-install-cost-modal/add-new-install-cost.tsx`

- Web jobs form
- `apps/www/src/components/modals/new-job/install-tasks-list.tsx`

- Expo/mobile jobs form
- `apps/expo-app/src/components/forms/job-v2/install-cost-form.tsx`
- `apps/expo-app/src/hooks/use-job-form-v2.tsx`

## Detailed Implementation
1. ✅ Server query updates
- Updated `community.getModelInstallTasksByBuilderTask` to include `builderTask.taskIndex/createdAt/id` per cost row and sort using shared `sortInstallCosts` helper.
- Updated `community.getModelBuilderTasks` to include `taskIndex/createdAt` in builder-task select and sort via `sortBuilderTasks`.
- Shared helper in `apps/api/src/utils/install-cost-sort.ts` uses JS-side sort (not Prisma `orderBy`) per spec guidance for awkward nested ordering.

2. ✅ Job form payload updates
- Updated `community.getJobForm` to include `id/taskIndex/createdAt` in `builderTask` select.
- Sorted `builderTask.builderTaskInstallCosts` using `sortInstallCosts` before mapping to `job.tasks`.
- Payload shape is unchanged; existing web and Expo code is fully compatible.

3. ✅ Shared sorting helper (`apps/api/src/utils/install-cost-sort.ts`)
- `sortInstallCosts`: sorts items with `builderTask.{id,taskIndex,createdAt}` and `installCostModel.{id,title}` by taskIndex → createdAt → builderTask.id → installCostModel.title → installCostModel.id.
- `sortBuilderTasks`: sorts builder tasks by taskIndex → createdAt → id.
- 17 unit tests covering all comparator scenarios.

4. ✅ Web admin verification
- `use-model-install-config.ts` renders `modelData.tasks` from server with no local reshuffle confirmed.
- `install-configuration.tsx` iterates `tasks` directly from context (server order preserved).

5. ✅ Web jobs form verification
- `install-tasks-list.tsx` renders `defaultValues.job.tasks` as-is (no local sort).
- Server now guarantees sorted order from `community.getJobForm`.

6. ✅ Expo/mobile verification
- `install-cost-form.tsx` uses `useMemo` on `installData.tasks` with no sort applied.
- `use-job-form-v2.tsx` resets form with `defaultValues.job.tasks` in server order.
- Legacy `jobs.getInstallCosts` flow is documented as out of scope (no builderTask relation).

7. ✅ Validation
- Tests added for: all tasks having `taskIndex`, mixed `taskIndex`/null, all falling back to `createdAt`, stable tie-breaker via title/id.
- Manual verification pending (web admin, web jobs form, Expo mobile).

## Edge Cases
- Legacy install-cost payloads may not have a `builderTask` relation and therefore cannot sort by `taskIndex`.
- Null `taskIndex` values must not cause random order changes between requests.
- Equal `createdAt` timestamps need a deterministic tie-breaker.
- Query invalidation after install-cost mutations must preserve order after refetch.
- Client code using object maps for draft state must not accidentally drive render order.

## Follow Up
- Migrate legacy install-cost chart consumers onto relational install-cost model queries where feasible.
- Expose builder-task ordering metadata in shared contracts if future UI needs visible sort diagnostics.
- Add regression tests for install-cost ordering to future builder-task schema changes.
