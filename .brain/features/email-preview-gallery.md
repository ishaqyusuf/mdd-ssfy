# Production Email Inventory and Preview Gallery

Status: inventory baseline established 2026-08-29; first 20 priority templates
redesigned and verified through 2026-08-30.

This document inventories email presentation sources and delivery paths. The
initial preview work did not redesign, restyle, rewrite, or migrate any
production email. The explicitly approved follow-up migrated the ranked
priority set described in `sales-email-design-system.md`; templates outside
that set remain at their inventoried current state.

## Inventory totals

| Surface | Count | Notes |
| --- | ---: | --- |
| React email source files | 53 | Non-test `.tsx` files under `packages/email/emails/`, including the migrated daily payment report. |
| React Email gallery routes | 52 | Every source except the unreferenced `dispatch-customer.tsx` is visible. |
| `EmailService` registry keys | 32 | Backed by 31 distinct React source files; assigned/created dispatch states share one file. |
| Direct job-owned React templates | 3 | `composed-email`, `app-download-expiry-reminder`, and the daily sales payment report. |
| Ad hoc raw-HTML production emitters | 2 | Contractor alert and contractor report-ready. |
| Source-only or dormant React templates | 19 | Seventeen storefront lifecycle templates plus `dispatch-customer` and `password-reset-to-default-email`. |

The production-capable inventory therefore contains 32 registered template
keys, three additional direct React job templates, and two raw-HTML emitters.
The gallery also keeps source-only lifecycle templates visible so their current
state can be reviewed without implying that they are currently delivered.

## Email families and meaningful states

### System and security

- `app-download-expiry-reminder`: expiring build with version, expiry, API URL, source URL, notes, and settings action. Direct Trigger job delivery.
- `auth-new-device-login`: workspace/dealership surface, device, IP, user agent, login time, and security instruction. Registered and production-wired.
- `auth-master-password-login-alert`: workspace/dealership surface, actor, session, IP, user agent, and support contact. Registered and production-wired.
- `login-link-email`: recipient, secure login action, optional revoke action. Registered and used by the legacy dashboard auth action.
- `password-reset-to-default-email`: administrator-reset state. Source-only; its task name exists, but no implementation or non-test caller was found.

### Dealer lifecycle

- `dealer-onboarding`: onboarding invitation and expiry.
- `dealer-profile-updated`: previous/new profile, effective time, and portal action.
- `dealer-program-status`: generic status heading/message/action/note. It is also reused for storefront checkout and shipping operational notices.
- `dealer-partnership-invitation`: personalized campaign benefit, image, and application action.
- `dealer-sales-request`: pending quote-to-order request.
- `dealer-sales-request-approved`: approved quote with optional order, total, payment, and order actions.
- `dealer-sales-request-rejected`: rejected request with optional reason.
- `dealer-magic-login-link`: short-lived dealer portal access.
- `dealer-password-reset`: short-lived dealer password-reset access.

All nine dealer sources are registered in `EmailService`.

### Sales documents, statements, and payments

- `sales-email` / registry key `sales-email-reminder`: quote, invoice, or order
  document; paid/part-paid/unpaid variants; PDF attachment versus download
  fallback; payment and quote-acceptance actions; optional dealer banner and
  Special Order approval actions.
- `composed-sales-document-email`: one or more orders, optional message, total due, payment/PDF actions, PDF-attached state, dealer banner placement, and per-order Special Order approvals.
- `customer-statement`: one or more statement rows, account/PO data, balance, optional message, and payment action.
- `sales-customer-payment-received`: single or multiple orders, applied amounts, remaining balances, payment method, note, and attached-invoice state.
- `sales-customer-payment-failed`: single or multiple orders, attempted amount/method, failure reason, and balances.
- `sales-customer-refund-completed`: refund amount/reference/reason and one or more orders.
- `sales-rep-online-payment-received`: internal rep alert with customer, amount, and one or more orders.
- `sales-reminder-schedule-admin-notification`: scheduled/now/test run, success/failure/skipped totals, delivered recipients, and skipped-sale reasons.
- `composed-email`: generic stack of text, links, and tables. This bypasses `EmailService` and is rendered by the `send-composed-email` job.
- `sales-daily-payment-report`: job-owned daily totals, method breakdown,
  exceptions, report period, Excel attachment, and download action. The raw
  HTML builder was migrated to React Email without changing scheduling,
  recipients, attachments, or download behavior.

All entries in this section now use the approved standard-email system.

### Special Orders

- `special-order-approval-request`: customer, order, expiring secure review-and-sign action.
- `special-order-status-notification`: recipient-facing status headline and message for a Special Order.

Both are registered and have production call sites.

### Dispatch and contractor jobs

- `dispatch-driver`: two registered states from one source: assigned and created; order, dispatch, delivery mode, assignee, and optional due date.
- `job-assigned`: contractor assignment.
- `job-approved`: reviewer approval and next payment step.
- `job-rejected`: reviewer rejection with optional note.
- `job-payment-sent`: payment batch, job count, amount, and method.
- `job-task-configure-request`: blocked contractor submission because an install task list is missing.
- `dispatch-customer`: empty source stub with no non-test imports; intentionally excluded from the gallery until it becomes a real email.

### Storefront

Production-wired templates:

- `storefront-order-confirmation`: order date, address, line items, total, and order action.
- `storefront-custom-inquiry-received`: project-request acknowledgement and reference.
- `storefront-password-reset-request`: reset action and expiry; registered as `password-reset-request`.

Source-only lifecycle templates retained in the gallery:

- Account: `storefront-welcome-email`, `storefront-signup-validate-email`, `storefront-email-verified`, `storefront-password-created`, `storefront-password-reset-completed`, and `storefront-magic-login-code`.
- Order lifecycle: `storefront-order-cancellation`, `storefront-order-status-update`, `storefront-shipping-confirmation`, `storefront-delivery-confirmation`, and `storefront-order-completed-review`.
- Marketing/retention: `storefront-abandoned-cart`, `storefront-customer-anniversary`, `storefront-hot-deals`, `storefront-product-review`, `storefront-promotional`, and `storefront-win-back`.

Five API flows trigger task IDs for `welcome`, `signup-validate`, `email-verified`, `password-created`, and `password-reset-completed`, but matching job implementations were not found. The remaining source-only lifecycle templates have schemas/task names but no non-test production caller. This is an operational wiring gap, not an email-design change.

## Ad hoc production HTML outside the gallery

These messages are generated inline rather than through `packages/email` and therefore are inventoried but are not React Email gallery entries:

- `packages/jobs/src/tasks/contractor-accounting/alert-schedule.ts`: escaped alert message plus an “Open contractor accounting alerts” link.
- `packages/jobs/src/tasks/contractor-accounting/generate-report.ts`: report-ready notice, report kind/date range, and download link.

No raw-text-only production sender, Nodemailer, SendGrid, Postmark, or Mailgun path was found. Resend is the active transport.

## Read-only design review observations

- The repository currently contains three presentation systems: newer themed GND templates, older storefront lifecycle templates with their own composition patterns, and bare ad hoc HTML. This creates visible differences in spacing, typography, borders, footer treatment, and action styling between families.
- Branding is not one uniform shell. Some messages lead with the shared logo/footer and theme helpers, while older storefront messages and raw reports use different header, footer, and container conventions.
- Action hierarchy varies by family: themed buttons, legacy buttons, inline links, and raw anchor tags are all production patterns today.
- Information density ranges from short security/job alerts to table-heavy statements, schedule summaries, composed sales documents, and the raw daily payment report. These should be reviewed as distinct density states rather than as one generic email.
- Date, order, account, payment, and currency details are formatted inside individual templates. The gallery now supplies valid representative values, but the underlying formatting remains template-specific.
- The gallery is a reliable visual baseline for React templates, but the three raw-HTML emitters still require separate review from their production source because they are not React Email routes.

These observations remain the baseline for templates outside the approved
priority 20. The migrated templates now share one visual foundation while
preserving their production data, conditional actions, attachments, delivery
routes, and event-specific semantics.

## Preview environment baseline

- Local gallery: `https://email.localhost/` through the shared Portless proxy, backed by port 3013.
- React Email and its preview server are aligned at `5.2.10`, matching the working Midday package. The previous `5.0.6` browser bundle crashed during route changes, and the repository patch targeted uncompiled package source rather than the served preview bundle.
- Twenty-nine templates now have deterministic `PreviewProps`; the existing storefront files already supplied meaningful defaults. Preview props are read only by the gallery and do not alter production data or sent output.
- The four named-export-only payment/refund templates now also have default exports solely so React Email can discover them. Their production named imports remain unchanged.
- The obsolete preview-server source patch was removed. The email package launches the installed preview entry directly.

## Verification

- 51/51 gallery links were clicked and produced route-specific, non-empty iframe content.
- Previously failing `composed-email`, `composed-sales-document-email`, `customer-statement`, and `dealer-profile-updated` previews now render with valid sample data.
- The four payment/refund templates are present in the gallery.
- Email package typecheck passes.
- All 19 email tests and 14 focused notification/dispatch tests pass.
- The 20 migrated priority routes were rechecked after the shared-component
  changes at desktop and mobile widths; all 40 states were non-empty and had
  zero horizontal-overflow offenders.
- Per-template screenshots and the ranked completion record are in
  `.brain/reports/email-design-review-2026-08-30.md`.
