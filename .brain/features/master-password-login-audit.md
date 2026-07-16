# Master Password Login Audit

## Purpose
Replace the web master-password login email notification with a persisted Super Admin review surface.

## Current Behavior
- The web and mobile Better Auth legacy sign-in endpoints still allow configured ENV master passwords to bypass normal user-password verification.
- When a master password is used, `MasterPasswordLoginAudit` records the target user snapshot, app surface, platform, IP address, browser/user agent, safe session id, and login timestamp.
- Audit persistence failure is logged server-side and does not block emergency master-password access.
- The previous `auth_master_password_login_alert` task trigger is no longer registered by `apps/www/src/lib/auth/web-auth.ts`, so normal master-password login activity no longer sends admin email.

## Admin Surface
- Super Admin users can open `/settings/master-password-logins` from Settings navigation.
- The page lists active audit records with search, platform filtering, pagination, and refresh.
- Clear archives the current filtered active result set by setting `clearedAt` and `clearedBySuperAdminId`.
- Cleared rows are hidden from the default view; the page can show cleared rows for review.

## Scope Notes
- The feature covers the main web/mobile auth flow.
- Dealership master-password alerts are unchanged unless a separate product decision extends this audit surface to dealer auth.
