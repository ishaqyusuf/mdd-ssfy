# Plan: Sales Document WhatsApp And SMS Delivery

## Type
Feature

## Status
Proposed

## Created Date
2026-07-02

## Last Updated
2026-07-02

## Intake
- Intake File: brain/intake/2026-07-02-sales-document-whatsapp-sms-delivery.md
- Intake Item: Extend sales quote/order document sending beyond email to WhatsApp and SMS, using shortened links.

## Goal Or Problem
Sales reps can currently send sales quote/order documents to customers by email. The business also needs customer-facing WhatsApp and SMS delivery from the quote/order system, with short links for quote acceptance, PDF preview/download, and payment where applicable so message bodies stay compact.

## Current Context
- Sales document email is handled by `simple_sales_document_email` and `composed_sales_document_email` in `packages/notifications`.
- Sales document email actions are exposed from UI surfaces such as `apps/www/src/components/sales-menu.tsx` and `apps/www/src/components/sales-document-email-dialog.tsx`.
- The sales document email loaders already read `customer.phoneNo`, but the resolved notification schemas and direct contacts currently focus on email delivery.
- Sales document email direct contacts set `whatsAppNotification: false`, so the existing WhatsApp dispatcher cannot send these messages today.
- `packages/notifications/src/services/whatsapp-service.ts` can send text messages through `@gnd/app-store/whatsapp-client` when `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` are configured.
- Notification handlers in dispatch/jobs already demonstrate the `createWhatsApp` pattern.
- The short-link system already exists: `ShortLink` schema, `packages/db/src/queries/short-links.ts`, `apps/api/src/trpc/routers/short-links.route.ts`, settings UI at `/settings/short-links`, and public redirect route `/sh/[slug]`.
- Sales document QR generation and customer statement payment links already use `findOrCreateShortLinkForTarget`.
- SMS is not yet implemented as an active transport. There are SMS/user preference fields and `textSupport` channel metadata, but the previous Twilio helper was documented as stale/unused and removed.

## Proposed Approach
1. Add a shared sales document message composition layer that builds compact customer-facing message text for `quote` and `order` documents.
2. Generate or reuse short links for all externally visible links included in SMS/WhatsApp bodies:
   - quote acceptance link for quotes
   - PDF preview/download link where applicable
   - checkout/payment link for orders with amount due
3. Extend the sales document notification payloads to carry customer phone and channel intent without weakening the existing email flow.
4. Enable WhatsApp delivery for sales document handlers by adding `createWhatsApp` implementations and setting customer direct contacts to opt into WhatsApp only when the send action requested that channel and a valid phone is present.
5. Add an SMS transport service and notification result accounting after the SMS provider is confirmed.
6. Add UI affordances in the sales menu, composed document dialog, and quote/order overview actions so staff can choose Email, WhatsApp, SMS, or a deliberate combined send where supported.
7. Record activity/audit metadata per channel so users can see whether quote/order document delivery was sent, skipped, or failed by channel.

## Implementation Steps
- Audit all current sales document send entry points and centralize duplicated link/message decisions before adding channel-specific UI.
- Add a sales document link-shortening helper in the package/API boundary that calls `findOrCreateShortLinkForTarget` with stable `sourceType` and `sourceId` values such as `sales_document_message`.
- Extend `simpleSalesDocumentEmailSchema` and `composedSalesDocumentEmailSchema` or introduce parallel channel schemas so channel intent is explicit and backward compatible.
- Update `buildSalesDocumentEmailData` and `buildComposedSalesDocumentEmailData` to include normalized customer phone, short PDF link, short quote acceptance link, and short payment link when relevant.
- Implement `createWhatsApp` for simple and composed sales document handlers using compact message bodies.
- Add an SMS service and handler path after provider selection, mirroring WhatsApp result accounting without assuming WhatsApp and SMS share the same provider.
- Update UI send actions to expose channel choices and disabled states for missing email or missing phone.
- Add tests for short-link reuse, message body composition, missing-phone skip behavior, WhatsApp handler payloads, and SMS provider validation once selected.
- Browser-check the quote/order send flow from `/sales-book/quotes`, `/sales-book/orders`, and the sales overview sheet/dialog surfaces.

## Affected Files Or Areas
- `packages/notifications/src/types/simple-sales-document-email.ts`
- `packages/notifications/src/types/composed-sales-document-email.ts`
- `packages/notifications/src/services/whatsapp-service.ts`
- `packages/notifications/src/base.ts`
- `packages/notifications/src/index.ts`
- `packages/notifications/src/schemas.ts`
- `packages/db/src/queries/short-links.ts`
- `apps/api/src/trpc/routers/short-links.route.ts`
- `apps/www/src/components/sales-menu.tsx`
- `apps/www/src/components/sales-document-email-dialog.tsx`
- `apps/www/src/components/sales-overview-system/*`
- `apps/www/src/components/sheets/sales-overview-sheet/*`
- `apps/www/src/components/tables-2/sales-orders/*`
- `apps/www/src/components/tables-2/sales-quotes/*`
- TODO: SMS provider package/service files after provider confirmation

## Acceptance Criteria
- A sales rep can send a quote to a customer by WhatsApp from the quote/order workflow when the customer has a valid phone number.
- A sales rep can send an order/invoice by WhatsApp from the quote/order workflow when the customer has a valid phone number.
- A sales rep can send the same quote/order document by SMS after the SMS provider is configured.
- WhatsApp and SMS messages use shortened `/sh/<slug>` links instead of long tokenized URLs.
- Short links are reused for the same target/source where appropriate and track clicks through the existing short-link redirect path.
- Missing phone numbers disable or skip WhatsApp/SMS sends with clear UI feedback and audit/result accounting.
- Existing email send behavior continues to work without requiring phone numbers.
- Activity records identify the document type, customer, sales number(s), channel(s), and whether payment, quote acceptance, or PDF links were included.

## Test Plan
- `bun test packages/db/src/queries/short-links.test.ts`
- Focused notification tests for sales document message composition and WhatsApp/SMS channel handling.
- Focused UI import or component tests for touched sales menu/dialog components where available.
- `bun run typecheck`
- Browser smoke for quote and order send actions after implementation.

## Brain Update Requirements
- Update `brain/features/sales-pdf-system.md` if document link behavior changes.
- Update `brain/api/contracts.md` and `brain/api/endpoints.md` if notification schemas, tRPC routes, or public short-link behavior changes.
- Update `brain/api/permissions.md` if channel send permissions are added or changed.
- Update `brain/database/schema.md` and `brain/database/migrations.md` if SMS delivery/audit storage requires schema changes.
- Update this plan, `brain/tasks/roadmap.md`, `brain/tasks/in-progress.md`, `brain/tasks/done.md`, and `brain/progress.md` as execution state changes.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: No

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria
- SMS provider/env assumptions used

## Risks / Edge Cases
- SMS provider is not yet confirmed, so SMS transport implementation is blocked until credentials/provider behavior are known.
- WhatsApp Cloud API policy may require approved templates for some outbound customer messages, depending on whether messages are session-based or template-initiated.
- Tokenized payment/PDF/quote links must preserve their existing expiry semantics after shortening.
- Customer phone normalization must handle local numbers and avoid sending to invalid or wrong recipients.
- Multi-document sends must not mix customers or phone numbers.
- Delivery result accounting must not mark a message sent when the transport skipped due to missing env, invalid phone, provider rejection, or template policy.
