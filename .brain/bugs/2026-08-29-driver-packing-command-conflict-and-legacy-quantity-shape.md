# Driver Packing Command Conflict and Legacy Quantity Shape

## Symptom

- Dispatch `4597` / order `09499LM` failed when Miguel selected all 12 units.
  The driver saw a stale-record conflict even though the manifest revision had
  not changed.
- A broader legacy-order matrix also showed generic validation failures for
  handled door manifests after the guarded-packing confirmation.

## Root causes

1. The submit-time overview read could reuse the global 60-second React Query
   fresh cache instead of fetching the current command revision.
2. Legacy shippable items whose `itemConfig.production` field was absent were
   excluded from non-production materialization even though canonical Sales
   control treats every value other than explicit `true` as non-production.
3. The web client recomposed handled quantities into `{ qty: lh + rh, lh, rh }`
   and sent all three values. The command schema correctly requires either a
   single quantity or LH/RH quantities, so handled manifests failed validation.
4. Inventory shortages, pending packing-review guards, and other command
   preconditions were translated through generic conflict/validation copy,
   hiding the actionable reason.

## Resolution

- Force the submit-time overview query to `staleTime: 0`.
- Materialize legacy shippable items whenever production is not explicitly
  enabled.
- Normalize command transport quantities to `{ qty, lh: 0, rh: 0 }` for
  single-quantity items and `{ qty: 0, lh, rh }` for handled items.
- Preserve actionable precondition messages for inventory shortage,
  packing-report guards, terminal/scope validation, and unavailable quantity;
  reserve conflict copy for genuine stale-manifest or idempotency conflicts.

## Verification

- Focused coverage passes 12 tests / 43 assertions across command guards,
  quantity transport, submit-time freshness, and error presentation.
- Authenticated Chrome packed the original 12-unit order successfully.
- Admin/in-app browser assigned 12 additional orders to Miguel. Driver-browser
  QA exercised all 12: four normal packs completed, two entered guarded-review
  flow, and six were correctly blocked by real inventory shortages. The handled
  62-unit manifest now reaches inventory validation and displays the inventory
  shortage instead of stale-record or generic validation copy.
- Completion was correctly unavailable because the tested dispatches still
  have server-owned destination, schedule, inventory, or pending-review
  blockers. No address, inventory, approval, or proof gate was bypassed.

## Follow-up

- The admin `Ready to load` stage currently includes packed rows that the
  authoritative driver projection still blocks for inventory/payment review.
  Treat this as presentation terminology/readiness parity work, not permission
  to weaken the driver Start Trip gate.
