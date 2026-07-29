# Sales Book Navigation

## Purpose

Tracks the canonical navigation behavior shared by Sales Book routes.

## Current Behavior

- The Sales module sidebar is the canonical route navigation for Orders, Quotes,
  Production, Shelf Items, Inbounds, and Emails.
- Sales Book routes do not mount the former full-width section tab bar.
- Sales Orders does not introduce a compact copy of the section tabs when its
  table scrolls.
- Sales quick actions and report access remain available through the shared
  header navigation.
- Saved filter tabs remain available inside supported page headers, including
  the adaptive Sales Orders saved-view tabs.
- Contextual tabs inside forms, sheets, and detail workspaces are unaffected.

## Implementation Notes

- The shared Sales Book layout mounts `SalesNav` but no longer mounts a section
  tabs component.
- Sales Orders table scrolling is self-contained and no longer writes tab-only
  scroll state into the Sales Orders Zustand store.
- All former tab destinations retain their existing routes and permission-aware
  sidebar entries.

## Validation

- Focused Sales Book navigation coverage passes with 3 tests and 16 assertions.
- Targeted Biome validation and `git diff --check` pass.
- The dashboard-wide typecheck remains blocked by the repository's existing
  broad baseline; a filtered scan reports no diagnostics in the changed files.
- Authenticated browser QA at `1440x900` and `390x844` confirms:
  - Orders, Quotes, and Customers render without the removed sales section bar.
  - Orders preserves its saved filter tabs.
  - Orders, Quotes, and Customers keep independent vertical table scrolling.
  - None of the three pages introduce document-level horizontal overflow.
  - The browser console remains free of errors.
- The broader restarted-page audit retains four passing checks; its legacy/raw
  table audit remains blocked by existing storefront and legacy sales-form table
  findings outside this navigation change.
