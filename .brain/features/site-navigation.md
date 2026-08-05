# Site Navigation

## Purpose
Tracks shared sidebar and navigation behavior used by web surfaces.

## Current Behavior
- Primary and child links in the shared desktop/mobile sidebar disable Next.js
  viewport prefetch. Navigation remains client-side when a user selects a link,
  but merely rendering the permission-aware sidebar must not execute protected
  route trees, their server queries, or the dashboard proxy's auth-session
  lookup. Focused links outside the high-cardinality sidebar may still choose
  their own prefetch policy.
- The expanded desktop sidebar header shows the compact GND mark with visible `GND` / `Millwork Corp` brand text; it does not render the faint wide wordmark asset or append a separate "Workspace / Control Panel" label.
- Desktop sidebar hover expansion remains owned by the sidebar shell and the shared `SiteNav.Header` used by other surfaces. The custom `apps/dashboard` header behaves like page content: hovering it does not expand the sidebar, and entering it from an expanded sidebar starts the normal collapse delay.
- Desktop sidebar parent links with child links expand on hover after a 1 second delay.
- Hover-open child groups collapse 1 second after mouse leave.
- When the pointer leaves an expanded child group downward and the sidebar has enough scroll offset to compensate, the sidebar preserves the scroll position of the following nav items during collapse so the next link does not jump upward under the cursor.
- Active or manually expanded child groups remain visible independently of hover collapse timing.
- Desktop navigation has one selected module shared by the fixed top module selector, the footer account menu, and the nav list. The active route initializes and resynchronizes the selection when navigation crosses module boundaries; selecting a different module switches the visible nav list in place until a module link is chosen.
- The top module selector sits below the logo and outside the scrollable nav container. Expanded sidebars show the module name and subtitle; collapsed sidebars show only its icon. A fixed divider separates the selector from the module links.
- The mobile navigation drawer uses the same selected-module model as desktop. Its branded header and full-width module selector remain fixed while one bounded nav region scrolls beneath them; selecting a module closes only the module menu and updates the drawer links, while selecting a nav link closes the drawer. The drawer has no viewport overflow and uses 44px minimum touch targets for its trigger, close action, module selector, primary links, child links, and child toggles.
- In `apps/dashboard`, screens below `768px` consolidate the main header into
  one avatar trigger instead of rendering the separate hamburger, Search,
  request, bug-report, test-email, and notification icon cluster. The avatar
  opens a bottom drawer that reuses the same selected-module navigation,
  exposes permission-aware utility rows, and keeps profile, notification
  settings, and logout in a safe-area footer. At `768px` and above, the desktop
  sidebar, utility controls, and account dropdown remain unchanged. Mobile
  notifications replace the drawer body with a back-navigable in-sheet view;
  bug reporting closes the drawer before its separately owned dialog opens.
- The nav list always renders the selected named module's permitted sections and links, followed by every permitted unnamed module. One divider separates the named module links from the unnamed shared/profile/support links. Module headings, module accordions, and module collapse state are removed; existing section labels and child-link expansion behavior remain unchanged.
- The sidebar footer user row is flat to the footer border with no inset card or outer padding. Its hover/open background is carried by the full-width footer row. The account dropdown opens upward inside the expanded sidebar. Clicking the footer user control expands the sidebar and opens the account menu. Moving from the dropdown to other sidebar areas keeps the open menu stable. Hovering out of the sidebar still collapses the sidebar and hides the dropdown, but if the account menu was open its requested-open state is preserved while hidden; hovering back over the sidebar expands it and restores the open menu.
- The footer account dropdown includes a labeled `Modules` group. The selected module is highlighted, and choosing another module closes the dropdown and updates the nav list.
- A thin fixed loading bar appears at the top of the web viewport on initial page load, same-origin link navigation, and form navigation. Native click and submit signals defer starting the bar until the active event stack has completed so they cannot update the loading-bar component while the App Router is rendering. The bar changes color as progress advances, finishes in light green, completes when the App Router pathname/search state settles, and includes an 8 second safety completion for client-handled submits or cancelled navigations. The bar does not update React state from `beforeunload`, where the document is already leaving and no meaningful progress frame can be painted.
- Shared saved page tabs render the current page/query tab with the default primary button variant; inactive tabs use the ghost variant.
- Active `apps/dashboard` sidebar links should resolve to current App Router routes. The 2026-06-17 cleanup removed the no-route sales commission item, retargeted unit production to `/community/unit-productions`, and kept edit-order as a meta matcher instead of a clickable `/sales-book/edit-order` URL. Mobile app support now resolves to `/support/mobile-app`; the former Settings > App Download page is removed.

## Implementation Notes
- The protected-route cost boundary is enforced in
  `packages/site-nav/src/components/nav-item.tsx` and
  `packages/site-nav/src/components/nav-child-item.tsx`, with a source-level
  regression in `scripts/site-nav-prefetch-boundary.test.ts`. See
  `.brain/decisions/ADR-042-protected-sidebar-prefetch-cost-boundary.md`.
- Shared sidebar logo rendering lives in `packages/site-nav/src/components/logo.tsx`; `apps/dashboard/src/components/sidebar-content.tsx` passes the compact icon asset plus explicit brand title/subtitle text for the expanded sidebar state.
- The global route loading indicator is mounted once from `apps/dashboard/src/app/providers.tsx` through `apps/dashboard/src/components/navigation-loading-bar.tsx`.
- Shared desktop nav behavior lives in `packages/site-nav/src/components/nav-item.tsx`.
- Shared module selection lives in `packages/site-nav/src/components/use-site-nav.tsx`; `module-selector.tsx` owns the fixed top trigger, and `module-menu-items.tsx` supplies the reusable highlighted module menu used by both selector surfaces.
- `packages/site-nav/src/components/mobile-sidebar.tsx` owns the responsive drawer shell. It reuses `ModuleSelector` in forced-expanded mode and keeps `NavsList` as the only scrollable drawer region.
- `apps/dashboard/src/components/user-nav.tsx` owns the dashboard-specific
  avatar/account presentation: Radix dropdown on desktop and the shared Vaul
  drawer on mobile. It consumes `SiteNav.ModuleSelector` and `SiteNav.NavsList`
  rather than copying permission or module-selection logic.
- The scroll-preservation path uses the sidebar menu scroll container from `useSiteNav().mainMenuRef`.
- The footer account dropdown uses non-portal dropdown content rendered from the sidebar footer tree instead of a separate floating hover surface. The menu's requested-open state is separate from its visible state, so sidebar collapse hides the menu without resetting it. The footer row allows visible overflow only while the menu is open so the upward dropdown is not clipped by the trigger wrapper.
