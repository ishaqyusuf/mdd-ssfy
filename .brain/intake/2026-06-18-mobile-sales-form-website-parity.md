# Brain Intake: Mobile Sales Form Website Parity

## Status
Handed Off

## Created Date
2026-06-18

## Last Updated
2026-06-18

## Raw Input
Implement the mobile sales dashboard and invoice/quote form so it reaches website new-sales-form parity while avoiding a monolithic architecture. Requested scope includes: `New Invoice` bottom sheet with Sales/Quote choice, recent customer selector by selected sales type, removal of UID subtitles from component rows, mobile custom component creation/search/update parity, morphable custom component sheet, door-size next-step fix, complete door/HPT/moulding/shelf feature parity from the website new sales form, clean flat UX, aligned floating actions, and no automated UI testing.

## Generated Plans
- [x] Mobile Sales Form Foundation And Customer Flow - `brain/plans/2026-06-18-ux-ui-mobile-sales-form-foundation-customer-flow.md` - Status: In Progress
- [x] Mobile Custom Component Parity - `brain/plans/2026-06-18-ux-ui-mobile-custom-component-parity.md` - Status: In Progress
- [x] Mobile Door Size And House Package Parity - `brain/plans/2026-06-18-ux-ui-mobile-door-hpt-parity.md` - Status: In Progress
- [x] Mobile Moulding Multi Select Parity - `brain/plans/2026-06-18-ux-ui-mobile-moulding-parity.md` - Status: In Progress
- [x] Mobile Shelf Items Parity - `brain/plans/2026-06-18-ux-ui-mobile-shelf-items-parity.md` - Status: In Progress

## Recommended Execution Order
1. Mobile Sales Form Foundation And Customer Flow - Establishes sales type, customer recents, component-row cleanup, and shared floating-action architecture needed by later slices.
2. Mobile Custom Component Parity - Depends on shared floating-action placement and component-list behavior; unlocks custom-step parity.
3. Mobile Door Size And House Package Parity - Fixes step progression and the HPT workflow before grouped add-on slices.
4. Mobile Moulding Multi Select Parity - Uses the shared proceed/floating action and grouped row contracts.
5. Mobile Shelf Items Parity - Uses the same flat grouped editor patterns and product-search/list architecture.

## Agent Recommendations
- Mobile Sales Form Foundation And Customer Flow: antigravity - mobile UX and flow-sensitive Expo work.
- Mobile Custom Component Parity: antigravity - bottom-sheet animation, search UX, and component selection parity.
- Mobile Door Size And House Package Parity: antigravity - step navigation, mobile workflow UI, and parity-sensitive line editing.
- Mobile Moulding Multi Select Parity: antigravity - mobile grouped-row UX and interaction parity.
- Mobile Shelf Items Parity: antigravity - product/category browsing and mobile grouped row UX.

## Merged Items
- Floating button alignment, footer-safe placement, custom button placement, item FAB placement, and floating proceed placement were merged into the foundation plan as a reusable floating-action layout concern, then referenced by downstream feature plans.
- Website parity and clean architecture requirements were applied to every plan instead of creating separate meta-only plans.

## Duplicate Or Existing Items
- Existing backlog task `2026-06-09 mobile sales invoice form feature` covers the broad mobile invoice form, but this intake narrows the immediate work to website parity gaps and architecture boundaries.
- Existing feature doc `brain/features/mobile-invoice-form.md` already describes the current mobile invoice form architecture and must be updated after implementation.
- Existing `brain/tasks/in-progress.md` entries for new-sales-form parity and custom-component inventory migration provide source-of-truth constraints but do not duplicate the mobile implementation scope.

## Needs Clarification
- None for planning. Manual QA will require the user to test in their running app because the user explicitly requested no UI testing.

## Skipped Items
- Automated UI/browser testing was intentionally skipped from the plans because the user explicitly requested not to run UI testing.

## Approval Notes
- Approved as part of the active `brain-goal-complete` goal. The user approved the plan direction, emphasized full website parity, and requested clean non-monolithic architecture.

## Handoff Notes
- Mobile Sales Form Foundation And Customer Flow
  - Handoff: brain/handoffs/ready/2026-06-18-mobile-sales-form-foundation-customer-flow-handoff.md
  - Queue Item: /Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-sales-form-foundation-customer-flow.json
  - Agent: antigravity
  - Status: queued
- Mobile Custom Component Parity
  - Handoff: brain/handoffs/ready/2026-06-18-mobile-custom-component-parity-handoff.md
  - Queue Item: /Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-custom-component-parity.json
  - Agent: antigravity
  - Status: queued
- Mobile Door Size And House Package Parity
  - Handoff: brain/handoffs/ready/2026-06-18-mobile-door-hpt-parity-handoff.md
  - Queue Item: /Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-door-hpt-parity.json
  - Agent: antigravity
  - Status: queued
- Mobile Moulding Multi Select Parity
  - Handoff: brain/handoffs/ready/2026-06-18-mobile-moulding-parity-handoff.md
  - Queue Item: /Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-moulding-parity.json
  - Agent: antigravity
  - Status: queued
- Mobile Shelf Items Parity
  - Handoff: brain/handoffs/ready/2026-06-18-mobile-shelf-items-parity-handoff.md
  - Queue Item: /Users/M1PRO/.brain-loop/queues/handoffs/2026-06-18-gnd-mobile-shelf-items-parity.json
  - Agent: antigravity
  - Status: queued
