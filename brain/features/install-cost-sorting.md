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
1. Server query updates
- Update `community.getModelInstallTasksByBuilderTask` so the fetched install-cost rows are ordered by the related builder task metadata, not incidental insertion order.
- Extend the query shape to include `builderTask.taskIndex` and `builderTask.createdAt` wherever needed for sorting.
- If Prisma nested ordering is awkward for the current shape, fetch the needed metadata and apply a shared server-side comparator before returning the final `tasks` array.

2. Job form payload updates
- Update `community.getJobForm` so `builderTask.builderTaskInstallCosts` are returned in builder-task order before the payload is mapped to `job.tasks`.
- Ensure the mapped `job.tasks` array remains ordered and is not reconstructed from unordered objects later in the flow.
- Keep payload compatibility so existing web and Expo form code can consume the sorted array without contract-breaking changes.

3. Shared sorting helper
- Prefer a small helper in the API layer for install-cost sorting to avoid reimplementing comparator logic in multiple procedures.
- Comparator order:
- `taskIndex` ascending when present
- `createdAt` ascending when `taskIndex` is absent
- stable tie-breaker using `builderTask.id`
- optional final tie-breaker using `installCostModel.title` or `installCostModel.id`

4. Web admin verification
- Confirm the template/sidebar install-cost editor renders `modelData.tasks` in API order with no local reshuffle.
- Confirm add/remove/update actions preserve the ordered render after query invalidation and refetch.

5. Web jobs form verification
- Confirm `defaultValues.job.tasks` arrives already sorted from `community.getJobForm`.
- Confirm the install-cost table in `install-tasks-list.tsx` renders the array as-is.

6. Expo/mobile verification
- Confirm `install-cost-form.tsx` renders `installData.tasks` in server order.
- Confirm `use-job-form-v2.tsx` preserves `defaultValues.job.tasks` order during form reset.
- Review older Expo job-form flows still tied to `jobs.getInstallCosts`; document whether they remain legacy/out of scope or need migration to relational install-cost data.

7. Validation
- Add focused tests around:
- all tasks having `taskIndex`
- mixed `taskIndex` and null values
- all rows falling back to `createdAt`
- stable output when tie-breakers are needed
- Run manual verification on:
- web admin install-cost sidebar
- web jobs form install-cost list
- Expo/mobile install-cost step

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
