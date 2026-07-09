# Brain Intake: Web Bug Reporting Workflow

## Status

Proposed

## Created Date

2026-07-07

## Last Updated

2026-07-07

## Source Request

The client currently uses the GND web app in-office to manage inventory, sales, community projects, work orders, customer service, and related workflows. Instead of starting with the planned desktop app, the immediate goal is to implement a web-first bug reporting workflow inside the existing website.

Employees who have access should see a bug report button in the top-right header. When clicked, they should be able to start a recording flow, optionally enable their microphone, demonstrate the issue on the website, narrate what is happening, and submit the bug request. The submitted video should be stored with Vercel Blob, and the bug request should be saved in the database.

Each employee should be able to view their own submissions, see status changes, and add follow-up messages. Super Admin users should be able to see all submitted issues, update their status, and grant or revoke the bug reporting feature for individual employees from the employee table row actions.

## Generated Plans

- [ ] Web Bug Reporting Workflow - `brain/plans/2026-07-07-feature-web-bug-reporting-workflow.md` - Status: Proposed

## Recommended Execution Order

1. Web Bug Reporting Workflow - implement the permission foundation, data model, Vercel Blob upload path, web recorder UI, user issue board, and Super Admin controls as one coordinated feature.

## Agent Recommendations

- Web Bug Reporting Workflow: open-code. This is a cross-layer feature touching permissions, HRM employee actions, database schema, API contracts, Vercel Blob document storage, header UI, recorder UX, and admin/user issue boards.

## Merged Items

- Header bug report button.
- Per-employee feature enable/disable by Super Admin.
- Browser recording flow with microphone narration.
- Vercel Blob video persistence.
- Bug report database record creation.
- Employee "my submissions" issue board.
- Employee follow-up messages.
- Super Admin all-issues board and status management.

These belong together because each part is required for the end-to-end office feedback loop to be usable and supportable.

## Duplicate Or Existing Items

- Related but separate existing plan: `brain/plans/2026-07-05-feature-desktop-feedback-issue-board.md`.
- That plan covers a Tauri desktop packaging direction. This intake is intentionally separate and web-first.

## Initial Technical Direction

- Use browser screen capture APIs for the web version:
  - `navigator.mediaDevices.getDisplayMedia()` for screen/tab/window capture.
  - `navigator.mediaDevices.getUserMedia()` for optional microphone audio.
  - `MediaRecorder` for generating the recording blob, likely `video/webm` for the initial web implementation.
- Keep web screen recording only for v1. Screenshot capture is out of scope for this web plan.
- Cap each recording at 1 minute 30 seconds.
- Use Vercel Blob for video object storage.
- Prefer Vercel Blob client uploads through short-lived, server-issued upload authorization so video files do not pass through tRPC JSON/base64 payloads.
- Store persistent report metadata in the database, and store object metadata in the existing document storage model or a purpose-built attachment model linked to the bug report.
- Use a private Vercel Blob store for report recordings when available. Playback/download should go through permission-checked API routes or short-lived authenticated reads.

## Known Codebase Touchpoints

- `apps/www/src/components/header.tsx` - likely location for the top-right bug report button.
- `apps/www/src/components/tables/employees/columns.tsx` - current employee row action menu for Super Admin controls.
- `apps/api/src/trpc/routers/hrm.route.ts` - likely location for employee access toggle mutation.
- `apps/api/src/db/queries/hrm.ts` - existing employee-specific permission patterns.
- `packages/utils/src/constants.ts` - existing extra permission scopes and permission normalization.
- `packages/auth/src/utils.ts` - permission scopes are merged into the authenticated user context.
- `packages/db/src/schema/documents.prisma` - existing `StoredDocument` model that can store provider/path/mime metadata.
- `packages/documents` and `apps/api/src/utils/documents.ts` - current document provider abstraction, with Vercel Blob as the target storage provider.

## Needs Clarification

- Confirm browser support expectations for the office environment. Web screen capture depends on browser support and user permission prompts.
- Confirm Vercel Blob store configuration, environment variable availability, retention policy, and private storage mode.
- Confirm maximum upload size for the office workflow. Recording duration is fixed at 1 minute 30 seconds.
- Confirm whether report status changes should notify employees, or whether issue-board visibility is enough for v1.

## Confirmed Decisions

- Web v1 is screen recording only.
- Screenshot capture is excluded from this web-first plan for now.
- Vercel Blob will be used for storing recordings.
- Maximum recording duration is 1 minute 30 seconds.
- Only Super Admin can view all reports and manage statuses.
- Recommended status set: `new`, `in_review`, `in_progress`, `needs_info`, `fixed`, `closed`.

## Skipped Items

- Tauri desktop packaging and native desktop capture are not included in this web-first intake.
- Screenshot capture is not included in this web-first v1 scope.
- Automated issue assignment, SLA metrics, and external tracker integrations are not included in v1 unless requested later.
- Realtime notifications and email alerts are optional follow-up work, not required for the first usable workflow.

## Success Definition

- Super Admin can enable bug reporting for selected employees from the employee page.
- Enabled employees see the header bug button after login/session refresh.
- Employees can record the website/screen with optional microphone narration and submit it.
- Recordings automatically stop at 1 minute 30 seconds.
- Video files are stored in Vercel Blob and linked to database bug report records.
- Employees can view their own submitted reports, statuses, and follow-up messages.
- Super Admin can view all reports and update statuses.
- Unauthorized users cannot submit, view, or update bug reports outside their allowed scope.
