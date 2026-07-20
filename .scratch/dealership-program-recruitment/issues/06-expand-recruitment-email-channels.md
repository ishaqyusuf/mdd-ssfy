# 06 — Extend recruitment banners to composed emails and reminders

**What to build:** Reuse the standard funnel's resolver and suppression contract
for custom-composed quote/invoice emails and payment reminders while keeping
unrelated transactional and lifecycle email free of recruitment content.

**Blocked by:** 05 — Run the standard sales-email recruitment funnel end to end.

**Status:** implemented

- [ ] Composed quote/invoice emails receive the same structured banner contract.
- [ ] Manual and scheduled payment reminders receive the same banner contract.
- [ ] Receipt, failure, dispatch, security, onboarding, approval, denial,
      suspension, and reactivation emails never contain recruitment banners.
- [ ] Send-time suppression wins over queued/stale campaign data.
- [ ] Ledger metadata and successful-send analytics remain consistent across
      eligible email families.
- [ ] Template and handler tests cover top/bottom placement and exclusions.
- [ ] Brain notification/email feature docs and progress are updated.
