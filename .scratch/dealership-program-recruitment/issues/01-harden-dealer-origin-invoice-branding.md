# 01 — Harden dealer-origin invoice branding

**What to build:** Complete dealer company branding so logo, company name, phone,
and full billing address including ZIP resolve automatically and consistently on
dealer-origin quotes and invoices printed by either the dealer or office.
Branding edits must produce fresh print artifacts without crossing customer and
internal pricing caches.

**Blocked by:** None — can start immediately.

**Status:** implemented

- [ ] Dealer settings persist and return billing ZIP and a branding version.
- [ ] Dealer branding resolution includes company name, street, city/state/ZIP,
      country, phone, and logo.
- [ ] Branding changes invalidate or version dealer-origin print artifacts.
- [ ] Customer/internal quote and invoice tests prove correct dealer isolation
      for dealership- and office-initiated printing.
- [ ] Brain API, database, feature, and progress documentation is updated.
