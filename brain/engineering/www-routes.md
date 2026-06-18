# WWW Routes

## Purpose
Grouped route reference for the `apps/www` Next.js App Router surface.

## Notes
- Source scanned from `apps/www/src/app/**/page.tsx`.
- Route groups such as `(public)`, `(sidebar)`, `(v1)`, and `(v2)` do not appear in the URL path.
- Dynamic segments are preserved as filesystem-style route params such as `[slug]`, `[token]`, and `[...slugs]`.
- API handlers in `route.ts` are excluded from this page list.
- This file is a filesystem inventory, not the authoritative active-route roadmap.
- Active optimization and prioritization should use `apps/www/src/components/sidebar/links.ts` (`linkModules`) as the source of truth for current user-facing navigation.
- Routes listed here but not represented in `linkModules` should be treated as possibly stale until reviewed.

## Public And Auth
- `/forgot-password` 
- `/login`
- `/login/v2`
- `/login/create-password`
- `/login/reset-password`
- `/password-reset`
- `/signin`
- `/report/login-token` 
- `/signout`

## Public Print And Shared Links
- `/p/model-template`
- `/p/sales-invoice`
- `/p/sales-invoice-v2`
- `/print-model`
- `/printer/customer-report`
- `/printer/sales`
- `/download/[...slugs]`

## Payments
- `/checkout/[token]`
- `/checkout/[token]/v2`
- `/square-payment/[emailToken]/[orderIds]`
  Legacy shim: when `?uid=...` is present, it derives a fresh valid checkout token from the legacy route params and redirects to `/checkout/[token]/v2`; otherwise it renders the legacy payment page.
- `/square-payment/[emailToken]/[orderIds]/payment-response/[paymentId]`
- `/square-payment-response/[paymentId]`
- `/payments`

## Community
- `/community`
- `/community/builders`
- `/community/install-costs`
- `/community/project-units`
- `/community/templates`
- `/community/unit-invoices`
- `/community/unit-productions`
- `/community/community-template/[slug]`
- `/community/community-template/[slug]/v1`
- `/community/customer-services`
- `/community/model-template/[slug]`
- `/community/template-schema`
- `/community/work-orders`
- `/community/invoices`
- `/community/productions`
- `/community/project/[slug]`
- `/community/projects`
- `/community/units`
- `/community-settings/builders`

## Sales Book
- `/sales-book`
- `/sales-book/accounting`
- `/sales-book/accounting/resolution-center`
- `/sales-book/production-tasks`
- `/sales-book/create-order`
- `/sales-book/create-quote`
- `/sales-book/edit-order/[slug]`
- `/sales-book/edit-quote/[slug]`
- `/sales-book/customers`
- `/sales-book/dispatch`
- `/sales-book/dispatch/v2` (compatibility redirect to `/sales-book/dispatch`)
- `/sales-book/dispatch-admin`
- `/sales-book/dispatch-task`
- `/sales-book/edit/[type]`
- `/sales-book/inbound-management`
- `/sales-book/orders`
- `/sales-book/orders/bin`
- `/sales-book/orders/v2` (compatibility redirect to `/sales-book/orders`)
- `/sales-book/orders/overview-v2`
- `/sales-book/productions` (compatibility redirect to `/sales-book/productions/v2`)
- `/sales-book/productions/v2`
- `/sales-book/quotes`
- `/sales-book/quotes/bin`
- `/__sales-book/[type]`

## Sales Forms Dashboard And V2
- `/sales-form/create-order`
- `/sales-form/create-quote`
- `/sales-form/edit-order/[slug]`
- `/sales-form/edit-quote/[slug]`
- `/sales-dashboard`
- `/sales/dashboard/delivery`
- `/sales/dashboard/orders`
- `/sales/dashboard/pending-evaluation`
- `/sales/dashboard/pickup`
- `/sales/dashboard/productions`
- `/sales/dashboard/quotes`
- `/sales/dashboard/overview/[...typeAndSlug]`
- `/sales/dispatch/[type]`
- `/sales/edit/[type]/[slug]`
- `/sales-rep`
- `/sales-v2/dealers`
- `/sales-v2/dimension-variants`
- `/sales-v2/door-svgs`
- `/sales-v2/doors-debug`
- `/sales-v2/productions`
- `/sales-v2/products`
- `/sales-v2/products/doors`
- `/sales-v2/products/shelf-items`

## Inventory
- `/inventory`
- `/inventory/categories`
- `/inventory/imports`
- `/inventory/inbounds`
- `/inventory/shipping/configuration`
- `/inventory/stocks`
- `/inventory/variants`
- `/product-report`

## Production And Jobs
- `/production/dashboard`
- `/production/dashboard/v2`
- `/jobs-dashboard`
- `/jobs-dashboard/jobs-list`
- `/jobs-dashboard/payments`
- `/jobs/[taskType]`

## Contractors
- `/contractor/assign-tasks`
- `/contractor/jobs`
- `/contractor/jobs/payments`
- `/contractor/jobs/payments/pay/[[...id]]`
- `/contractors/jobs/payment-dashboard`
- `/contractors/jobs/payment-portal`
- `/contractors/overview/[contractorId]`
- `/contractors/payout`
- `/contractors/payout/[slug]`

## Tasks
- `/tasks/installations`
- `/tasks/payments`
- `/tasks/punchouts`

## HRM
- `/hrm/contractors/jobs`
- `/hrm/document-approvals`
- `/hrm/employees`
- `/hrm/employees/v2`
- `/hrm/employees/v2/[id]`

## Customer Service
- `/customer-services`
- `/customer-service/[slug]`

## Settings
- `/settings/profile`
- `/settings/notification-channels`
- `/settings/email`
- `/settings/sales`
- `/settings/community/builders`
- `/settings/community/community-costs`
- `/settings/community/community-template/[slug]`
- `/settings/community/install-costs`
- `/settings/community/model-costs`
- `/settings/community/model-template/[slug]`
- `/settings/community/model-templates`

## Dealer And Guest Flow
- Dealer account management is currently exposed through `/sales-book/dealers`.
- Old dealer guest signup/create-password files under `apps/www/src/app-deps` were removed during the 2026-06-17 unused-code cleanup because they were not live `src/app` routes.

## Mail Utilities And Debug
- `/mail-grid/templates`
- `/site-actions`
- `/task-events`
- `/task-events/[eventName]`
- `/dyke`
- `/sand-box`
- `/sand-box/invoice-table`
- `/sand-box/zus-form`
- `/sentry-example-page`
- `/square-debug`
