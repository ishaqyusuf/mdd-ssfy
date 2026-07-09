# Web Bug Reporting

## Purpose

The web bug reporting workflow lets enabled office employees submit a short screen recording with optional microphone narration from inside the main GND web app. The goal is faster issue reproduction for workflows such as inventory, sales, work orders, customer service, community operations, and other office tasks.

## Current Implementation

- Header entry point: `apps/www/src/components/bug-reports/bug-report-button.tsx` is rendered from the main web header when the current session has `can.submitBugReport`.
- Capture technology:
  - `navigator.mediaDevices.getDisplayMedia()` for screen/tab/window capture.
  - `navigator.mediaDevices.getUserMedia()` for optional microphone audio.
  - `MediaRecorder` for browser-side `video/webm` recording.
- Recording limit: browser recording is capped at `90_000ms` (1 minute 30 seconds). The API enforces the same max duration.
- Upload technology: recordings upload to Vercel Blob through `@vercel/blob/client` with object keys under `bug-reports/<userId>/...`.
- Upload authorization: `/api/bug-reports/upload` uses Vercel Blob `handleUpload()` to issue short-lived client upload tokens only after verifying the session has `can.submitBugReport`.
- Environment: the upload authorization route requires server-only `BLOB_READ_WRITE_TOKEN`.
- Data persistence:
  - `BugReport` stores submitter, status, description, page URL, user agent, source, recording document id, duration, microphone metadata, and status update metadata.
  - `BugReportFollowUp` stores owner/admin follow-up messages.
  - `StoredDocument` stores recording metadata with `kind = "bug_report_recording"`, `ownerType = "bug_report"`, `provider = "vercel-blob"`, and `visibility = "private"`.
- Issue board route: `/support/bug-reports` renders `apps/www/src/components/bug-reports/bug-report-workspace.tsx`.

## Permissions

- New scope: `submitBugReport`.
- Normalized permission name: `submit bug report`.
- Super Admin users can see the bug report button by role and can view/manage all reports.
- Non-Super Admin employees only see the header bug button when the employee-specific permission is granted.
- Super Admin can enable or disable bug reporting access from employee row actions through `hrm.setEmployeeBugReportingAccess`.
- Toggling access clears the target employee's app sessions so the session permission snapshot refreshes on next login.

## Report Visibility

- Employees can view only their own submitted reports.
- Super Admin can view all reports, filter by status, and update status.
- Employees and Super Admin can add follow-ups to reports they are allowed to view.

## Status Model

Recommended and implemented statuses:

- `NEW`: submitted and not yet reviewed.
- `IN_REVIEW`: Super Admin is reviewing or reproducing the issue.
- `IN_PROGRESS`: accepted and actively being worked on.
- `NEEDS_INFO`: waiting for more detail from the submitting employee.
- `FIXED`: fix or operational resolution is complete and waiting for confirmation/final review.
- `CLOSED`: no further action is needed.

Resolution reasons such as duplicate, not reproducible, or won't fix should be modeled later as a separate resolution field instead of expanding the status list.

## API Surface

- `/api/bug-reports/upload`: requires `submitBugReport` for token generation; enforces `bug-reports/<userId>/` path ownership, video content type, 250MB max size, no overwrites, and a 10-minute token lifetime.
- `bugReports.create`: requires `submitBugReport`; validates Vercel Blob upload metadata, duration, size, and content type, then creates `BugReport` plus linked `StoredDocument`.
- `bugReports.mine`: authenticated owner list.
- `bugReports.adminList`: Super Admin list with optional status filter.
- `bugReports.byId`: owner-or-Super Admin detail with recording metadata and follow-ups.
- `bugReports.addFollowUp`: owner-or-Super Admin follow-up creation.
- `bugReports.updateStatus`: Super Admin status update.
- `hrm.setEmployeeBugReportingAccess`: Super Admin employee-specific access toggle.

## Security And Privacy Notes

- The board and API reads are permission-checked.
- The recorder no longer imports or sends a raw Blob write token from the browser. Uploads use a server-issued Vercel Blob client token scoped to the current employee's `bug-reports/<userId>/` prefix.
- The `StoredDocument` row is marked private, but Vercel Blob objects are still uploaded with public Blob access because the installed Blob SDK requires `access: "public"` for Blob objects. Treat recording URLs as shareable until a permission-checked playback/proxy route is added.
- Users should avoid recording sensitive customer/payment information unless needed to explain the issue.

## Validation Notes

- `bun run db:generate` completed after adding the Prisma models.
- `TURBO_UI=true bun run db:migrate` reached Prisma but could not reach local MySQL at `127.0.0.1:3307`.
- `TURBO_UI=true bun run db:push` reached Prisma but could not reach `aws.connect.psdb.cloud:3306` from this environment.
- Follow-up validation: `bun run --cwd packages/db db:generate` and `bun run --cwd packages/db with-env prisma validate` passed.
- Follow-up database apply/status commands against local MySQL still failed with Prisma `Schema engine error`, and direct MySQL checks against `127.0.0.1:3307` failed with `ERROR 2002`.
- Docker recovery attempt on 2026-07-08 did not unblock the database: the Compose MySQL restart hung, Docker Desktop was quit/reopened, `docker desktop start` reported Docker Desktop already running, and `docker info` still could not connect to the Docker daemon socket.
- No broad typecheck/build/browser run was performed during the implementation pass because the active fast Bun monorepo discipline avoids expensive global validation by default.
