# Dashboard Login

## Purpose

Tracks the canonical public login route and the active dashboard authentication
surface.

## Current Behavior

- `/login` is the canonical dashboard login route.
- The former `/login/v2` route redirects temporarily to `/login` and preserves
  its query string so existing bookmarks and authentication callbacks remain
  safe during the normalization period.
- The canonical login retains email/password authentication, Google sign-in,
  email login links, token login, safe `return_to`/`callbackUrl` handling,
  password reset access, remember-me behavior, error feedback, and
  development-only quick login.
- The retired first-version visual template and the versioned login page have
  been removed. The former v2 component is now the unversioned canonical login
  component.
- The existing `/gnd-backdrop.jpeg` image remains the active desktop visual
  asset while a replacement layout is selected.

## Validation

- Focused redirect-engine coverage verifies `/login/v2` redirects to `/login`
  with query preservation and that `/login` is not redirected.
- Local HTTP proof verifies `/login` returns `200` and `/login/v2` returns a
  `307` to the canonical route.
- Responsive browser proof covers 375x812, 768x1024, and 1280x720. The login
  controls render at every viewport and the browser console reports no errors.

## Design Direction Under Review

- Keep the existing GND backdrop as an owned brand asset.
- Prefer a high-contrast split-screen or editorial-panel layout with the form
  on a calm solid surface.
- A glass-card overlay may be explored only if field, label, focus, and error
  contrast remain accessible against the backdrop.
- External Dribbble, Pinterest, and Behance references are inspiration only
  unless their reuse terms are independently verified.
