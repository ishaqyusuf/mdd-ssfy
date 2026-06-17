# Site Navigation

## Purpose
Tracks shared sidebar and navigation behavior used by web surfaces.

## Current Behavior
- The expanded desktop sidebar header shows the compact GND mark with visible `GND` / `Millwork Corp` brand text; it does not render the faint wide wordmark asset or append a separate "Workspace / Control Panel" label.
- Desktop sidebar parent links with child links expand on hover after a 1 second delay.
- Hover-open child groups collapse 1 second after mouse leave.
- When the pointer leaves an expanded child group downward and the sidebar has enough scroll offset to compensate, the sidebar preserves the scroll position of the following nav items during collapse so the next link does not jump upward under the cursor.
- Active or manually expanded child groups remain visible independently of hover collapse timing.
- A thin fixed loading bar appears at the top of the web viewport on initial page load, same-origin link navigation, form navigation, and full document unload. It changes color as progress advances, finishes in light green, completes when the App Router pathname/search state settles, and includes an 8 second safety completion for client-handled submits or cancelled navigations.

## Implementation Notes
- Shared sidebar logo rendering lives in `packages/site-nav/src/components/logo.tsx`; `apps/www/src/components/sidebar-content.tsx` passes the compact icon asset plus explicit brand title/subtitle text for the expanded sidebar state.
- The global route loading indicator is mounted once from `apps/www/src/app/providers.tsx` through `apps/www/src/components/navigation-loading-bar.tsx`.
- Shared desktop nav behavior lives in `packages/site-nav/src/components/nav-item.tsx`.
- The scroll-preservation path uses the sidebar menu scroll container from `useSiteNav().mainMenuRef`.
