# Production sheet design exploration

Status: Five concepts presented; implementation not requested or approved.

## Context

Inspected the open Sales Overview Production sheet for order 09602PC and
expanded all four production items. Interior sizes 2-0, 2-6, and 2-8 have
20, 16, and 12 submitted doors awaiting review. The exterior 3-0 item has
10 assigned doors, no submissions, and longer configuration details.

## Concepts

1. Compact workspace (recommended): scannable size/handing/status rows with
   one expanded item and local Assignments, Specifications, and Activity views.
2. Size ledger: flatter rows and shared product context for denser scanning.
3. Item navigator: persistent size navigation beside an item workspace;
   navigation becomes a two-column selector on mobile.
4. Review groups: items grouped by pending review versus assigned work.
5. Focus view: item selector and previous/next navigation for one item at a time.

Target desktop width is 640px, adjustable between 560px and 720px in the
concept preview. Mobile uses a full-width sheet with wrapping rows, reduced
top navigation, readable specification fields, and touch-sized controls.
Implementation should retain the pinned header/footer and one body scroll area.

Prototype source:
`/Users/M1PRO/.codex/visualizations/2026/09/09/01a08673-3e6f-7890-b5b8-2950731cf19f/production-sheet-options.html`

## Boundaries

Presentation exploration only. Prototype interactions are local and do not
mutate order data. Preserve canonical status, material warnings, assignment
and submission guards, permissions, and existing action eligibility during
any later implementation. Submitted quantities must not imply approval.
No application, API, database, or permission changes in this task.

## Preview correction

Fixed the compact/ledger renderer passing item objects into an index-based
row renderer, which caused an undefined `size` error on initial render.
The map now passes the numeric index explicitly. A local JavaScript runtime
check covers initial rendering and all five layouts, four items, both device
modes, and all three detail sections. This check validates rendering logic,
not browser layout geometry.

## Submission and assignment refinement

- All five design choices and the mobile toggle are now visible above the mockup.
- Assignment options reveal Change date and Reassign worker, with local date
  and worker controls. Alternate worker names are illustrative.
- Submission disclosure shows three progressive sample entries with submitter,
  time, LH/RH quantities, and a per-row delete action. Sample deletion updates
  displayed quantities locally; these are not actual production transactions.
- Standalone browser HTML: `.design-previews/production-sheet-options.html`.
- JavaScript runtime validation passed all five layouts, device switching,
  item selection, date editing, worker reassignment, and submission deletion.
  Automatic browser opening was blocked by the browser's local-file URL policy;
  browser visual validation remains unperformed.
