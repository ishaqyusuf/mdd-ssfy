# 03 — Carry a direct-ship customer snapshot into office fulfillment

**What to build:** Snapshot the dealer's customer recipient when an order request
is submitted so authorized office staff can review, print, pack, and dispatch
directly to that customer without opening the dealer's private directory.

**Blocked by:** 02 — Make dealer customers private by default with explicit sharing.

**Status:** implemented

- [ ] Delivery/ship requests require complete recipient name, phone, and address.
- [ ] Request submission stores an immutable recipient snapshot and binds it to
      the resulting order's shipping/billing presentation rules.
- [ ] Office request review, packing, dispatch, and relevant print surfaces show
      the snapshot with dealer context.
- [ ] Later customer edits or unsharing do not change the submitted order
      snapshot.
- [ ] Pickup orders remain valid without a delivery address.
- [ ] Brain API, database, feature, and progress docs are updated.
