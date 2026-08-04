# ADR-040: New Sales Form Default With Reversible User Preference

- Status: Accepted
- Date: 2026-07-30

## Context

The new sales form must become the normal create/edit experience for orders and
quotes without removing the legacy form before rollout confidence is complete.
The business also needs adoption evidence without collecting sales-document or
customer details in telemetry.

## Decision

Use the new sales form as the fallback default for every authenticated user.
Resolve the active surface in this order:

1. explicit `salesFormMode` query mode;
2. versioned, authenticated-user-bound HTTP-only cookie;
3. `SalesFormPreference` database row;
4. the new-form default.

Keep legacy routes as compatibility entry points. The new form's top switch
links to legacy with an explicit query override. On first legacy use, ask whether
the user wants one-time access or a persisted legacy default. Switching from
legacy to new persists the new preference.

Record privacy-bounded form-open dimensions in `PageView` and append-only
preference decisions in `Event`. Enforce Super Admin authorization in the
adoption aggregation query.

Allow Super Admin to reset all currently saved `LEGACY` preferences to `NEW`
from the adoption workspace. Record one actor-attributed preference event per
changed user. Validate cached legacy cookies against the persisted mode and
timestamp so an administrative reset takes effect on the user's next form
request without an explicit one-navigation legacy override instead of waiting
for the cookie to expire. The reset is a one-time preference override, not a
permanent ban on choosing legacy again.

## Consequences

- Existing bookmarks and links to legacy form routes automatically converge on
  the new form unless explicitly overridden.
- Rollback is per user and does not require a global feature flag or payment
  entitlement.
- The cookie is a cache and user-experience override, not an authorization
  mechanism.
- Persisted administrative changes supersede stale legacy cookies without
  requiring remote cookie deletion.
- Production deployment must apply the additive preference migration before the
  application release.
- Adoption data intentionally cannot answer document-specific questions because
  order/quote identifiers and customer data are not recorded.
