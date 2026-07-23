# Dealer Next-Step Guidance Plan

## Status

Completed on 2026-07-23.

## Scope

Give dealers one truthful answer to “What happens next?” from quote request
through GND payment and pickup/delivery, without creating a new workflow or
changing fulfillment state.

## Completed

- [x] Add a deterministic request/order guidance policy with focused tests.
- [x] Keep the dealer-to-GND payable separate from the dealer's customer
      receivable when selecting the next action.
- [x] Expose a typed order-level fulfillment projection on dealer sales
      list/detail payloads without leaking raw pickup or delivery relations or
      promoting one partial dispatch.
- [x] Render next-step guidance on quote rows, order rows, approved dashboard
      activity, and the order overview/progress surface.
- [x] Verify desktop and mobile dealer routes against local authenticated
      fixtures.
- [x] Validate focused tests, DB/API/dealership typechecks, formatting, and
      diff whitespace.
- [x] Close independent Standards and Spec review with no remaining findings,
      including consistent unknown-balance treatment across order detail.

## Non-Goals

- No request, payment, pickup, delivery, production, or inventory mutation.
- No new fulfillment state machine.
- No database schema or migration change.
- No promise that an order is ready unless an explicit status or completion
  record supports that statement.
