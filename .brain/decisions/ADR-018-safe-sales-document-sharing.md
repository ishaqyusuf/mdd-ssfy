# ADR-018: Safe Sales Document Sharing Defaults

## Status

Accepted — 2026-07-22

## Context

Sales documents are signed, customer-facing URLs. The previous Sales menu
Share action carried a fixed phone number, so an operator could unintentionally
send a quote or invoice to an unrelated recipient.

## Decision

The generic Share action never chooses a recipient. It first uses the browser's
native share sheet, which requires the operator to select the destination. When
that API is unavailable, it opens an unaddressed WhatsApp composer containing
the document message so WhatsApp still requires an explicit recipient choice.
Channel-specific delivery, customer phone validation, short links, and audit
records remain separate work governed by the Sales Document WhatsApp and SMS
Delivery plan.

## Consequences

- A hard-coded or implicit customer recipient cannot receive a document through
  the generic share action.
- The generic fallback is intentionally not an audit-backed WhatsApp send; the
  planned channel chooser must be used when delivery accounting is required.
- A source-level regression test protects the recipient-safety invariant.
