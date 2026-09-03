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

## Implemented Public-Auth Design

- `/login`, `/password-reset`, `/login/reset-password`, and
  `/login/create-password` use the same responsive split layout: the owned
  `gnd-backdrop.jpeg` remains visible as the desktop visual panel and becomes
  a compact branded image header on smaller screens.
- Form controls use the shared shadcn-style primitives and semantic theme
  tokens. Password fields use a keyboard-operable show/hide control, and reset
  or account-upgrade links with a missing token show a focused recovery state.
- A successful email sign-in-link request now presents an inline confirmation
  state while preserving the existing account-non-disclosure wording and an
  explicit path back to password sign-in.
- Authentication behavior, providers, safe callback handling, reset endpoints,
  and development-only quick login remain unchanged.

## Validation

- Local browser checks cover login, password-reset request, missing reset-token
  recovery, and valid-token create-password states. Fresh pages load the
  backdrop and report no browser-console errors.
- The dashboard-wide TypeScript check exceeded the local Node heap limit before
  it could finish; formatting and focused browser compilation passed.
