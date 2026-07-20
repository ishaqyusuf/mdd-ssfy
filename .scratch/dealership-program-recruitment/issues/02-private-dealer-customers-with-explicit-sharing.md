# 02 — Make dealer customers private by default with explicit sharing

**What to build:** Give dealers a per-customer office visibility control.
Dealer-owned customers are private by default; explicitly shared customers
appear in the office as dealer-owned, read/process-only records.

**Blocked by:** None — can start immediately.

**Status:** implemented

- [ ] Existing and new dealer-owned customers default to `PRIVATE`.
- [ ] A dealer can share or unshare only its own active customer.
- [ ] Office customer directory, search, summaries, statements, and unrestricted
      overviews exclude private dealer-owned customers.
- [ ] Shared dealer customers display dealer ownership and cannot be edited or
      used for unrelated office-origin sales.
- [ ] Permission tests cover dealer isolation and office read-only enforcement.
- [ ] Brain API, database, feature, decision, and progress docs are updated.
