# Feature Plan: Web Bug Reporting Workflow

## Status

In Progress

## Intake

- `brain/intake/2026-07-07-web-bug-reporting-workflow.md`

## Tracker

- Spec: `brain/plans/2026-07-10-spec-web-bug-reporting-workflow.md`
- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/40
- Triage Label: `ready-for-agent`

## Objective

Build a web-first bug reporting workflow inside the existing GND office web app. Enabled employees should be able to record the screen with optional microphone narration, submit bug reports, view their own submissions, track status, and add follow-ups. Super Admin users should be able to enable or disable this feature per employee and manage all submitted issues.

## Why This Matters

The client uses GND as an operational system for inventory, sales, customer service, work orders, community projects, and other office workflows. When employees hit issues, they need a fast way to show exactly what happened without writing long explanations. Recording the issue from inside the web app gives the development/admin team clearer evidence, shorter debugging loops, and a managed internal issue board.

## Scope

### In Scope

- Header bug report button in the web app.
- Visibility controlled by per-employee access granted by Super Admin.
- Super Admin employee-row action to enable or disable bug reporting access.
- Web recorder dialog/sheet with microphone toggle and start/stop/preview/submit states.
- Browser screen recording with optional microphone audio.
- Vercel Blob upload for submitted videos.
- Database records for bug reports, status, submitter, metadata, and follow-up messages.
- Employee issue board showing only that employee's reports.
- Super Admin issue board showing all reports with status management.
- Permission checks across UI and API.
- Brain/API/database documentation updates during implementation.

### Out Of Scope For V1

- Tauri desktop packaging and native desktop capture.
- External tracker integrations such as Jira, Linear, GitHub Issues, or Slack.
- Realtime notifications, email notifications, and SLA dashboards.
- Automated transcription or AI summarization of videos.
- Screenshot capture.

## Implementation Started 2026-07-08

Implemented the first web-only slice with:

- Prisma models in `packages/db/src/schema/bug-reports.prisma`.
- tRPC router in `apps/api/src/trpc/routers/bug-reports.route.ts`.
- API/query implementation in `apps/api/src/db/queries/bug-reports.ts`.
- Zod schemas in `apps/api/src/schemas/bug-reports.ts`.
- Permission scope updates in `packages/utils/src/constants.ts`.
- Super Admin employee access toggle through `apps/api/src/db/queries/hrm.ts`, `apps/api/src/trpc/routers/hrm.route.ts`, and `apps/www/src/components/tables/employees/columns.tsx`.
- Header recorder button in `apps/www/src/components/bug-reports/bug-report-button.tsx`.
- Server-mediated Vercel Blob client upload authorization in `apps/www/src/app/api/bug-reports/upload/route.ts`.
- Issue board in `apps/www/src/components/bug-reports/bug-report-workspace.tsx` at `/support/bug-reports`.

Validation status:

- `bun run db:generate` completed.
- `TURBO_UI=true bun run db:migrate` reached Prisma but local MySQL at `127.0.0.1:3307` was unavailable.
- `TURBO_UI=true bun run db:push` reached Prisma but the configured remote push target `aws.connect.psdb.cloud:3306` was unavailable from this environment.
- The database schema still needs to be applied in the intended database environment before production/runtime use.

## Proposed User Experience

### Employee Reporting Flow

1. Employee logs into the GND web app.
2. If the employee has the bug reporting permission, a bug icon appears in the top-right header.
3. Clicking the icon opens a compact report dialog or sheet.
4. The employee can enable or disable microphone recording.
5. The employee clicks Start.
6. The browser prompts the employee to choose what to share, ideally the current tab/window where GND is open.
7. Recording begins, and the employee demonstrates the issue while narrating.
8. The employee stops the recording and sees a preview.
9. The employee optionally adds a description and submits.
10. The video uploads to Vercel Blob and the bug report record is saved.
11. The employee can open their submissions board to see status and add follow-ups.

### Super Admin Enable/Disable Flow

1. Super Admin opens the Employees page.
2. Each employee row action menu includes `Enable Bug Reports` or `Disable Bug Reports`.
3. Enabling grants the employee-specific bug reporting permission.
4. Disabling removes the permission.
5. The employee sees the header bug button only when the permission is active after login/session refresh.

### Super Admin Issue Management Flow

1. Super Admin opens the issue board.
2. Super Admin sees all bug reports across employees.
3. Super Admin can filter by status, employee, and date.
4. Super Admin can view the recording, read description/follow-ups, and update status.
5. Status changes are visible to the submitting employee.

## Recommended Technology Stack

### Web Capture

- Browser APIs:
  - `navigator.mediaDevices.getDisplayMedia()` for screen/tab/window capture.
  - `navigator.mediaDevices.getUserMedia()` for microphone capture.
  - `MediaRecorder` for encoding the combined stream.
- Initial output format:
  - Prefer `video/webm` where supported.
  - Capture browser compatibility in implementation testing.
- React state machine:
  - Idle, permission prompt, recording, stopped, preview, uploading, submitted, error.

### Storage

- Vercel Blob for video files.
- Existing Vercel Blob SDK/provider path where available in the document storage abstraction.
- Private Blob store for submitted recordings.
- Client uploads with server-issued authorization so large video blobs do not pass through tRPC JSON/base64 bodies.
- Authenticated read/playback through permission-checked server routes.

### Backend/API

- Existing tRPC API style.
- New `bugReports` router or equivalent feature router.
- HRM mutation for Super Admin employee access toggle.
- Zod validation for create/update/follow-up inputs.
- Database transactions for report creation and document linking.

### Database

- Prisma schema changes in `packages/db/src/schema`.
- Suggested models:
  - `BugReport`
  - `BugReportFollowUp`
  - Optional enum `BugReportStatus`
- Existing `StoredDocument` can hold Vercel Blob metadata for the recording, either by linking from `BugReport.recordingDocumentId` or by using `ownerType = "bug_report"` and `ownerId = bugReport.id`.

### Permissions

- Add a new extra permission scope, suggested name: `submitBugReport`.
- Add a normalizable employee-specific permission name, suggested display/name value: `submit bug report`.
- Super Admin receives this scope automatically through the existing role behavior.
- Non-Super Admin employees only receive it when granted specifically.

### UI Components

- Existing app header for the bug button.
- Existing employee table row action menu for Super Admin access toggle.
- Existing table/dialog/sheet patterns for issue board and report detail views.
- Existing toast/loading/error conventions.

## Data Model Draft

### BugReport

- `id`
- `createdById`
- `status`
- `description`
- `currentUrl`
- `userAgent`
- `source` default `web`
- `recordingDocumentId`
- `durationMs`
- `microphoneEnabled`
- `createdAt`
- `updatedAt`
- `deletedAt`

Suggested statuses:

- `new`
- `in_review`
- `in_progress`
- `needs_info`
- `fixed`
- `closed`

## Recommended Status Model

- `new`: submitted and not yet reviewed by Super Admin.
- `in_review`: Super Admin is reviewing or reproducing the issue.
- `in_progress`: the issue has been accepted and is actively being worked on.
- `needs_info`: the team needs more details from the submitting employee.
- `fixed`: a fix or operational resolution has been completed and is waiting for confirmation or final review.
- `closed`: no further action is needed. This can cover confirmed fixed, duplicate, not reproducible, or intentionally not changed cases.

This keeps the board simple for office staff while still giving Super Admin enough signal to manage real support flow. If the team later needs finer reporting, add a separate `resolution` field for `duplicate`, `not_reproducible`, or `wont_fix` instead of turning every resolution reason into a status.

### BugReportFollowUp

- `id`
- `bugReportId`
- `authorId`
- `body`
- `createdAt`
- `updatedAt`
- `deletedAt`

### StoredDocument Usage

- `kind`: `bug_report_recording`
- `ownerType`: `bug_report`
- `ownerId`: bug report id
- `provider`: `vercel-blob`
- `pathname`: blob object key
- `url`: optional internal/provider URL, not necessarily public
- `mimeType`: `video/webm`
- `size`: uploaded byte size
- `uploadedBy`: submitting employee id
- `meta`: duration, original filename, browser details, upload id

## API Draft

### Employee/User APIs

- `bugReports.createUpload`
  - Requires `submitBugReport`.
  - Creates a pending upload path and Vercel Blob client upload authorization.

- `bugReports.create`
  - Requires `submitBugReport`.
  - Creates the database report after upload completes.
  - Links the uploaded video document.

- `bugReports.mine`
  - Requires authenticated user.
  - Returns reports created by the current user.

- `bugReports.byId`
  - Allows owner or Super Admin.
  - Returns report detail, document playback token/url, and follow-ups.

- `bugReports.addFollowUp`
  - Allows owner or Super Admin.
  - Adds a message to the report.

### Super Admin APIs

- `bugReports.adminList`
  - Requires Super Admin.
  - Returns all reports with filters.

- `bugReports.updateStatus`
  - Requires Super Admin.
  - Updates report status.

- `hrm.setEmployeeBugReportingAccess`
  - Requires Super Admin.
  - Adds or removes the employee-specific bug reporting permission.

## Implementation Plan

### Phase 1: Permission Foundation

- Add `submitBugReport` to shared extra permission scopes.
- Add normalization for the permission name `submit bug report`.
- Extend HRM employee-specific permissions to include the bug report permission.
- Add Super Admin mutation to enable/disable bug reporting for a target employee.
- Add employee table row action to call the mutation.
- Decide whether permission changes require session invalidation, login refresh, or client-side auth refetch.

### Phase 2: Database Schema

- Add bug report status enum/model schema.
- Add bug report and follow-up models.
- Link bug reports to users/employees and optionally `StoredDocument`.
- Generate and review Prisma migration.
- Document schema and relationship updates in Brain.

### Phase 3: Vercel Blob Storage Integration

- Use the existing Vercel Blob document provider path where available.
- Add or adapt feature-specific Vercel Blob upload helpers only if the existing document abstraction does not support direct client video uploads.
- Define required environment variables:
  - Vercel Blob read/write token.
  - Vercel Blob store id/name if the project needs to target a specific store.
  - Optional max upload size override.
- Implement server-side generation of scoped client upload authorization.
- Implement permission-checked read/playback through private Vercel Blob access.
- Treat recordings as immutable objects.

### Phase 4: Bug Report API

- Create the `bugReports` tRPC router.
- Implement upload initialization, report creation, list/detail, follow-up, admin list, and status update procedures.
- Validate file metadata, allowed MIME types, max duration, and max size.
- Enforce owner/admin access rules for every read and write.
- Add audit-friendly metadata such as URL, user agent, duration, and microphone flag.
- Enforce the 1 minute 30 second recording duration in the client and validate submitted duration metadata on the server.

### Phase 5: Header Button And Recorder UI

- Add the top-right bug icon to the web header.
- Gate visibility by `auth.can.submitBugReport` or equivalent.
- Build a recorder dialog/sheet with:
  - Microphone toggle.
  - Start recording.
  - Stop recording.
  - Preview.
  - Optional description.
  - Submit/upload progress.
  - Error handling for denied permissions or unsupported browser APIs.
- Combine display and microphone tracks into one `MediaStream`.
- Automatically stop recording at 1 minute 30 seconds.
- Stop all media tracks after recording ends or dialog closes.

### Phase 6: Issue Board

- Add employee-facing submissions board.
- Show report status, date, description, recording availability, and follow-up count.
- Add report detail view with recording playback and follow-up composer.
- Restrict employee view to own reports only.

### Phase 7: Super Admin Board

- Add all-reports board for Super Admin.
- Add status filters and employee/date filters.
- Add status update controls.
- Allow Super Admin follow-ups.
- Ensure employee report detail reflects updated status.

### Phase 8: Validation, Documentation, And Rollout

- Test permission visibility for Super Admin, enabled employee, disabled employee, and ordinary employee.
- Test recording with mic on/off.
- Test denied screen permission and denied microphone permission.
- Test upload size/duration limits.
- Test employee-only and Super Admin access boundaries.
- Update Brain documentation for database, API, permissions, feature behavior, and Vercel Blob storage decision.
- Roll out behind a feature flag or config switch if desired.

## Affected Areas

- `apps/www/src/components/header.tsx`
- `apps/www/src/components/tables/employees/columns.tsx`
- `apps/www/src/app` or route group for issue board pages
- `apps/api/src/trpc/routers`
- `apps/api/src/db/queries/hrm.ts`
- `apps/api/src/utils/documents.ts`
- `packages/utils/src/constants.ts`
- `packages/auth/src/utils.ts`
- `packages/db/src/schema`
- `packages/documents`
- `brain/features`
- `brain/api`
- `brain/database`
- `brain/decisions`

## Acceptance Criteria

- Super Admin can enable and disable the bug reporting feature per employee from employee row actions.
- Enabled employees see the bug icon in the top-right header.
- Disabled employees do not see the bug icon and cannot submit through API calls.
- Employee can record screen/tab/window with optional microphone narration.
- Employee can preview and submit the recording with optional description.
- Recording automatically stops at 1 minute 30 seconds.
- Recording uploads to Vercel Blob and is linked to a database bug report.
- Employee can view only their own reports, statuses, recordings, and follow-ups.
- Employee can add follow-up messages to their own reports.
- Super Admin can view all reports.
- Super Admin can update report statuses.
- Private recording access is permission checked.
- API rejects unauthorized access to reports, recordings, follow-ups, and status updates.

## Testing Plan

- Unit/utility tests for permission normalization and scope generation.
- API tests for create/list/detail/follow-up/status permissions.
- UI tests for header button visibility by role/permission.
- UI tests for employee table enable/disable action.
- Manual browser tests for recording:
  - Mic enabled.
  - Mic disabled.
  - Screen permission denied.
  - Mic permission denied.
  - Recording cancelled before submit.
  - Upload interrupted.
- Storage tests against a non-production Vercel Blob store.
- Regression test that disabled users cannot access upload/session/report APIs by direct calls.

## Security And Privacy Notes

- Users must explicitly grant browser screen capture permission. The web app cannot and should not bypass the browser prompt.
- The UI should warn users not to record unrelated sensitive information.
- Vercel Blob recordings should use private storage.
- Playback/download should be authenticated and permission checked.
- Apply the 1 minute 30 second max duration and a server-side max size limit to control storage cost and prevent abuse.
- Capture only necessary metadata.
- Consider retention rules after the office team has operational clarity.

## Rollout Recommendation

1. Implement behind a config flag or environment-enabled route if the team wants a cautious launch.
2. Enable for one Super Admin and one or two trusted employees.
3. Validate recording/upload/playback with real office browsers.
4. Expand access gradually from the employee page.
5. Review storage usage after the first week and tune duration/file size limits.

## Open Questions

- What is the maximum upload size? Suggested starting point: 100 to 250 MB depending on office network and Vercel Blob cost tolerance.
- Should report status changes notify employees immediately, or is board visibility enough for v1?
- Should issue board access live under customer service/support navigation, employee profile, or a dedicated internal tools section?

## Lower-Agent Readiness

Ready after open questions are answered enough to fix the v1 scope. The implementation can be split into permission/data/storage/API/UI subtasks, but the final feature should be validated end to end before rollout.
