# Sales Form Default And Adoption

## Status

Implemented on 2026-07-30. The new sales form is the default for authenticated
users across create/edit order and quote routes. The legacy form remains
available as a reversible per-user fallback.

## Routing Contract

- Canonical application links target `/sales-form/*`.
- The legacy `/sales-book/*` form routes remain valid compatibility entry
  points.
- `salesFormMode=new|legacy` is the explicit, one-navigation override.
- Resolution order is explicit query mode, authenticated user's versioned
  preference cookie, `SalesFormPreference`, then the default `new` mode.
- Redirects preserve unrelated query parameters and repeated parameters.
- The resolver runs before form data loading on create order, create quote, edit
  order, and edit quote pages for both form surfaces.

## User Choice

- The top form switcher is available on both form versions.
- New to legacy navigation adds `salesFormMode=legacy`.
- If the user has no saved preference, the legacy form asks whether to use it
  only this time or keep using it.
- `Only this time` records rollout evidence but does not set a cookie or saved
  preference.
- `Keep using legacy` stores the authenticated user's preference and refreshes
  the user-bound HTTP-only cookie.
- `Use new sales form` stores `NEW`, refreshes the cookie, and immediately
  returns to the new form.

## Adoption Analytics

- Form opens use the existing `PageView` ledger with bounded groups:
  `sales-form:<new|legacy>:<order|quote>:<create|edit>`.
- Preference decisions use append-only `Event` rows with type
  `sales.form.preference`.
- Events do not include customer, order, quote, slug, free-text, or query-string
  data.
- `/settings/sales-form-adoption` is visible to Super Admin users and reports
  saved preferences, observed unconfigured users, form opens, unique users, and
  per-user activity for 7, 30, or 90 days.
- The aggregation query enforces the Super Admin role server-side; the sidebar
  link is not the authorization boundary.

## Release Notes

- Apply migration `20260730160000_sales_form_preference` before deploying the
  dashboard/API code.
- The current repository migration replay is blocked by the older
  `20260722180000_master_password_usage_audit` ordering issue; see
  `.brain/database/migrations.md`.
- The new form remains the default even when no preference row exists. A saved
  preference is only required when a user deliberately chooses a form.

## Validation

- Pure route, cookie, persistence, privacy, authorization, and sidebar tests
  pass.
- The full `test:new-sales-form-migration` gate passes.
- Authenticated browser proof covers query preservation, one-time legacy use,
  persisted legacy override, switching back to new, and the Super Admin
  adoption dashboard.
