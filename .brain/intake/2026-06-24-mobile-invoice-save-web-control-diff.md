# Brain Intake: Mobile Invoice Save Web Control Diff

## Status
Proposed

## Created Date
2026-06-24

## Last Updated
2026-06-24

## Raw Input
The mobile invoice save is still getting stuck or timing out. The web new sales form already has a working save feature, so compare the working web path against the mobile path and produce an updated detailed bug-fix outline.

## Generated Plans
- [ ] Mobile Invoice Save Web Control Diff - `brain/plans/2026-06-24-bug-fix-mobile-invoice-save-web-control-diff.md` - Status: Proposed

## Recommended Execution Order
1. Mobile Invoice Save Web Control Diff - Establish the working web save as the control path, compare mobile payload/transport/API stages against it, then patch only the proven delta.

## Agent Recommendations
- Mobile Invoice Save Web Control Diff: open-code - This is a focused local code/debug task across Expo, web new-sales-form, shared sales-form payload helpers, and the API save mutation.

## Merged Items
- Persistent mobile invoice save timeout, working web new-sales-form comparison, and updated detailed bug-fix outline were merged into one control-diff bug-fix plan because they share one user outcome: mobile create/save should complete like the working web new sales form.

## Duplicate Or Existing Items
- `brain/plans/2026-06-23-bug-fix-mobile-invoice-save-stuck.md` is complete and handled the UI not remaining permanently blocked after a hung request.
- `brain/plans/2026-06-23-bug-fix-mobile-invoice-web-parity-and-save-reliability-gap-closure.md` is an existing broad parity/reliability plan. This intake creates a narrower updated plan that treats the working web save path as the control specimen and limits the next handoff to save reliability comparison/fix.
- `brain/features/mobile-invoice-form.md` already documents the current mobile save architecture and should be updated after implementation.

## Needs Clarification
- TODO: Capture whether the failing save is on physical device, simulator, Expo Go/dev client, or preview build.
- TODO: Capture the exact failing invoice shape if available: simple line, HPT, moulding, service, shelf, quote/order, existing edit vs create.

## Skipped Items
- Broad mobile feature parity beyond save completion was skipped for this intake because it is already tracked in the existing 2026-06-23 parity closure plan and the user asked for the save-stuck bug plan.

## Approval Notes
- None

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.
