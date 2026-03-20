# ADR-004: Auth Email Handler Pattern for better-auth Migration

## Status
Accepted

## Context
The app was using next-auth with credential-based login. The migration to better-auth required implementing email-based auth flows (magic link login, forgot password, reset password) with proper email notifications.

## Decision
- Accept `emailHandlers` callbacks in `initAuth()` in `packages/auth/src/index.ts` so the auth package remains email-infrastructure agnostic.
- Implement the email handlers in `apps/www/src/auth/server.ts` using Resend + `@gnd/email` templates directly.
- Added `magicLinkClient()` plugin to the better-auth client for client-side magic link support.
- New pages: `/login/reset-password` for token-based password reset.
- Auth email flows now use the `login-link-email` and `storefront-password-reset-request` templates from `@gnd/email`.

## Consequences
- Clean separation: `packages/auth` has no dependency on email infrastructure; email sending is configured at the app level.
- All auth-related emails go through Resend (consistent with rest of notification infrastructure).
- next-auth session provider and session-based features remain for now; gradual migration continues.

## Update (session 2)

Refined the implementation to fully connect auth emails to the notification package:
- `EmailService` in `packages/notifications` now has a public `sendTransactional` method for single-recipient transactional emails (magic link, password reset) that bypass user-preference checks but use the same `getRecipient`/`getTestEmail` routing.
- Auth email templates (`login-link-email`, `password-reset-request`) are registered in `EmailService#getTemplate` so they use the same template registry as all other notification emails.
- `apps/www/src/auth/server.ts` no longer creates its own Resend instance — it uses `EmailService` from `@gnd/notifications`.
