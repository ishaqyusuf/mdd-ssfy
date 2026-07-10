# Spec: Web Bug Reporting Workflow

## Tracker

- GitHub Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/40
- Triage Label: `ready-for-agent`

## Problem Statement

The client uses GND in the office to run inventory, sales, community projects, work orders, customer service, and related daily workflows. When an employee runs into a bug, they currently have to explain the issue manually, often without enough context for the development/admin team to reproduce it quickly. This slows support down, creates back-and-forth, and makes operational problems harder to fix while staff are actively using the system.

The team needs an in-app way for enabled employees to show the exact issue they are seeing, narrate it, submit it, and track what happened after submission. Super Admin users also need control over which employees can access the feature and a single place to manage all submitted reports.

## Solution

Add a web-first bug reporting workflow to the main GND web app.

Enabled employees see a bug report button in the top-right header. When clicked, the employee can optionally enable their microphone, start a browser screen recording, demonstrate the issue inside the website, stop the recording, preview it, add an optional description, and submit it. Recordings are capped at 1 minute 30 seconds and stored in Vercel Blob. The app stores the report metadata, recording metadata, status, submitter, page URL, browser metadata, and follow-up thread in the database.

Each employee can open an issue board to see only their own submissions, status, recording, description, and follow-up messages. Super Admin can open the same board in admin mode to see all reports, filter by status, update statuses, and reply. Super Admin can grant or revoke bug reporting access from employee row actions. When access is enabled, the employee sees the header bug button after their session permission snapshot refreshes.

## User Stories

1. As an enabled employee, I want to see a bug report button in the app header, so that I can report an issue the moment I see it.
2. As an employee without bug reporting access, I do not want to see the bug report button, so that restricted internal tools stay hidden.
3. As a Super Admin, I want bug reporting access to be controlled per employee, so that I can roll the feature out gradually.
4. As a Super Admin, I want to enable bug reporting from an employee row action, so that I can grant access without leaving the Employees page.
5. As a Super Admin, I want to disable bug reporting from an employee row action, so that I can remove access quickly when needed.
6. As a Super Admin, I want Super Admin users to retain bug reporting access by role, so that admin access cannot be accidentally removed through employee-level toggles.
7. As an enabled employee, I want clicking the bug button to open a compact reporting flow, so that I do not lose my current work context.
8. As an enabled employee, I want to choose whether my microphone is included, so that I can narrate issues when helpful and stay silent when not.
9. As an enabled employee, I want the browser to ask what screen, tab, or window to record, so that I control what information is shared.
10. As an enabled employee, I want to record the issue on the website, so that the development/admin team can see the exact behavior.
11. As an enabled employee, I want recording to stop automatically after 1 minute 30 seconds, so that uploads stay bounded and easy to review.
12. As an enabled employee, I want to stop the recording manually before the time limit, so that I can submit short reports.
13. As an enabled employee, I want to preview the recording before submitting, so that I can confirm it captured the issue.
14. As an enabled employee, I want to discard and retake a recording, so that I can correct mistakes before submission.
15. As an enabled employee, I want to add an optional description, so that I can provide extra context not obvious from the video.
16. As an enabled employee, I want the current page URL to be captured with the report, so that support knows where the issue happened.
17. As an enabled employee, I want browser/user-agent metadata attached to the report, so that browser-specific issues are easier to diagnose.
18. As an enabled employee, I want a clear uploading/submitting state, so that I know the report is still being saved.
19. As an enabled employee, I want a success message after submission, so that I know the report was received.
20. As an enabled employee, I want clear error feedback if screen capture, microphone capture, upload, or report creation fails, so that I know what to retry.
21. As an enabled employee, I want the app to avoid exposing raw Vercel Blob write tokens in the browser, so that report uploads do not weaken storage security.
22. As an enabled employee, I want my recording uploaded directly to storage with server-issued authorization, so that large files do not pass through normal JSON API payloads.
23. As an enabled employee, I want to open my submissions board, so that I can review issues I already reported.
24. As an enabled employee, I want to see the status of each report, so that I know whether it is new, under review, in progress, waiting for me, fixed, or closed.
25. As an enabled employee, I want to open a report detail view, so that I can watch the recording and read the conversation.
26. As an enabled employee, I want to add a follow-up message to my own report, so that I can answer questions or clarify the issue.
27. As an enabled employee, I want to see admin follow-ups on my report, so that I know what the team needs from me.
28. As an enabled employee, I should not be able to see reports submitted by other employees, so that internal recordings stay scoped.
29. As a Super Admin, I want to see all submitted bug reports, so that I can triage office issues from one board.
30. As a Super Admin, I want to filter reports by status, so that I can focus on new, blocked, or unresolved issues.
31. As a Super Admin, I want to see who submitted each report, so that I know who to follow up with.
32. As a Super Admin, I want to watch each submitted recording, so that I can reproduce or understand the issue quickly.
33. As a Super Admin, I want to update report status, so that employees can see progress.
34. As a Super Admin, I want status changes to capture who changed the status and when, so that the board has basic audit context.
35. As a Super Admin, I want to add follow-up messages to any report, so that I can ask questions or document resolution notes.
36. As a Super Admin, I want the status model to stay simple, so that office staff can understand it without a complex ticketing workflow.
37. As a developer, I want bug reports linked to stored document metadata, so that recordings fit the existing document storage model.
38. As a developer, I want strict upload validation for owner path, duration, size, and content type, so that the API rejects unsafe or mismatched recording metadata.
39. As a developer, I want permission checks at both upload authorization and report creation, so that hidden UI is not the only security boundary.
40. As a developer, I want owner-or-Super Admin read rules, so that visibility remains consistent across list, detail, playback, and follow-up actions.
41. As a developer, I want database schema generation and migration/application captured as release gates, so that the feature is not considered runtime-ready until persistence exists in the target database.

## Implementation Decisions

- Build the web version first. Desktop/Tauri packaging remains separate and is not part of this spec.
- Keep v1 to web screen recording only. Screenshot capture is explicitly out of scope for this web-first workflow.
- Use browser capture APIs for recording: display media for screen/tab/window capture, user media for optional microphone capture, and MediaRecorder for browser-side recording.
- Cap recordings at 90 seconds in both the recorder and the backend validation contract.
- Store recordings in Vercel Blob.
- Use Vercel Blob client uploads authorized by a server route, not raw public write tokens embedded in the browser.
- Scope upload tokens to the authenticated employee's bug-report object prefix.
- Reject upload metadata that does not match the expected owner path, maximum duration, maximum upload size, or video-like content type.
- Store bug report metadata in dedicated bug report tables.
- Reuse the existing stored document metadata model for recording objects, with bug-report ownership metadata and private visibility in the application database.
- Use the existing app permission model with a new generated scope: `submitBugReport`.
- Normalize the employee-specific permission name as `submit bug report`.
- Give Super Admin access through role behavior.
- Allow non-Super Admin employees to submit, list, view, and follow up only on their own reports.
- Allow only Super Admin to view all reports and update statuses.
- Add a Super Admin employee-row action that grants or removes the employee-specific bug reporting permission.
- Clear the target employee's session rows when the permission is toggled, so the permission snapshot refreshes on next login.
- Render the header bug button only when the current session has bug reporting access.
- Add an issue board for employee self-service report history and Super Admin management.
- Use a simple status model: `NEW`, `IN_REVIEW`, `IN_PROGRESS`, `NEEDS_INFO`, `FIXED`, and `CLOSED`.
- Keep resolution reasons such as duplicate, not reproducible, and won't fix out of the v1 status list. If needed later, add a separate resolution field instead of expanding statuses.
- Capture useful diagnostic metadata: current URL, user agent, recording duration, microphone enabled state, recording content type, object key/path, file size, and submitter.
- Keep the initial UI consistent with existing GND header, dialog/sheet, table/list, toast, loading, and error patterns.
- Treat database migration/application as a required release gate. The schema can be generated and validated before runtime use, but the feature cannot persist reports until the intended database target has the new tables.

## Testing Decisions

- Primary testing seam: the protected bug reporting API/reporting contract. This should cover create, owner-scoped list, admin list, detail visibility, follow-up creation, status update, and upload metadata validation at the highest practical seam before UI rendering.
- Secondary testing seam: the HRM employee permission toggle contract. This should cover Super Admin-only access, granting/removing the employee-specific permission, blocking Super Admin disablement through the employee toggle, and session refresh side effects.
- Browser recorder tests should focus on observable UI state and calls, not browser internals: microphone enabled/disabled, start/stop flow, 90-second cap behavior, preview state, upload request shape, successful submit, and permission/upload errors.
- Do not unit-test implementation details of MediaRecorder itself. Mock browser media APIs and assert the app's externally visible behavior.
- Do not send large video payloads through tRPC tests. Use a Vercel Blob descriptor fixture and verify the API validates and persists metadata correctly.
- Prefer existing API/query test style already used for sales rep transfer, contractor job deletion, community route filters, and inventory route guard tests.
- Add focused query/router coverage for owner-or-Super Admin authorization because this is the core privacy boundary.
- Add schema/contract validation coverage for duration and upload size because recordings are bounded by product policy.
- Add UI component coverage only where it protects user-facing behavior that API tests cannot see, especially disabled access, recording state transitions, and failure messages.
- Add manual browser QA for real screen capture because browser permission prompts, tab/window selection, and MediaRecorder support vary by browser and cannot be fully proven in unit tests.
- Add a final database validation gate once the target database is healthy: generate Prisma client, apply or migrate the schema, and confirm report persistence works against the intended environment.

## Out of Scope

- Tauri desktop packaging.
- Native desktop capture APIs.
- Screenshot capture in the web v1 workflow.
- External tracker integrations such as GitHub Issues, Linear, Jira, Slack, or email notification workflows.
- Realtime notifications.
- SLA dashboards, assignment queues, priorities, labels, or internal developer triage workflows beyond status and follow-ups.
- AI transcription, summarization, or automatic reproduction analysis.
- Long-form recordings beyond 1 minute 30 seconds.
- Public customer-facing bug reporting.
- Anonymous reports.
- Cross-employee visibility for non-Super Admin users.
- Fine-grained resolution taxonomy in v1.

## Further Notes

- The current implementation direction already exists in Brain as the web bug reporting workflow plan and feature note.
- The implementation has started: schema, API contracts, permission scope, Super Admin access toggle, header recorder button, Vercel Blob upload authorization, and issue board have been added in the working branch.
- Prisma generation and schema validation have passed, but migration/application remains blocked by the local Docker/MySQL environment. Docker Desktop was restarted, but the daemon socket still did not respond, so the database target must be recovered before the feature can be considered runtime-ready.
- The stored document row is marked private in application metadata. Because Vercel Blob object access mode may still produce shareable URLs depending on SDK/store behavior, a later hardening pass should consider permission-checked playback/proxy URLs if recordings may contain sensitive customer, payment, or operational data.
- Office rollout should start with a small enabled employee group, then expand once browser support, upload reliability, and Super Admin triage behavior are proven.
