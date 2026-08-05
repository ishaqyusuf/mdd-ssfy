# Plan: Mobile Avatar Account Sheet

## Type

UX / UI Responsive Fix

## Status

Corrected and implemented after user clarification on 2026-08-05.

## Clarified Goal

Keep mobile navigation and account actions as separate surfaces:

- the hamburger continues to open the existing mobile sidebar;
- the top-right avatar continues to represent only the existing account menu;
- on mobile, tapping that avatar renders the desktop account dropdown contents
  as a bottom sheet;
- Search, sales requests, bug reporting, test-email mode, and notifications
  remain independent header controls.

The earlier interpretation that moved the sidebar and all header utilities into
the avatar sheet was incorrect and has been reverted.

## Implementation

- `apps/dashboard/src/components/header.tsx` renders
  `SiteNav.MobileSidebar`, responsive Search, the existing header utilities,
  and `UserNav` as separate controls.
- `apps/dashboard/src/components/user-nav.tsx` uses the existing desktop
  dropdown at `md` and above, and the shared Vaul drawer below `md`.
- Desktop and mobile account presentations derive no-sidebar account links from
  the same helper and both expose the same account identity and logout action.
- The mobile account drawer does not render `SiteNav.ModuleSelector`,
  `SiteNav.NavsList`, Search, notifications, or other header utilities.

## Acceptance Criteria

- The mobile hamburger is visible and opens the existing sidebar drawer.
- Tapping the mobile avatar opens a bottom sheet titled `Account`.
- The bottom sheet contains only the information/actions normally available in
  the desktop avatar dropdown.
- The avatar sheet never owns or duplicates sidebar navigation.
- Existing header utilities remain independently accessible.
- Desktop avatar dropdown behavior remains unchanged.

## Validation

- Focused source contract:
  `bun test apps/dashboard/src/components/header-mobile-nav.test.ts`
- Scoped formatting:
  `bunx biome check apps/dashboard/src/components/header.tsx apps/dashboard/src/components/user-nav.tsx apps/dashboard/src/components/header-mobile-nav.test.ts`
- Manual responsive check in the already-running dashboard at mobile and
  desktop breakpoints.

## Historical Note

The first implementation of this plan treated the avatar as the single mobile
navigation trigger and moved the shared sidebar plus header utilities into its
sheet. User clarification established that only the avatar dropdown itself was
meant to become a mobile bottom sheet.
