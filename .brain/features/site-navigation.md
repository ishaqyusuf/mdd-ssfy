# Site Navigation

## Purpose
Tracks shared sidebar and navigation behavior used by web surfaces.

## Current Behavior
- The expanded desktop sidebar header shows the compact GND mark with visible `GND` / `Millwork Corp` brand text; it does not render the faint wide wordmark asset or append a separate "Workspace / Control Panel" label.
- Desktop sidebar hover expansion is shared by the sidebar shell, sidebar footer, shared `SiteNav.Header`, and the custom `apps/www` header. Leaving the hover surface collapses the sidebar after a short transfer grace period.
- Desktop sidebar parent links with child links expand on hover after a 1 second delay.
- Hover-open child groups collapse 1 second after mouse leave.
- When the pointer leaves an expanded child group downward and the sidebar has enough scroll offset to compensate, the sidebar preserves the scroll position of the following nav items during collapse so the next link does not jump upward under the cursor.
- Active or manually expanded child groups remain visible independently of hover collapse timing.
- The sidebar footer user row is flat to the footer border with no inset card or outer padding. Its hover/open background is carried by the full-width footer row. The account dropdown opens upward inside the expanded sidebar. Clicking the footer user control expands the sidebar and opens the account menu. Moving from the dropdown to other sidebar areas keeps the open menu stable. Hovering out of the sidebar still collapses the sidebar and hides the dropdown, but if the account menu was open its requested-open state is preserved while hidden; hovering back over the sidebar expands it and restores the open menu.
- A thin fixed loading bar appears at the top of the web viewport on initial page load, same-origin link navigation, form navigation, and full document unload. It changes color as progress advances, finishes in light green, completes when the App Router pathname/search state settles, and includes an 8 second safety completion for client-handled submits or cancelled navigations.
- Active `apps/www` sidebar links should resolve to current App Router routes. The 2026-06-17 cleanup removed the no-route sales commission item, retargeted unit production to `/community/unit-productions`, and kept edit-order as a meta matcher instead of a clickable `/sales-book/edit-order` URL. Mobile app support now resolves to `/support/mobile-app`; the former Settings > App Download page is removed.

## Implementation Notes
- Shared sidebar logo rendering lives in `packages/site-nav/src/components/logo.tsx`; `apps/www/src/components/sidebar-content.tsx` passes the compact icon asset plus explicit brand title/subtitle text for the expanded sidebar state.
- The global route loading indicator is mounted once from `apps/www/src/app/providers.tsx` through `apps/www/src/components/navigation-loading-bar.tsx`.
- Shared desktop nav behavior lives in `packages/site-nav/src/components/nav-item.tsx`.
- The scroll-preservation path uses the sidebar menu scroll container from `useSiteNav().mainMenuRef`.
- The footer account dropdown uses non-portal dropdown content rendered from the sidebar footer tree instead of a separate floating hover surface. The menu's requested-open state is separate from its visible state, so sidebar collapse hides the menu without resetting it. The footer row allows visible overflow only while the menu is open so the upward dropdown is not clipped by the trigger wrapper.
