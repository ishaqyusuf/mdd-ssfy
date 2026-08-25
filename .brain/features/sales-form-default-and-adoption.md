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
- A cached legacy cookie is accepted only while it still matches the persisted
  `LEGACY` preference and its `updatedAt` value. This makes administrative or
  cross-session preference changes effective on the user's next form request.
- Redirects preserve unrelated query parameters and repeated parameters.
- The resolver runs before form data loading on create order, create quote, edit
  order, and edit quote pages for both form surfaces.
- `selectedCustomerId` deep links initialize the selected customer on both the
  new and legacy create-order/create-quote surfaces. The legacy loader accepts
  only a normalized positive ID for an active office customer, then hydrates
  its primary address, pricing profile, payment term, and tax defaults. Missing
  or unavailable customers retain the normal optional customer-picker flow.

## User Choice

- The form switcher is available inside both form workspaces: before Overview
  in the new-form action row and before Take off in the legacy builder.
- `Use legacy sales form` uses the destructive treatment; `Use new sales form`
  uses the green treatment.
- Both directions show a save reminder before navigation. The user must either
  go back or explicitly choose `Switch anyway`; unsaved changes are not
  transferred between form implementations.
- New to legacy navigation adds `salesFormMode=legacy`.
- If the user has no saved preference, the legacy form asks whether to use it
  only this time or keep using it.
- `Only this time` records rollout evidence but does not set a cookie or saved
  preference.
- `Keep using legacy` stores the authenticated user's preference and refreshes
  the user-bound HTTP-only cookie.
- `Use new sales form` stores `NEW`, refreshes the cookie, and immediately
  returns to the new form.

## Administrative Reset

- The Super Admin `/settings/sales-form-adoption` workspace includes a
  `Move legacy users to new form` CTA whenever saved legacy preferences exist.
- A confirmation dialog states the affected count, next-request behavior, and
  that users may choose legacy again later.
- The reset atomically changes every still-`LEGACY` preference to `NEW`, marks
  its source as `admin`, and appends actor-attributed
  `sales.form.preference` evidence for each changed user.
- Existing legacy cookies become stale against the updated database record, so
  affected users resolve to the new form on their next create/edit request that
  does not carry the explicit one-navigation legacy override.
- The mutation does not remove the one-navigation `salesFormMode=legacy`
  override or permanently disable the legacy choice.

## New Form Entry And Pricing

- Create order and create quote still open the initial customer picker, but the
  picker is optional. Outside click, Escape, the close control, and `Skip for
  now` dismiss it without assigning a customer.
- A dismissed picker can be reopened with `Change` in the invoice summary.
- Component cards omit their price row when every component in the current step
  has no positive sales or base price. If at least one component in that step is
  priced, the calculated sales-cost display remains available for the step.
- The door-size quantity dialog uses a compact, divider-led layout. Supplier
  selection is a 32px top strip instead of a padded card; desktop table chrome
  is flat, with 8px horizontal and 4px vertical body-cell padding; quantity
  steppers are 32px high but retain their full 112px width for multi-digit
  values; Price and Line Total use fixed 112px columns; LH/RH use fixed 128px
  columns; and the totals summary is a single compact border-top row. At the
  canonical desktop viewport all nine configured door sizes fit
  without scrolling. Mobile size entries use flat divided sections instead of
  rounded shadow cards. Pricing, quantity calculation, supplier selection, and
  apply/remove behavior are unchanged.

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
- The bulk legacy-preference reset enforces the same Super Admin role on the
  mutation boundary.

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
- The 2026-07-30 create-order tooltip-context runtime error is covered by a
  focused provider regression test and authenticated browser proof; see
  `.brain/bugs/2026-07-30-new-sales-form-tooltip-provider-runtime-error.md`.
- Focused regressions cover customer-picker dismissal, guarded form switching,
  in-form switch placement, and step-level price visibility. Authenticated
  browser proof covers both switch directions and the all-unpriced root grid.
- The compact door-size dialog source contract passes 6 focused tests / 29
  assertions. Authenticated in-app browser verification confirms its nine-row
  desktop table has equal 449px client and scroll heights, so every size is
  visible without scrolling.
- The 2026-08-05 legacy deep-link regression covers query normalization and
  forwarding on both create routes plus office-customer hydration. Authenticated
  browser proof with customer `2302` confirmed the legacy order form renders
  the selected customer and suppresses the initial picker, while the same route
  without the parameter still opens the picker.
