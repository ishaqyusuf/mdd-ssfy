# Sales Document Messaging

## Purpose

Allow staff to send quote and order/invoice documents by email, WhatsApp, SMS,
or an explicit combination while keeping recipients, links, outcomes, and
activity evidence consistent.

## User Experience

- The shared sales document dialog exposes Email, WhatsApp, and SMS channel
  choices.
- Email remains selected by default for legacy callers.
- WhatsApp and SMS require a normalized valid customer phone. Missing or invalid
  phone data disables those choices and explains how to proceed.
- Key order, quote, customer workspace, sales overview, sheet, and sales-form
  entry points seed the saved customer phone when available; the dialog also
  permits a deliberate correction.
- The task monitor treats any requested channel that is skipped or failed as a
  visible delivery failure.

## Delivery Contract

- `composed_sales_document_email` carries `channels`, `customerEmail`, and
  `customerPhone`. A payload without `channels` remains email-only.
- North American local phone numbers are normalized to `+1`; valid supplied
  E.164 numbers are preserved. Ambiguous short values are rejected.
- WhatsApp uses the existing configured WhatsApp client.
- SMS uses Twilio only when `SMS_PROVIDER=twilio`,
  `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either
  `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_SMS_FROM` are present.
- An unconfigured SMS provider returns `SKIPPED` with a readable reason.
- Direct-message sends require a secure PDF target. Failure to generate its
  signed link stops the send before any channel is reported successful.

## Links And Message Composition

- Message bodies are bounded to 1,500 characters and include only available
  PDF, quote-acceptance, and payment actions.
- Long signed targets are shortened through the existing `/sh/<slug>` redirect
  system.
- Short links use `sourceType = sales_document_message` and stable source ids at
  the document type, selected sales ids, and link-kind grain. Repeated sends
  reuse an active matching short link.
- Click tracking and expiry continue to be handled by the existing `ShortLink`
  redirect contract.

## Evidence

- The notification result reports independent email, WhatsApp, and SMS
  sent/skipped/failed counts plus delivery/provider details.
- The sales document activity stores requested channels, document/customer/
  sales identifiers, included link kinds, per-channel outcomes, provider
  statuses, email attempt ids, and the overall outcome.
- `SalesEmailAttempt` remains the email-only provider ledger. WhatsApp and SMS
  do not create misleading email-attempt rows.
- No new database schema or migration is required; activity tags and `ShortLink`
  already provide the required evidence.

## Validation

- 39 focused tests / 92 assertions cover phone normalization, message bounds,
  stable short-link reuse, SMS configuration behavior, channel contacts,
  provider-result tags, attachment compatibility, dialog intent, and task
  feedback.
- Notifications, jobs, and API package typechecks pass.
- Targeted Biome and `git diff --check` pass.
- The local dev server served the authenticated sales orders query during
  browser smoke. The full Turbo gate passes 24 of 25 packages and retains the
  documented unrelated `@gnd/www` baseline.

