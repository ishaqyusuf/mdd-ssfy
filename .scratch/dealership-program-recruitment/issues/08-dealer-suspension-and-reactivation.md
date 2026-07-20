# 08 — Suspend and reactivate dealer accounts

**What to build:** Add Super Admin-only dealer lifecycle controls that block
portal access and new dealer activity immediately, retain all records, allow
office fulfillment of existing approved work, and notify the dealer by email.

**Blocked by:** 07 — Approve or deny applications and activate dealers.

**Status:** implemented

- [ ] Suspension sets the canonical suspended/restricted state atomically.
- [ ] Dealer authentication and new portal operations reject suspended accounts.
- [ ] Office processing, fulfillment, print access, and history for existing
      approved orders remain available.
- [ ] Optional suspension reason is recorded and included in the email when set.
- [ ] Reactivation restores portal access, records history, and sends email.
- [ ] Repeat lifecycle actions are idempotent and Super Admin-only.
- [ ] Brain API, permissions, feature, and progress docs are updated.
