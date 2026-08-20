# Quote To Invoice Vercel Runtime Timeout

- Date: 2026-08-19; runtime follow-up verified 2026-08-20
- Status: Fixed and authenticated local browser verified
- Surface: Quote `Create Invoice`

## Symptom

Creating an invoice from a quote opened the target and then surfaced a Vercel
15-second runtime timeout. The accompanying Redis cache read was 81ms and was
timing context, not evidence of the bottleneck.

## Root Cause

The original conversion path loaded the complete Sales relation graph. A
committed request that timed out also lacked a durable source-to-target lookup
for a safe retry. After the projection/idempotency fix, stage timing exposed a
remaining critical-path bottleneck: an idempotent transaction took 31ms while
the awaited Trigger inventory dispatch took 2.53s. The API then awaited the
activity note, and the Dashboard awaited status reset plus query invalidation
before confirming success.

## Fix

- Read only the source fields and children required by the copy contract.
- Serialize quote conversion on the source row.
- Persist the source sale id in target metadata and return an existing target
  for retry or concurrent conversion.
- Keep inventory synchronization and activity-note follow-up durable while
  isolating follow-up failures from the successful copy result.
- Register inventory dispatch and activity-note creation with Vercel
  `waitUntil`, preserving their request lifecycle after the response while
  removing their variable network latency from the copy response.
- Start Dashboard status reset and query invalidation concurrently, confirm the
  committed invoice immediately, and finish those derived-data refreshes after
  confirmation.

## Regression Signal

Focused copy tests cover ordinary copy parity, deferred post-commit dispatch,
retry idempotency, and concurrent history/conversion behavior. Authenticated
local browser proof first measured 1.53s API / 2.12s click-to-confirmation. A
new 4-item, 9-door quote then converted once as invoice `09388PC` in 127ms API /
521ms click-to-confirmation; an idempotent retry confirmed in 421ms. Background
note creation, inventory dispatch, status reset, and query refresh continued
after the response without reported errors.
