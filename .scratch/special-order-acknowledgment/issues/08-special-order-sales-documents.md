# 08 — Render Special Order State In Sales Documents

**What to build:** Show customers the Special Order state and applicable policy on order and invoice documents while giving production and packing staff only the compact operational status they need, with fresh output after every material state transition.

**Blocked by:** 02 — Super Admin Policy And Sales Settings; 04 — Approve With Acknowledgment And Signature; 05 — Decline And Handle Terminal Approval Links; 06 — Invalidate Approval And Request Reapproval.

**Status:** complete

- [x] Every supported customer order and invoice presentation renders a prominent state-aware Special Order stamp for pending, approved, reapproval-required, and declined states.
- [x] Customer documents print the exact policy applicable to the current request or approval context rather than silently substituting the newest wording.
- [x] Approved customer documents include printed signer name and server approval date.
- [x] Raw signature presentation is limited to the intended customer acknowledgment area and is never included in production or packing data contracts.
- [x] Production and packing documents show a compact Special Order status without the full policy or customer signature evidence.
- [x] Not Required and legacy/unmanaged orders retain compatible ordinary document behavior.
- [x] Declaration, request context, approval, decline, invalidation, reapproval, policy context, and removal expire affected current document snapshots.
- [x] Preview, download, attachment, and regenerated output resolve state on the server and do not accept stale caller flags.
- [x] Document access and signature access continue to obey existing order/document permissions.
- [x] Projection, rendering, cache-invalidation, privacy, and representative document tests cover all states and supported output modes.

## Implementation progress (2026-08-13)

- State-aware PDF/email projections, historical policy resolution, protected signature access, and snapshot invalidation are implemented; focused rendering tests pass.
- Complete. Customer and operational render suites cover every Special Order
  state, full-policy versus compact output, signer privacy, and server-owned
  regeneration; every material transition calls the shared snapshot refresh.
