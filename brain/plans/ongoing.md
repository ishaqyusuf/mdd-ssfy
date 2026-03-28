## Install Cost Sorting Rollout
- Status: Ready
- Objective: Implement server-authoritative install-cost sorting by `builderTask.taskIndex` with `builderTask.createdAt` fallback across web admin and jobs flows on web and Expo.
- Current Phase: Planning complete
- Next Step: Update `community.getModelInstallTasksByBuilderTask` and `community.getJobForm` to fetch builder-task sort metadata and return sorted install-cost arrays.
- Blockers: None
- Related Files: brain/features/install-cost-sorting.md, apps/api/src/trpc/routers/community.route.ts, apps/api/src/db/queries/jobs.ts, apps/www/src/hooks/use-model-install-config.ts, apps/www/src/components/modals/new-job/install-tasks-list.tsx, apps/expo-app/src/components/forms/job-v2/install-cost-form.tsx, apps/expo-app/src/hooks/use-job-form-v2.tsx
- Last Updated: 2026-03-28

### Plan
1. Add canonical server-side install-cost sorting using `builderTask.taskIndex`, then `builderTask.createdAt`, then stable tie-breakers.
2. Apply the sorted output to `community.getModelInstallTasksByBuilderTask` and `community.getJobForm`.
3. Audit web admin, web jobs form, and Expo/mobile jobs form consumers to preserve server order without local reshuffling.
4. Add focused validation for mixed `taskIndex` and fallback scenarios and update Brain progress/tasks as implementation lands.

### Resume Prompt
Continue the install-cost sorting feature from the latest state. Current phase is Planning complete, and the next step is to update `community.getModelInstallTasksByBuilderTask` and `community.getJobForm` to fetch builder-task sort metadata and return sorted install-cost arrays using `builderTask.taskIndex` with `builderTask.createdAt` fallback. Then audit the related web admin, web jobs form, and Expo/mobile consumers in `apps/www/src/hooks/use-model-install-config.ts`, `apps/www/src/components/modals/new-job/install-tasks-list.tsx`, `apps/expo-app/src/components/forms/job-v2/install-cost-form.tsx`, and `apps/expo-app/src/hooks/use-job-form-v2.tsx` to preserve that order, add validation, and keep `brain/plans/ongoing.md` updated as progress continues.
