# 05 — Run the standard sales-email recruitment funnel end to end

**What to build:** Add a send-time campaign eligibility resolver to standard
quote/invoice email so an eligible direct customer receives a structured banner,
opens a secure personalized page, reviews existing information and consent, and
submits one dealership application that immediately suppresses later banners.

**Blocked by:** 04 — Create the Super Admin recruitment campaign workspace.

**Status:** implemented

- [ ] Eligibility excludes dealer-owned customers, existing dealers, deleted or
      email-mismatched customers, out-of-audience customers, and customers with a
      non-reset application.
- [ ] Invitation tokens are opaque, hash-stored, customer-bound, expire after 30
      days, and expose no customer id.
- [ ] Standard quote/invoice emails render the active campaign at the configured
      placement without changing non-eligible emails.
- [ ] Landing page shows a read-only customer summary, records one unique open,
      requires consent, and submits idempotently.
- [ ] Submission shows and emails receipt confirmation, suppresses later banners
      immediately, and alerts all active Super Admins in app and by email.
- [ ] Sales email ledger and campaign funnel retain campaign/invitation
      attribution only after successful delivery.
- [ ] Brain API, database, feature, and progress docs are updated.
