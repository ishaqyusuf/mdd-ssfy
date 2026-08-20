# Plan: Standardize Client-Ready Delivery Status Updates

## Type
Docs

## Status
Approved

## Created Date
2026-08-20

## Last Updated
2026-08-20

## Intake
- Intake File: .brain/intake/2026-08-20-pablo-sales-po-fulfillment-and-status-feedback.md
- Intake Item: Pablo did not receive a final update describing what was fixed, worked on, and ready to use.

## Goal Or Problem
At the end of a client work session, produce one concise, evidence-backed status
update that distinguishes shipped/ready work, implemented but unverified work,
work still in progress, blockers, and the next action. A client should not have
to ask what changed or guess whether a feature is safe to use.

## Current Context
- `.brain/progress.md` contains detailed chronological engineering evidence but is not shaped as a client-ready delivery message.
- `.brain/tasks/in-progress.md`, `.brain/tasks/done.md`, plans, and handoffs provide status sources but can diverge if a final summary is not compiled.
- The repository requires final responses to list Brain updates, but there is no dedicated client-delivery update template or ready-to-use checklist.
- This ticket creates documentation and workflow guidance only; it does not send messages to Pablo or authorize an external communication channel.

## Proposed Approach
Add a small reusable client-delivery update template and a completion checklist
that derives claims from Brain task state and verification evidence. Make the
language explicit about readiness and skipped validation so “implemented” is
never presented as “ready to use” without proof. Keep the artifact short enough
to paste into WhatsApp or email after human review.

## Implementation Steps
- Create a reusable client-delivery update template under `.brain/templates/`.
- Include fields for date/scope, ready to use, implemented but awaiting verification, still in progress, blockers/decisions, checks run, and next update.
- Require each ready claim to name the relevant ticket/feature and verification evidence.
- Add a short completion checklist to the appropriate Brain engineering/delivery guidance so session closeout includes task-state reconciliation before drafting the client update.
- Define wording rules that distinguish `Proposed`, `Approved`, `In Progress`, `Implemented/Unverified`, and `Done/Ready`.
- Add one filled example using the current intake without including private employee details or promising delivery dates that are not known.
- Verify the template can be copied cleanly into WhatsApp and email and remains concise on mobile.

## Affected Files Or Areas
- `.brain/templates/client-delivery-update.md`
- `.brain/engineering/ai-rules.md` or the existing delivery/completion guidance
- `.brain/tasks/in-progress.md`
- `.brain/tasks/done.md`
- `.brain/progress.md`

## Acceptance Criteria
- A reusable template exists and separates ready, unverified, in-progress, and blocked work.
- Every “ready to use” statement requires named validation evidence.
- The closeout checklist requires reconciling Brain task state before drafting the client update.
- The example fits a WhatsApp/email message and does not expose unnecessary private employee or customer data.
- No external message is sent as part of this ticket.

## Test Plan
- Review the template against one completed task, one implemented-but-unverified task, one proposed task, and one blocked item.
- Copy the filled example into a plain-text buffer and confirm headings and bullets remain readable without Markdown-specific rendering.
- Run `git diff --check`.

## Brain Update Requirements
- Update `.brain/engineering/ai-rules.md`, `.brain/tasks/*`, and `.brain/progress.md` when the template is implemented.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- A template can become ceremonial if task states are not reconciled first.
- “Implemented” must not be translated to “ready” when browser, migration, deployment, or production validation was skipped.
- Client updates should avoid internal diagnostics, private employee data, or uncertain delivery promises.

## Open Questions
- None.

## Linked Task
- Task Title: Standardize Client-Ready Delivery Status Updates
- Task File: .brain/tasks/roadmap.md
