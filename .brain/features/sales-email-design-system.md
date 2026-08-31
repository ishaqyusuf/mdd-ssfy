# Sales Email Design System

## Purpose

Establish the standard visual foundation for GND transactional email, starting
with the highest-volume sales flows and extending the same system to adjacent
storefront, authentication, dealer, and fulfillment notices.

## Current Scope

- `packages/email/components/standard-email.tsx` supplies the reusable shell,
  brand header, primary/secondary/danger actions, color tokens, responsive
  panels and summaries, and a configurable departmental signature.
- The first 20 priority templates are migrated: core sales documents,
  statements, customer and representative payment events, the daily payment
  report, reminder administration, Special Order notices, the storefront order
  and inquiry/password-reset flows, generic composed mail, dealer program
  status, authentication/security notices, and dispatch assignment/creation.
- Lower-priority dealer, contractor, storefront lifecycle, and app-download
  templates remain on their existing presentation systems.

## Visual Foundation

- Warm paper canvas and card surfaces make the message read as a business
  document rather than an application screen.
- Deep cypress is the primary action and hierarchy color; a restrained brass
  rail acts as the recurring GND maker's mark.
- Georgia is used only for document headlines and the primary monetary figure.
  Geist/Helvetica/Arial remains the operational typeface for body copy, labels,
  tables, and actions.
- The hierarchy is brand/document identity, message, sender note, financial
  summary, document rows, secure actions, and a human signature.
- Light colors are explicit inline defaults so light-mode email clients cannot
  inherit white dark-mode text. Dark presentations remain readable through
  client inversion and scoped Outlook dark-mode fallbacks.

## Signature Contract

- Standard signature: resolved sender or team name, a template-specific
  department label, the Miami address, and a reply-directly support instruction.
- The standard and simple sales-document notification paths pass the resolved
  sales representative name to the template.
- Direct or legacy callers that omit the name fall back to `GND Millwork Sales
  Team`.

## Preserved Delivery Behavior

- Quote acceptance remains conditional on `acceptQuoteLink`.
- Invoice payment remains conditional on `paymentLink`.
- PDF download remains a fallback only when a PDF is not attached.
- Attached-PDF messaging, dealer-program banner placement, and every pending
  Special Order approval action remain intact.
- The Resend transport, recipients, sender address, subject, attachments,
  delivery ledger, and activity evidence are unchanged.

## Validation

- Email package typecheck passes.
- All 19 email tests and 14 focused notification/dispatch tests pass.
- Scoped Biome checks pass across the shared system, 20 templates, delivery
  handlers, and the daily-report job migration.
- All 20 priority gallery routes render non-empty content with no horizontal
  overflow at 640px desktop and 375px mobile preview widths.
- Forty current-state screenshots (desktop dark and mobile dark for every
  template) are recorded in the 2026-08-30 design review report. Explicit
  inline light-mode colors are covered by render tests; dark-mode CSS and
  responsive states were reviewed in the live gallery.
- The broader Jobs typecheck remains red only on the existing unrelated
  `inbound-demand.ts:2167` nullable quantity and
  `sales-control/actions.ts:113` optional assignment-id errors.

## Next Gate

Use this system for the next approved priority batch only after reviewing the
remaining legacy families against their distinct content and delivery states.
Do not mechanically migrate dormant/source-only templates without confirming
that their product flow is still intended to ship.
