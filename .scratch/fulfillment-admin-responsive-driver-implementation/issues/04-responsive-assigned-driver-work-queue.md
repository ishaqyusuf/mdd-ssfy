# 04 — Build The Responsive Assigned-Driver Work Queue

**Source:** [Fulfillment Admin And Responsive Driver Workflow](../../dispatch-admin-responsive-driver-workflow/spec.md)

**What to build:** Give an authenticated driver a phone-first web home that
uses the server-ranked manifest and exposes only their work through Today,
Assigned, Active delivery, and Completed destinations. The experience works as
an ordinary website and is installable where supported.

**Blocked by:** 01 — Prototype The Connected Admin And Driver Workflow.

**Status:** ready-for-agent

- [ ] Ordinary employee authentication and server-side assignment scoping prevent cross-driver reads and actions.
- [ ] Today ranks overdue, scheduled, packing-ready, and route-start work and identifies one primary next action per card.
- [ ] Assigned, Active delivery, and Completed expose their stated cohorts with loading, empty, stale, and error states.
- [ ] Cards show order, customer, destination, due window, item count, readiness, and sync state without admin-only controls.
- [ ] Phone controls meet the 44px touch target, avoid horizontal table scrolling, and adapt cleanly to tablet and desktop.
- [ ] The route is usable without installation and supplies compatible PWA metadata for supported browsers.
- [ ] Cached manifest data is presentation-only and cannot authorize a server transition.
- [ ] Permission, ranking, route, accessibility, responsive-browser, and compatibility tests pass while Expo remains canonical.

