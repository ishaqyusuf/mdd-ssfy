# Master Password Usage Audit

## Purpose
Persist master-password login and sales-rep transfer usage for Super Admin review without storing the configured credential.

## Current Behavior
- The web and mobile Better Auth legacy sign-in endpoints still allow configured ENV master passwords to bypass normal user-password verification.
- Sales-rep transfer confirmation accepts either the current owner's account password or the configured, case-sensitive master password. Master-password confirmation never bypasses sale ownership, target eligibility, or the confirmation prompt.
- `MasterPasswordLoginAudit` records usage as `LOGIN` or `SALES_REP_TRANSFER`, including the actor snapshot, app surface, platform, IP address, best-effort ISO country code from trusted Vercel/Cloudflare edge headers, browser/user agent, session/request id, timestamp, and optional order/quote reference.
- Audit persistence failure is logged server-side and does not block emergency master-password access.
- Transfer usage is fail-closed: the sale update, `SalesHistory`, and master-password audit row share one Prisma transaction, so an audit-write failure rolls back the completed transfer evidence and ownership change.
- Invalid credentials, non-owner/forbidden requests, invalid targets, and unchanged assignments create no transfer-usage row. Account-password transfers create `SalesHistory` but no master-password usage row.
- The previous `auth_master_password_login_alert` task trigger is no longer registered by `apps/www/src/lib/auth/web-auth.ts`, so normal master-password login activity no longer sends admin email.

## Admin Surface
- Super Admin users can open `/settings/master-password-logins` from Settings navigation.
- The compatibility route is unchanged, while the page title is **Master Password Usage**.
- The page uses the restarted `tables-2/master-password-logins` table-core surface with compact rows, table-owned scroll, virtual rows, column DnD, resize handles, persisted visibility/sizing/order/divider settings, and tailored audit column widths.
- The page lists active audit records with usage/platform filtering, usage-label and sale-reference search, pagination, column visibility, and refresh. The Usage column distinguishes Login from Sales rep transfer and shows the order/quote number when present.
- Clear uses an accessible confirmation dialog and archives the current filtered active result set by setting `clearedAt` and `clearedBySuperAdminId`.
- Each active row also exposes a Clear action that archives that specific audit record through the existing `ids` mutation input.
- Cleared rows are hidden from the default view; the page can show cleared rows for review.

## Scope Notes
- Audit consistency follows `ADR-020-master-password-usage-audit-consistency.md`: login is best-effort, while master-password sales-rep transfer is transactional and fail-closed.
- The feature covers the main web/mobile auth flow.
- Dealership master-password alerts are unchanged unless a separate product decision extends this audit surface to dealer auth.
