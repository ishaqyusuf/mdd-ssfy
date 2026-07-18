# Web Bug Reporting

## Purpose

The web bug reporting workflow lets enabled office employees submit current-tab screenshot or recording evidence with optional voice-note narration from inside the main GND web app. The goal is faster issue reproduction for workflows such as inventory, sales, work orders, customer service, community operations, and other office tasks.

## Current Implementation

- Header entry point: `apps/www/src/components/bug-reports/bug-report-button.tsx` is rendered from the main web header when the current session has `can.submitBugReport`.
- Capture technology:
  - Current-tab screenshot capture uses `html-to-image` to render the app DOM into a canvas without opening the browser screen/window/tab picker.
  - Current-tab video capture repeatedly renders the app DOM into a hidden canvas and records `canvas.captureStream()` with `MediaRecorder`, avoiding `navigator.mediaDevices.getDisplayMedia()`.
  - `navigator.mediaDevices.getUserMedia()` for optional microphone audio.
  - `MediaRecorder` for browser-side `video/webm` recording.
- Screenshot capture renders the current app tab into a canvas, excludes the bug-report modal/overlay from the capture, converts the canvas to `image/png`, and uploads that image evidence.
- Video recording limit: browser recording is capped at `90_000ms` (1 minute 30 seconds). The API enforces the same max duration.
- Video recording footer actions now distinguish `Cancel Recording` from `Finish Recording`: cancel stops the active `MediaRecorder`, discards chunks, clears recording metadata, and returns to the idle preview state without creating evidence; finish stops the recorder and creates the video preview for submission.
- Voice notes are recorded from the microphone with `MediaRecorder`, previewed in the report dialog, uploaded as audio evidence, and stored on the initial follow-up row.
- The description/caption area in the capture dialog now uses the shared `apps/www/src/components/chat` `Chat` composer instead of a standalone textarea. The same composer submit event awaits the bug-report upload/create flow, and the chat footer hosts the voice-note record/stop controls.
- Upload technology: screenshots, recordings, and voice notes upload to Vercel Blob through `@vercel/blob/client` with object keys under `bug-reports/<userId>/...`.
- Upload authorization: `/api/bug-reports/upload` uses Vercel Blob `handleUpload()` to issue short-lived client upload tokens only after verifying the session has `can.submitBugReport`.
- Environment: the upload authorization route requires server-only `BLOB_READ_WRITE_TOKEN`.
- Data persistence:
  - `BugReport` stores submitter, status, capture type (`VIDEO` or `SCREENSHOT`), description, page URL, user agent, source, primary evidence document id, duration, microphone metadata, and status update metadata.
  - `BugReportFollowUp` stores owner/admin follow-up messages plus optional voice-note document id, audio duration, transcription status, transcription text, and transcription provider.
  - `StoredDocument` stores primary evidence metadata with `kind = "bug_report_recording"` for video or `kind = "bug_report_screenshot"` for screenshots; voice notes use `kind = "bug_report_voice_note"`. All use `ownerType = "bug_report"`, `provider = "vercel-blob"`, and `visibility = "private"`.
- Transcription state is wired for Groq's OpenAI-compatible Whisper endpoint when `GROQ_API_KEY` is configured. Voice submissions still succeed without transcription config; configured environments attempt transcription after the follow-up/audio document is committed, then store completed text on the follow-up row and audio `StoredDocument.meta`. The completed transcription is attached to the primary screenshot/video `StoredDocument.description` as evidence-caption text, appending under a `Voice transcript:` label when the submitter already typed a description. If the submitter did not provide a typed description, the completed transcription is also copied onto the report description.
- Optional transcription env:
  - `GROQ_API_KEY`
  - `GROQ_WHISPER_MODEL` (defaults to `whisper-large-v3-turbo`)
  - `GROQ_AUDIO_TRANSCRIPTIONS_URL` (defaults to `https://api.groq.com/openai/v1/audio/transcriptions`)
- External issue creation is wired for GitHub or Jira after transcription/caption enrichment. Report creation still succeeds without external issue config. Configured environments store provider, issue key, issue URL, status, error, and creation timestamp on `BugReport`. When both providers are configured, GitHub remains the default unless `BUG_REPORT_ISSUE_PROVIDER=jira` is set.
- Optional GitHub issue env:
  - `BUG_REPORT_GITHUB_TOKEN` or `GITHUB_TOKEN`
  - `BUG_REPORT_GITHUB_REPOSITORY` or `BUG_REPORT_GITHUB_REPO` in `owner/repo` format
  - `BUG_REPORT_GITHUB_API_BASE_URL` for GitHub Enterprise/API overrides
  - `BUG_REPORT_GITHUB_LABELS` comma-separated, defaulting to `bug,reported-from-gnd`
- Optional Jira issue env:
  - `BUG_REPORT_ISSUE_PROVIDER=jira` to force Jira when GitHub is also configured
  - `BUG_REPORT_JIRA_API_TOKEN` or `BUG_REPORT_JIRA_TOKEN`
  - `BUG_REPORT_JIRA_EMAIL` for Jira Cloud basic auth; without email the token is sent as a bearer token
  - `BUG_REPORT_JIRA_BASE_URL` or `BUG_REPORT_JIRA_API_BASE_URL`
  - `BUG_REPORT_JIRA_PROJECT_KEY`
  - `BUG_REPORT_JIRA_ISSUE_TYPE` defaulting to `Bug`
  - `BUG_REPORT_JIRA_LABELS` comma-separated, defaulting to `bug,reported-from-gnd`
- Issue board route: `/support/bug-reports` renders `apps/www/src/components/bug-reports/bug-report-workspace.tsx`.
- The issue board report picker now uses `apps/www/src/components/tables-2/bug-reports/*` inside the restarted table shell with compact rows, content-tailored widths, persisted column settings, table-owned scroll, DnD, resize, and row-click selection into the existing detail panel.

## Permissions

- New scope: `submitBugReport`.
- Normalized permission name: `submit bug report`.
- Super Admin users can see the bug report button by role and can view/manage all reports.
- Non-Super Admin employees only see the header bug button when the employee-specific permission is granted.
- Super Admin can enable or disable bug reporting access from the dedicated `/settings/bug-reports` settings page or from employee row actions through `hrm.setEmployeeBugReportingAccess`.
- `/settings/bug-reports` shows active employees through `tables-2/bug-report-access-employees`, including enabled/disabled access state, a count of enabled employees, compact content-fit employee columns, column visibility/divider controls, and a disabled switch for Super Admin users because they are enabled by role. The route hydrates table settings but does not server-prefetch the employee list; the client query is enabled only for authenticated Super Admin sessions.
- The settings page is discoverable through both the Super Admin user dropdown and the main settings/sidebar link registry as `Bug Report Access`, restricted to Super Admin.
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

- `/api/bug-reports/upload`: requires `submitBugReport` for token generation; enforces `bug-reports/<userId>/` path ownership, image/video/audio content type, 250MB primary-evidence max size, no overwrites, and a 10-minute token lifetime.
- `bugReports.create`: requires `submitBugReport`; validates Vercel Blob upload metadata, capture type, duration/size/content type, optional voice-note evidence, then creates `BugReport`, linked primary `StoredDocument`, and an initial follow-up when description or audio is present.
- `bugReports.mine`: authenticated owner list.
- `bugReports.adminList`: Super Admin list with optional status filter.
- `bugReports.byId`: owner-or-Super Admin detail with recording metadata and follow-ups.
- `bugReports.addFollowUp`: owner-or-Super Admin follow-up creation; the schema accepts optional audio evidence, though the current workspace follow-up form is still text-only.
- `bugReports.transcribeFollowUp`: owner-or-Super Admin retry/manual transcription for a follow-up voice note; requires Groq transcription env config.
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
- 2026-07-17 expanded implementation validation:
  - `bunx biome check` passed for touched bug-report API/UI/schema/table files.
  - `bun test apps/api/src/schemas/bug-reports.test.ts` passed with screenshot + voice-note, legacy video compatibility, and oversized voice-note coverage.
  - `bun test apps/api/src/utils/bug-report-transcription.test.ts` passed with Groq-compatible multipart request, provider error, config, and metadata merge coverage.
  - `bun test apps/api/src/utils/bug-report-issue.test.ts` passed with GitHub and Jira config, label parsing, issue body/title, Jira ADF description generation, success, and provider-error coverage.
  - `bun test apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts` passed for the restarted bug-report table workspace and shared `Chat` composer wiring in the capture dialog.
  - `bun test apps/www/src/components/tables-2/employees/migration-parity.test.ts` passed with coverage for the Super Admin employee-row bug-report access badge/toggle, disabled Super Admin role state, and mutation wiring.
  - Follow-up UI regression coverage was added to `apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts` for the header bug button placement, `submitBugReport` permission gate, screenshot/video capture controls, screenshot/video preview surfaces, current URL/user-agent payload, centered sticky recorder footer, microphone toggle, shared `Chat` composer, voice-note record/stop controls, and transcription-ready voice-note payload.
  - Follow-up validation passed with `bun test apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts` (7 tests / 88 assertions) and the combined focused bug-report/access suite (28 tests / 176 assertions).
  - The shared header surface was cleaned so `apps/www/src/components/header.tsx` can be included in formatter-aware Biome validation with the bug-report button and parity test. The cleanup removed unreachable legacy JSX, kept the same header slot IDs and right-side control order, and gave the `pageTitle` placeholder a screen-reader fallback.
  - Formatter-aware `bunx biome check apps/www/src/components/header.tsx apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts apps/www/src/components/bug-reports/bug-report-button.tsx` now passes.
  - A dedicated Super Admin settings page was added at `/settings/bug-reports`, with source-level regression coverage for route presence, guarded client employee querying, access switches, selected-employee counts, support-board linking, and the settings menu link.
  - The main sidebar link registry now includes `/settings/bug-reports` for Super Admin, with regression coverage proving Super Admin access, Admin denial, and route-file existence.
  - Follow-up validation after the settings page and sidebar entry passed with `bun test apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts` (8 tests / 110 assertions), `bun test apps/www/src/components/sidebar-links.test.ts apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts` (15 tests / 140 assertions), and the combined focused bug-report/access/navigation suite (36 tests / 231 assertions).
  - The recorder footer regression coverage now pins explicit start, finish, cancel, reset, and microphone controls.
  - Full restarted table suite passed after the support table restart with `bun test apps/www/src/components/tables-2` (192 tests / 1908 assertions).
  - Runtime smoke returned `200` for `/support/bug-reports` and `/hrm/employees/v2` through both the local HTTPS proxy and direct Next dev port after the dev server booted; `/hrm/employees` redirects to `/hrm/employees/v2`.
  - Runtime smoke also returned `200` for `/settings/bug-reports` through both the local HTTPS proxy and direct Next dev port.
  - `bun --cwd packages/db db:generate` and `bun --cwd packages/db with-env prisma validate` passed.
  - Local DB runtime readiness was verified after manually applying only the bug-report tables to local `gnd-prisma2`; broad `prisma db push` was not used because it stopped on unrelated legacy drift. A Super Admin API-query smoke created and hydrated a screenshot report with one follow-up, then cleaned up the smoke report and stored document rows.
  - Filtered `@gnd/api` and `@gnd/www` typecheck scans showed no diagnostics from the touched bug-report files; broad API/WWW typechecks still fail on unrelated baseline diagnostics.
  - Follow-up alignment pass tightened transcription/caption behavior so voice transcripts are always attached to the primary screenshot/video evidence caption, appending under `Voice transcript:` when typed context already exists.
  - The Super Admin access settings page now delegates the employee selector to `tables-2/bug-report-access-employees`; regression coverage follows that boundary and verifies the access switch, role-enabled state, compact widths, table registration, guarded query, and sidebar/settings discovery.
  - Final focused validation passed with `bun test apps/api/src/utils/bug-report-transcription.test.ts apps/api/src/utils/bug-report-issue.test.ts apps/api/src/schemas/bug-reports.test.ts apps/www/src/components/sidebar-links.test.ts apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts apps/www/src/components/tables-2/employees/migration-parity.test.ts` (38 tests / 271 assertions).
  - Focused Biome passed for the touched bug-report API helpers/schema/query, header/button/workspace, settings page, sidebar links, bug-report table parity test, and `tables-2/bug-report-access-employees` files.
  - Filtered `@gnd/api` and `@gnd/www` typecheck scans printed no diagnostics matching the touched bug-report/access files. Unauthenticated route smokes returned `200` for `/settings/bug-reports` and `/support/bug-reports` on both direct Next (`127.0.0.1:3010`) and HTTPS proxy (`gndprodesk.localhost:3011`), with expected protected-page titles plus `/login/v2` redirect markers and no `Application error` or `__next_error__` markers.
  - Authenticated browser smoke used a local quick-login token for Pablo Cruz / Super Admin and Puppeteer-driven Chrome against `https://gndprodesk.localhost:3011/support/bug-reports`. With `navigator.mediaDevices` and `MediaRecorder` mocked inside the browser to avoid OS picker flakiness, the real app shell showed the header bug button, opened the report dialog, produced a screenshot preview, produced a voice-note audio preview, and produced a video preview after `Start Recording` -> `Finish Recording`.
  - Local environment config check found `BLOB_READ_WRITE_TOKEN` configured, while Groq/GitHub/Jira issue/transcription envs were intentionally absent in local dev. A direct Vercel Blob smoke uploaded and deleted a small object under `bug-reports/1/`, proving the configured Blob token works.
  - Real persistence smoke called the actual `createBugReport` query path with screenshot evidence, voice-note evidence, current URL, typed caption, and completed transcription metadata for user `1`, then loaded the report through `getBugReportById`. Assertions verified `SCREENSHOT` capture type, current URL, primary `StoredDocument` screenshot metadata, voice-note `StoredDocument` metadata, completed follow-up transcription text, and hydrated follow-up count. The smoke removed its `BugReportFollowUp`, `BugReport`, and `StoredDocument` rows after passing.
  - Follow-up authenticated browser submit smoke passed for screenshot plus voice-note evidence. The Puppeteer-driven Super Admin session opened the real bug-report dialog, captured a screenshot, recorded a voice note, submitted through the shared `Chat` composer, uploaded both artifacts through `/api/bug-reports/upload` to Vercel Blob, verified the persisted `SCREENSHOT` report/current URL/caption, `bug_report_screenshot` image document, `bug_report_voice_note` audio document, and pending transcription metadata, then deleted one report, one follow-up, two `StoredDocument` rows, and two Blob objects.
  - Follow-up authenticated browser submit smoke passed for video evidence. The same real app path recorded a short mocked screen video with microphone enabled, submitted through the dialog, uploaded a `video/webm` Blob, verified the persisted `VIDEO` report, duration and microphone metadata, `bug_report_recording` document, current URL marker, and typed caption, then deleted one report, one `StoredDocument` row, and one Blob object.
  - Current-tab capture correction replaced the old `getDisplayMedia()` picker path with `html-to-image` canvas rendering for screenshots and hidden-canvas `captureStream()` recording for video. The current-tab capture primitives live in `apps/www/src/components/bug-reports/current-tab-capture.ts`, keeping the React button focused on dialog/recorder/upload state.
  - Regression coverage now fails if `getDisplayMedia`, `displayStream`, "Screen recording", or "Record Video" reappears in the bug-report button, pins the modal self-exclusion marker plus `Record Tab` copy, and unit-tests the helper path for no display-media calls, viewport/scroll transform calculation, bug-report modal/overlay exclusion, recording canvas sizing, frame drawing, and PNG blob conversion.
  - Current-tab validation passed with the focused bug-report/API/sidebar suite: `bun test apps/www/src/components/bug-reports/current-tab-capture.test.ts apps/api/src/utils/bug-report-transcription.test.ts apps/api/src/utils/bug-report-issue.test.ts apps/api/src/schemas/bug-reports.test.ts apps/www/src/components/sidebar-links.test.ts apps/www/src/components/tables-2/bug-reports/migration-parity.test.ts apps/www/src/components/tables-2/employees/migration-parity.test.ts` (44 tests / 310 assertions).
  - Focused Biome passed for 25 touched bug-report/access/header files. `git diff --check` passed for the bug-report button, current-tab capture helper/test, bug-report parity test, `apps/www/package.json`, `bun.lock`, and Brain docs.
  - `bun --filter @gnd/www typecheck` still fails on unrelated baseline API/UI diagnostics, while a touched-file filter for `bug-report`, `bugReports`, `bug-report-button`, `current-tab-capture`, `html-to-image`, and `captureCurrentTab` returned no diagnostics.
  - Runtime route smoke returned `200` for `/sales-rep` through both direct Next (`127.0.0.1:3010`) and the local HTTPS proxy (`https://gndprodesk.localhost`). A full authenticated click-through smoke was not completed in this pass because creating a one-time Super Admin login token for automated Puppeteer was rejected by approval review without explicit user authorization, and the existing in-app browser control session was not reliable enough for capture-button proof.
