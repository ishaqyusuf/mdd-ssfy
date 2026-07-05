# Desktop Feedback Issue Board

## Status
- Plan Status: Proposed
- Created Date: 2026-07-05
- Requested By: User
- Related Surfaces: `apps/desktop` candidate, `apps/www`, `apps/api`, `packages/db`, `packages/documents`

## Objective
Add a Tauri desktop shell for the office web app, following the Midday desktop pattern, and introduce a feedback workflow where employees can submit bugs or feedback with an optional screen recording, microphone narration, and description. Employees should see only their submissions, while admins can review all submissions and update status.

## Validation Summary
- Recommended approach: proceed with a Tauri v2 desktop app that loads the hosted/local `apps/www` URL, like Midday's `apps/desktop`, instead of trying to statically bundle the full Next.js app.
- Key gate: screen recording must be validated in a small desktop proof-of-concept before full implementation. Browser `getDisplayMedia` plus `MediaRecorder` is the simplest path, but OS webview support, screen-recording permissions, microphone permissions, and output format need proof on the client's target machines.
- Sensitive-data gate: recordings may capture customer, sales, payment, inventory, and employee information. Feedback video storage must be treated as private, permission-gated operational evidence with retention limits.

## Current-State Findings
- GND is a Bun/Turborepo monorepo with `apps/www`, `apps/api`, `apps/expo-app`, and shared `packages/*`.
- Midday's local reference has a dedicated `apps/desktop` Tauri v2 app that loads external app URLs by environment and adds desktop affordances such as updater, deep links, tray, global shortcuts, and secondary windows.
- GND already has a shared document/storage foundation through `StoredDocument` and `packages/documents`, plus Vercel Blob/Cloudinary provider helpers.
- GND already has a Support section with `/support/mobile-app`, so the issue board can extend Support cleanly.
- GND tRPC auth already resolves the logged-in user in `protectedProcedure`, and permission checks can reuse existing role/permission patterns.

## Proposed Data Model
Add a new feedback domain schema, likely `packages/db/src/schema/feedback.prisma`.

Core models:
- `FeedbackIssue`
  - `id`
  - `createdById`
  - `assignedToId`
  - `title`
  - `description`
  - `type`: `bug`, `feedback`, `question`
  - `status`: `open`, `in_review`, `fixed`, `closed`, `wont_fix`
  - `priority`
  - `source`: `desktop`, `web`
  - `currentUrl`
  - `appVersion`
  - `desktopVersion`
  - `platform`
  - `userAgent`
  - `meta`
  - `resolvedAt`, `resolvedById`
  - `createdAt`, `updatedAt`, `deletedAt`
- `FeedbackIssueEvent`
  - status changes, admin notes, employee comments, assignment changes, and audit history.

Use `StoredDocument` for media attachments:
- `ownerType = "feedback_issue"`
- `ownerId = FeedbackIssue.id`
- `kind = "feedback_screen_recording"` or `feedback_attachment`
- `visibility = "private"`

## Proposed API
Add `apps/api/src/schemas/feedback.ts` and `apps/api/src/trpc/routers/feedback.route.ts`, then register `feedback` in `_app.ts`.

Recommended procedures:
- `feedback.createIssue`: authenticated employee create mutation with description, type, current URL, desktop context, and uploaded document references.
- `feedback.myIssues`: authenticated employee list of their own issues.
- `feedback.issueDetail`: own issue or admin-visible issue details.
- `feedback.adminIssues`: admin/reviewer list across employees.
- `feedback.updateIssueStatus`: admin/reviewer status and assignment update.
- `feedback.addIssueEvent`: employee/admin comment or admin note.

Upload path:
- Do not send multi-minute video as base64 through tRPC.
- Prefer a signed/direct upload or streaming REST route for video, then register the result in `StoredDocument`.
- Enforce file size, duration, MIME type, extension, and ownership before creating the issue.

## Proposed UI
- Global feedback entry point after login:
  - desktop-aware floating/help button or header/sidebar action.
  - opens a feedback modal or sheet from any workflow.
- Recorder modal:
  - bug/feedback type selector.
  - optional description.
  - record screen action.
  - microphone toggle.
  - recording timer, pause/stop, preview, discard, submit.
  - clear permission-denied and unsupported-browser states.
- Issue board:
  - route: `/support/issues` or `/support/issue-board`.
  - employees see their own submissions and status.
  - admins see all submissions with filters by status, employee, source, and date.
  - detail drawer/page includes video playback/download, description, URL, environment metadata, events, and status controls.

## Proposed Desktop Architecture
- Add `apps/desktop` with a minimal Vite + Tauri v2 setup, modeled on Midday.
- Load `apps/www` as an external URL:
  - development: `http://localhost:3001`
  - staging/production: configured hosted GND URLs
- Add a custom GND desktop user agent and/or a tiny Tauri command so the web app can detect desktop mode.
- Keep Tauri permissions minimal:
  - opener/dialog/update support as needed
  - upload/fs only if the recorder or upload path requires native upload assistance
  - remote URL capability restricted to known GND domains
- Add desktop package scripts:
  - `desktop`
  - `desktop:dev`
  - `desktop:build`
  - platform-specific build scripts after target OS is confirmed
- Add auto-update only after code signing and update hosting are decided.

## Execution Phases
1. Phase 0 - Technical proof
   - Build a throwaway Tauri recorder POC against local `apps/www`.
   - Validate screen selection, microphone toggle, file output, preview playback, and upload on target OS machines.
   - Decide whether browser `MediaRecorder` is sufficient or whether a native Tauri/Rust capture fallback is needed.

2. Phase 1 - Architecture decision and docs
   - Write an ADR for Tauri remote-shell desktop delivery, recording support boundaries, storage privacy, and update strategy.
   - Confirm target platforms: macOS only, Windows only, or both.

3. Phase 2 - Desktop shell
   - Add `apps/desktop`.
   - Wire environment URLs, app identifier, icons, app title, external-link handling, and dev/build scripts.
   - Validate login/session persistence in the webview.

4. Phase 3 - Feedback backend
   - Add Prisma schema and migration.
   - Add tRPC schemas/router and permission checks.
   - Add storage registration through `StoredDocument`.
   - Add notification/event emission for new issues and status changes.

5. Phase 4 - Recorder and submit flow
   - Add `useScreenRecorder` style client hook.
   - Add feedback modal/sheet and global button.
   - Implement upload progress, retry, cancel, preview, and submit.

6. Phase 5 - Issue board
   - Add support route and table/detail surface.
   - Add employee and admin scopes.
   - Add status update, assignment, comments/events, and media playback.

7. Phase 6 - Security, QA, and release
   - Validate permissions, storage access, retention, file limits, and audit history.
   - Run targeted API tests, UI tests, desktop build checks, and browser/desktop manual QA.
   - Package, sign, distribute, and document the install/update process.

## Validation Checklist
- `bun run db:migrate` and `bun run db:generate` after schema changes.
- Targeted API route tests for own/admin access boundaries.
- Upload tests for accepted/rejected MIME and size.
- UI tests or manual browser QA for create/list/update flows.
- Desktop QA on target OS: login, navigation, record with mic, record without mic, upload, playback, update/check version.
- `bun run typecheck` plus narrow app/package checks affected by the implementation.

## Risks
- Screen capture may not behave consistently across Tauri webviews and operating systems.
- Recordings can expose sensitive client/customer/payment information.
- Video uploads can exceed tRPC/serverless body limits if implemented as base64.
- Public blob URLs would be inappropriate for sensitive issue recordings.
- Unsigned desktop builds and missing updater strategy can make office rollout painful.
- Admin visibility rules must not leak one employee's issue media to another employee.

## Out Of Scope For V1
- GitHub/Jira synchronization.
- Offline issue queues.
- AI summarization of recordings.
- Cross-device employee notification center.
- Automatic background screen recording.
