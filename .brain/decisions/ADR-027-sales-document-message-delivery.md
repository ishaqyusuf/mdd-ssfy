# ADR-027: Sales Document Message Delivery

- Status: Accepted
- Date: 2026-07-23

## Context

Sales documents already had email delivery, a WhatsApp transport, signed
external links, reusable short links, generic notification activities, and an
email-specific provider ledger. They did not have explicit customer-facing
channel intent, SMS transport, or one outcome model across email, WhatsApp, and
SMS.

## Decision

Keep one backward-compatible composed sales document notification contract.
Callers select `email`, `whatsapp`, and/or `sms`; omitted channel intent means
email. WhatsApp and SMS share normalized recipient validation, compact message
composition, and stable `/sh/<slug>` links, but retain separate transports and
provider results.

Use Twilio as the explicitly configured SMS adapter. An incomplete or absent
configuration is a skipped delivery, not implicit success. Require a generated
secure PDF link before any direct-message delivery starts.

Record channel outcomes in the existing sales document notification activity.
Keep `SalesEmailAttempt` email-only rather than storing non-email provider
events in a misleading ledger.

## Consequences

- Existing email callers remain compatible and do not require a phone.
- Combined sends expose partial and failed outcomes per requested channel.
- Repeated sends reuse short-link identity and retain existing click tracking.
- SMS deployment requires Twilio credentials and an approved sender or
  Messaging Service; no environment file is changed by application code.
- No Prisma schema or migration is introduced.
- Provider webhook delivery/read receipts remain future work; current status is
  immediate provider accepted, skipped, or failed evidence.

