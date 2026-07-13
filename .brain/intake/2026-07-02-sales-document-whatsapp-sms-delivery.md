# Brain Intake: Sales Document WhatsApp And SMS Delivery

## Status
Proposed

## Created Date
2026-07-02

## Last Updated
2026-07-02

## Raw Input
User wants the existing sales document email capability extended so sales quotes and orders can also be sent to customers by WhatsApp or SMS. The message should include shortened links so the text body stays compact, especially when sending quote/order links from the sales quote and order system.

## Generated Plans
- [ ] Sales Document WhatsApp And SMS Delivery - `brain/plans/2026-07-02-feature-sales-document-whatsapp-sms-delivery.md` - Status: Proposed

## Recommended Execution Order
1. Sales Document WhatsApp And SMS Delivery - builds on existing sales document email, notification, WhatsApp, and short-link primitives while keeping the user-facing quote/order send flow cohesive.

## Agent Recommendations
- Sales Document WhatsApp And SMS Delivery: open-code - requires cross-package implementation across notifications, API/link generation, and sales quote/order UI surfaces with focused tests.

## Merged Items
- WhatsApp send, SMS send, quote/order customer messaging, and shortened document/payment links were merged because they share the same sales-document send workflow and acceptance criteria.

## Duplicate Or Existing Items
- No existing Brain plan or task was found for sales quote/order WhatsApp or SMS delivery.
- Existing related implementation primitives found:
  - `simple_sales_document_email` and `composed_sales_document_email` send sales quote/order emails through `packages/notifications`.
  - `packages/notifications/src/services/whatsapp-service.ts` can send WhatsApp text messages when Meta WhatsApp env vars are configured.
  - Some notification handlers already implement `createWhatsApp`, but the sales document email handlers currently create email-only direct contacts and set `whatsAppNotification: false`.
  - `ShortLink` schema, `/sh/[slug]` redirect route, `shortLinks` tRPC router, and settings UI already exist.
  - Sales document QR code and customer statement flows already use `findOrCreateShortLinkForTarget`.
- Existing related gap:
  - SMS appears to be represented by user/channel preferences only. A stale Twilio SMS helper was previously removed as unused, and no active SMS transport service was found.

## Needs Clarification
- Confirm the SMS provider and credentials to support first. Likely candidates are Twilio or a provider-specific gateway already used outside this repo.
- Confirm whether customer-facing WhatsApp/SMS sends should be staff-triggered only in v1, or also automated after quote creation/order approval.
- Confirm message wording and whether SMS should include only the primary short link while WhatsApp may include a richer summary.

## Skipped Items
- None.

## Approval Notes
- None.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.
