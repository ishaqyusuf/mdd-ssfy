# Plan: Mobile Main Header Avatar Sheet

## Type

UX / UI Responsive Fix

## Status

Implemented - Validated

## Created Date

2026-08-05

## Goal

Reduce the shared dashboard header to one account/menu trigger on screens below
the existing `md` breakpoint. Move permission-filtered site navigation and the
header utility actions into an avatar-triggered bottom sheet while preserving
the current desktop header, navigation state, permissions, and action behavior.

## Files To Touch

### Reuse

- `packages/site-nav/src/components/navs-list.tsx`: render the selected module's
  permitted navigation and close the sheet through its existing `onSelect`.
- `packages/site-nav/src/components/module-selector.tsx`: retain the shared
  selected-module model inside the mobile account sheet.
- `packages/ui/src/components/drawer.tsx`: use the existing Vaul drawer as the
  mobile bottom-sheet primitive, including overlay, drag handle, title, and
  safe-area-aware content.
- `packages/ui/src/hooks/use-mobile.ts`: use the repository's existing
  `<768px` breakpoint instead of introducing a second responsive definition.

### Extend / Update

- `apps/dashboard/src/components/header.tsx`: hide the mobile hamburger and the
  standalone search, request, bug-report, test-email, and notification controls
  below `md`; keep those controls unchanged for desktop; leave the header slot
  IDs and desktop sidebar-offset behavior intact.
- `apps/dashboard/src/components/user-nav.tsx`: split the account trigger into
  desktop dropdown and mobile drawer presentations; build shared account/menu
  rows once; place module selection, permitted navigation, utility actions,
  profile/settings destinations, and logout in the mobile sheet.
- `apps/dashboard/src/components/search/open-search-button.tsx`: support an
  accessible menu-row presentation that invokes the existing search store.
- `apps/dashboard/src/components/sales-rep-request-badge.tsx`: support a
  full-width menu-row presentation while preserving the count query,
  permission gate, destination, and badge.
- `apps/dashboard/src/components/bug-reports/bug-report-button.tsx`: allow the
  existing bug-report dialog to be opened from a menu-row trigger without
  duplicating capture/upload state.
- `apps/dashboard/src/components/notification-center/notification-center.tsx`:
  expose the existing notification body/state for a mobile subview inside the
  account sheet while preserving the desktop popover and unread badge.
- `apps/dashboard/src/components/tables-2/bug-reports/migration-parity.test.ts`:
  replace the obsolete standalone-header ordering assertion with coverage that
  the bug-report entry remains permission-aware and reachable from the mobile
  account menu.

### Create

- `apps/dashboard/src/components/header-mobile-nav.test.ts`: add a focused
  regression for the responsive ownership contract: desktop utilities remain
  in the header, mobile navigation is owned by `UserNav`, and the mobile sheet
  reuses the shared site-nav components.

### Avoid

- Do not copy or manually flatten `linkModules`; render `SiteNav.ModuleSelector`
  and `SiteNav.NavsList` so permissions, selected-module state, child links,
  active state, and default targets stay authoritative.
- Do not add another drawer/sheet primitive or another breakpoint constant.
- Do not mount duplicate notification, sales-request, or bug-report data/state
  trees at the same breakpoint.
- Do not change API contracts, permissions, queries, route destinations,
  sidebar behavior for other apps, or page-owned header portal slots.

## Implementation Flow

1. Refactor `UserNav` into one avatar trigger with two responsive
   presentations:
   - desktop: retain the Radix dropdown behavior;
   - mobile: open the existing Vaul `Drawer` from the bottom.
2. Build the mobile sheet in this order:
   - account identity;
   - current-module selector;
   - scrollable permitted navigation list;
   - header utilities with their current permission/count state;
   - profile and notification-settings links;
   - logout in the safe-area footer.
3. Close the mobile drawer before a nav link, search, bug-report, settings, or
   logout action transitions to its next surface. Open notifications as a
   back-navigable subview in the same sheet so its trigger/state is not
   destroyed by closing the drawer.
4. Update each encapsulated header utility with the smallest trigger/presentation
   seam needed to reuse its current stateful implementation from `UserNav`.
   Keep stateful overlay owners such as the bug-report dialog mounted outside
   the drawer portal and control them from the menu row; do not nest an overlay
   owner in content that unmounts when the drawer closes.
5. Remove `SiteNav.MobileSidebar` from the dashboard header mobile layout only;
   keep the shared component available to other `@gnd/site-nav` consumers.
6. Apply `md` visibility boundaries so only the avatar trigger remains in the
   mobile header action cluster and all existing desktop controls remain
   visible from `768px` upward.
7. Add/update focused source-contract tests, then run authenticated browser
   validation at the breakpoint boundaries.

## Acceptance Criteria

- At `390x844` and `767px` wide, the shared main header has no crowded utility
  icon cluster or separate hamburger; the avatar is the single menu trigger.
- Tapping the avatar opens a bottom sheet with a visible title, drag handle,
  close behavior, safe-area padding, and bounded internal scrolling.
- The sheet exposes only navigation and actions allowed for the current user.
- Module switching updates the nav list through the existing site-nav context.
- Choosing a navigation link closes the sheet and retains client-side routing.
- Search, sales-request review, bug reporting, test-email mode, notifications,
  profile/settings, and logout remain reachable when applicable.
- Unread/request badges remain visible in their mobile rows.
- At `768px` and desktop widths, the existing sidebar trigger/desktop sidebar,
  utility icon cluster, account dropdown, header portal slots, and hover-offset
  behavior do not regress.
- Long names/emails and long nav lists do not create document-level horizontal
  overflow.

## Validation

- `bun test apps/dashboard/src/components/header-mobile-nav.test.ts apps/dashboard/src/components/header-hover.test.ts apps/dashboard/src/components/site-nav-module-selection.test.ts apps/dashboard/src/components/tables-2/bug-reports/migration-parity.test.ts`
- `bunx biome check apps/dashboard/src/components/header.tsx apps/dashboard/src/components/user-nav.tsx apps/dashboard/src/components/search/open-search-button.tsx apps/dashboard/src/components/sales-rep-request-badge.tsx apps/dashboard/src/components/bug-reports/bug-report-button.tsx apps/dashboard/src/components/notification-center/notification-center.tsx apps/dashboard/src/components/header-mobile-nav.test.ts apps/dashboard/src/components/tables-2/bug-reports/migration-parity.test.ts`
- `bun run typecheck --filter @gnd/dashboard`
- Authenticated browser checks at `390x844`, `767px`, `768px`, and `1440x900`.
- Verify avatar open/close, backdrop/Escape behavior, sheet scrolling, module
  switching, parent/child nav links, link-close behavior, search, notifications,
  request badge/link, bug-report dialog, super-admin test-email mode, logout,
  focus return, touch targets, safe areas, and document overflow.
- Repeat with a restricted user and a super admin to prove permission-aware
  rows and administrative-only actions.

## Open Questions

None. The plan treats "all those icons" as the global mobile header utilities
and treats "navs" as the permission-filtered site navigation. Desktop behavior
remains unchanged.

## Completion Evidence

- The dashboard main header now delegates its right-side controls to `UserNav`.
  Below `768px`, the avatar is the single header navigation trigger and opens a
  Vaul bottom drawer; desktop keeps the existing utility row and account
  dropdown.
- The mobile drawer reuses `SiteNav.ModuleSelector` and `SiteNav.NavsList`,
  includes permission-aware Search, sales-request, bug-report, test-email, and
  notification actions, and keeps profile/settings/logout in a safe-area
  footer.
- Search closes the account drawer before opening and now gives its dialog an
  accessible `Search the workspace` title.
- Bug reporting closes the drawer before opening its separately mounted dialog,
  while notifications remain in the drawer as a back-navigable subview so
  neither flow nests a portaled overlay inside the mobile sheet.
- Focused validation passes 20 tests / 200 expectations across the mobile
  header, header-hover, module-selection, and bug-report parity suites. Scoped
  Biome and whitespace checks pass.
- Authenticated browser validation passed at `390x640`, `390x844`, `768x844`,
  and `1440x900`: the avatar drawer and desktop dropdown both open/close,
  navigation and Search handoffs close the drawer, the sheet scrolls to its
  quick actions, the short-screen notification view keeps its Back and list
  controls accessible, and document-level horizontal overflow is zero.
- Dashboard typecheck completes with the larger heap but remains blocked by
  existing repository-wide diagnostics. A touched-file filter reports only the
  repository's existing Bun `Matcher` typing limitation in the new source-level
  test and no diagnostics in touched runtime components.
