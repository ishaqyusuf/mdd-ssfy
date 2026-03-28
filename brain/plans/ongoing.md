## Install Cost Sorting Rollout
- Status: In Progress
- Objective: Implement server-authoritative install-cost sorting by `builderTask.taskIndex` with `builderTask.createdAt` fallback across web admin and jobs flows on web and Expo.
- Current Phase: Server-side implementation complete
- Next Step: Manual verification on web admin install-cost sidebar, web jobs form, and Expo/mobile install-cost step.
- Blockers: None
- Related Files: brain/features/install-cost-sorting.md, apps/api/src/trpc/routers/community.route.ts, apps/api/src/utils/install-cost-sort.ts, apps/api/src/utils/install-cost-sort.test.ts, apps/www/src/hooks/use-model-install-config.ts, apps/www/src/components/modals/new-job/install-tasks-list.tsx, apps/expo-app/src/components/forms/job-v2/install-cost-form.tsx, apps/expo-app/src/hooks/use-job-form-v2.tsx
- Last Updated: 2026-03-28

### Completed Steps
1. Created `apps/api/src/utils/install-cost-sort.ts` with shared `sortInstallCosts` and `sortBuilderTasks` helpers.
2. Created `apps/api/src/utils/install-cost-sort.test.ts` with 17 passing tests covering all comparator scenarios.
3. Updated `community.getModelBuilderTasks` to include `taskIndex`/`createdAt` in builder-task select and sort builder tasks by `taskIndex → createdAt → id`.
4. Updated `community.getModelInstallTasksByBuilderTask` to fetch `builderTask.taskIndex/createdAt/id` per cost row and sort using `sortInstallCosts`.
5. Updated `community.getJobForm` to include `id/taskIndex/createdAt` in `builderTask` select and sort `builderTaskInstallCosts` via `sortInstallCosts` before mapping to `job.tasks`.
6. Audited all consumers — no local resorting applied in any file; server-authoritative order is preserved end-to-end.

### Plan
1. ✅ Add canonical server-side install-cost sorting using `builderTask.taskIndex`, then `builderTask.createdAt`, then stable tie-breakers.
2. ✅ Apply the sorted output to `community.getModelInstallTasksByBuilderTask` and `community.getJobForm`.
3. ✅ Audit web admin, web jobs form, and Expo/mobile jobs form consumers to preserve server order without local reshuffling.
4. ✅ Add focused validation for mixed `taskIndex` and fallback scenarios.
5. ✅ Update Brain progress/tasks as implementation lands.
