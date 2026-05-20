# Header Action Gating Repro

Status: Implemented; Pending Runtime Evidence

## Risk

The shared `SalesFormHeaderActions` can expose actions that are meaningful for
`www` but not wired for dealership.

## Steps

1. Open a `www` new order.
2. Record visible header actions and verify each has a working handler.
3. Open a `www` new quote.
4. Record visible header actions and verify order-only actions are hidden or disabled appropriately.
5. Open dealership quote composer.
6. Record visible header actions.

## Expected

- `www` order shows order-specific actions: print, overview, packing, save variants, settings when supported.
- `www` quote hides order-only actions.
- Dealership quote only shows implemented dealer actions.
- No visible action is a no-op.

## Implementation

- `packages/sales/src/sales-form/ui/header-actions.tsx` now renders optional
  actions only when the corresponding handler exists, in addition to
  permission/capability checks.
- `apps/dealership/src/components/dealer-sales-form/adapters/use-sales-form-capabilities.ts`
  and `use-sales-form-permissions.ts` disable printing for dealership until a
  dealer print flow is implemented.

## Evidence To Capture

- Screenshots of `www` order, `www` quote, dealership quote headers.
- Notes for each action: wired, disabled, hidden, or no-op.
