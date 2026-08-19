# Quote To Invoice Vercel Runtime Timeout

- Date: 2026-08-19
- Status: Fixed in code; production timing proof skipped by request
- Surface: Quote `Create Invoice`

## Symptom

Creating an invoice from a quote opened the target and then surfaced a Vercel
15-second runtime timeout. The accompanying Redis cache read was 81ms and was
timing context, not evidence of the bottleneck.

## Root Cause

The conversion path loaded the complete Sales relation graph. A committed
request that timed out also lacked a durable source-to-target lookup for a safe
retry. Production timing was skipped by request, so the relative cost of
individual stages is not claimed.

## Fix

- Read only the source fields and children required by the copy contract.
- Serialize quote conversion on the source row.
- Persist the source sale id in target metadata and return an existing target
  for retry or concurrent conversion.
- Keep inventory synchronization and activity-note follow-up durable while
  isolating follow-up failures from the successful copy result.

## Regression Signal

Focused copy tests cover ordinary copy parity, retry idempotency, and concurrent
history/conversion behavior. `@gnd/sales` typecheck passes. Production-shaped
timing, target-load, and browser proof were intentionally skipped at the user's
request, so no measured before/after latency is claimed.
