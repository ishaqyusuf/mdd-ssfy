# Job Form V2 Implementation Plan

Status key: `[ ]` pending, `[-]` in progress, `[x]` done

## Scope Guardrails
- Build a standalone Expo job form system inspired by web new-job flow.
- Keep old job form code untouched except switch point in `job-form-screen.tsx`.
- V2 public props must be `admin` and `action` only.
- Use a single route entry at `apps/expo-app/src/app/job-form`.
- Use query params for step and mode state; no per-flow route file migration.
- Replace `controlId` references with `jobId` query param where needed.
- Add shared navigation helpers in `apps/expo-app/src/lib/job.ts` to branch old/new flows.
- Add a new overview implementation (`job-overview-v2-screen`) with bespoke UI.
- Use a bespoke UI design for V2 (do not reuse old job-form design components).

## Task Checklist

### 1) Params and state model
- [x] Create `apps/expo-app/src/hooks/use-job-form-v2-params.ts`
- [x] Mirror web `useJobFormParams` API (`setParams(partial|null)`) using `expo-router`
- [x] Normalize numeric params: `step`, `redirectStep`, `projectId`, `jobId`, `unitId`, `taskId`, `userId`, `modelId`
- [x] Add helpers for parse/serialize and null-clearing behavior

### 2) Standalone form context/hook
- [x] Create `apps/expo-app/src/hooks/use-job-form-v2.tsx`
- [x] Define V2 props type with only `admin` + `action`
- [x] Build independent context provider + `useJobFormV2Context`
- [x] Implement query/mutation orchestration for users/projects/tasks/units/job settings
- [x] Implement selection handlers and step progression/back navigation
- [x] Implement totals/derived values and submit flow

### 3) New bespoke V2 UI system
- [x] Create `apps/expo-app/src/components/forms/job-v2/job-v2-shell.tsx`
- [x] Create `apps/expo-app/src/components/forms/job-v2/job-v2-header.tsx`
- [x] Create `apps/expo-app/src/components/forms/job-v2/job-v2-footer.tsx`
- [x] Create `apps/expo-app/src/components/forms/job-v2/ui/` primitives for V2-only look
- [x] Create step components under `apps/expo-app/src/components/forms/job-v2/steps/`
- [x] Ensure visual style is intentionally different from old `components/forms/job/*`

### 4) V2 screen and integration
- [x] Create `apps/expo-app/src/screens/job-form-v2-screen.tsx`
- [x] Integrate V2 provider + params + step renderer
- [x] Create or wire `apps/expo-app/src/app/job-form` as the single entry route
- [x] Update `apps/expo-app/src/screens/job-form-screen.tsx`
- [x] Comment out old return path and return `<JobFormV2Screen {...props} />`

### 5) Query-driven mode handling
- [x] Define query contract for flow mode (`action`, `admin`) and identifiers (`jobId`)
- [x] Ensure `job-form-screen.tsx` derives v2 props from query state
- [x] Remove any residual `controlId` reads in V2 flow
- [x] Confirm create/submit/re-assign all work under `/job-form` route

### 6) Shared navigation helpers in `lib/job.ts`
- [x] Expand `apps/expo-app/src/lib/job.ts` with `editJob(job: Job)` and `openJob(job: Job)`
- [x] `editJob(job)`: if `job.controlId` exists, route to old form flow; else open new `/job-form` with query params
- [x] `openJob(job)`: if `job.controlId` exists, open old overview route; else open V2 overview screen route
- [x] Add a minimal `Job` type adapter (or imported type) for helper safety
- [x] Update current callers to use helpers (e.g. footer/actions/list items)

### 7) Job Overview V2 plan (web parity target)
- [x] Create `apps/expo-app/src/screens/job-overview-v2-screen.tsx`
- [x] Add V2 overview component folder `apps/expo-app/src/components/job-overview-v2/`
- [x] Mirror key web overview sections from `apps/www/src/components/modals/job-overview/index.tsx`:
- [x] Status + header metadata (job title, created date, status badges)
- [x] Core info cards (project/builder, unit/location, assigned contractor)
- [x] Scope/tasks + financial summary blocks
- [x] Activity history section integration
- [x] Payment details panel and conditional actions (v2 equivalent)
- [x] Keep V2 design bespoke (not reusing old Expo overview visual components)
- [x] Add route entry for V2 overview screen and wire through `openJob(job)`

### 8) Validation and hardening
- [x] Run typecheck/lint for Expo app scope
- [ ] Verify create/assign/submit/re-assign flows
- [ ] Verify `editJob` and `openJob` branching for controlId vs non-controlId jobs
- [ ] Verify old form/overview flows remain reachable for legacy jobs
- [ ] Verify new overview route opens for non-controlId jobs
- [ ] Confirm params-driven step transitions and back behavior
- [ ] Update this `plan.md` with completion marks and notes

### 9) Job Overview V2 Action Forms (web parity)
- [x] Add `Submitted` action form in V2 overview (approve/reject with note; rejection requires note)
- [x] Add `Approved` action form in V2 overview (cancel approval + reject)
- [x] Add `Rejected` action form in V2 overview (approve + keep rejected with note)
- [x] Reuse `jobs.jobReview` mutation behavior and invalidate both overview + jobs list queries
- [x] Preserve pending/loading states and disable invalid actions
- [x] Add success/error toast parity for all action outcomes

### 10) Web-to-Mobile Information Parity Matrix
- [x] Header parity: title, subtitle, status badges, `job.jobId`, created date
- [x] Project/Builder parity: project title + builder name
- [x] Location parity: model + lot/block
- [x] Scope parity: description + itemized tasks (`rate`, `qty/maxQty`, `total`) and custom-job fallback copy
- [x] Financial parity: subtotal, addon percent/value, grand total
- [x] Payment parity: batch id, amount, subtotal, charges, method, check no, assigned user, payer, created date, jobs in batch
- [x] Activity parity: timeline events using real activity data for job id
- [x] Contractor parity: assigned contractor identity block
- [x] Action parity: status-dependent review actions
- [ ] Add explicit “missing-on-mobile” checklist and close each item before rollout

## Risks / Watchouts
- Existing flow callers may still push old route patterns; navigation must converge on `/job-form`.
- Query shape differences between web and Expo TRPC clients may require minor adapter logic.
- Submit/re-assign semantics must stay backend-compatible after `jobId` query migration.
- Mixed legacy/new jobs require strict branching to avoid broken navigation targets.
- Helper functions should avoid direct hook usage so they can be called from components predictably.
- Current mobile overview uses `jobs.getJobs` while web overview uses `jobs.overview`; parity work should standardize on the richer payload.
- Payment overview data requires a modal/sheet and extra query (`jobs.paymentOverview`) currently not wired in V2 overview.

## Progress Log
- [x] Initial plan file created.
- [x] Implementation started.
- [x] Params hook + standalone V2 form hook/context baseline completed.
- [x] Bespoke V2 UI + screen wiring completed with single `/job-form` route entry.
- [x] Shared `lib/job` navigation helpers added and integrated in core callers.
- [x] New `job-overview-v2` route and screen scaffolded with web-inspired sections.
- [x] Scoped TypeScript pass run for newly changed files (global repo has existing unrelated TS errors).
- [x] New Job Form V2 visual layer migrated to semantic theme tokens (no hardcoded color classes).
- [x] Job Overview V2 migrated to `jobs.overview` with web-style action forms and payment details.
- [x] Legacy create/submit/assign/re-assign route files now redirect to `/job-form` V2 entrypoint.
- [x] Added reusable loading skeleton and empty-state UI across all Job Form V2 steps.
