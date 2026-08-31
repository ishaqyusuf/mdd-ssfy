# Priority Email Design Review — 2026-08-30

## Outcome

The ranked priority set of 20 email templates now uses the reusable GND
standard-email system. Production payloads, recipients, attachment behavior,
conditional actions, and delivery semantics were preserved. The daily sales
payment report was migrated from job-owned raw HTML into a React Email template
so it can use and preview the same system.

## Review Standard

- Brand and document identity remain visible without competing with the email's
  purpose.
- One clear headline and event-specific status establish hierarchy.
- Dense financial and operational details use responsive summary panels and
  rows rather than app-like chrome.
- Primary, secondary, and risk actions retain distinct emphasis and minimum
  practical touch height.
- Explicit light-mode inline colors remain the safe production default; scoped
  dark-mode styles cover the reviewed dark presentation.
- Mobile summaries stack at the 600px breakpoint, panels use the full available
  width, and long values may wrap without forcing horizontal scroll.
- Signatures use the resolved person/team and the relevant department while
  keeping one common physical-address/reply convention.

The formal GStack design-review command was not run because its clean-branch
and commit prerequisites would have required disturbing a heavily dirty shared
worktree. Its report-only visual criteria were applied manually to every live
preview: hierarchy, spacing, contrast, action emphasis, responsiveness,
overflow, content completeness, and runtime behavior.

## Ranked Completion Record

Screenshot root:
`/Users/M1PRO/.codex/visualizations/2026/08/29/01a04f2d-284a-7ea3-8eaf-eb9befae8786/email-design-review`

Each listed directory contains `desktop-dark.png` and `mobile-dark.png`.

| Rank | Template | Family | Result |
| ---: | --- | --- | --- |
| 1 | `sales-email` | Core sales document | Pass |
| 2 | `composed-sales-document-email` | Core sales document | Pass |
| 3 | `customer-statement` | Statement | Pass |
| 4 | `sales-customer-payment-received` | Customer payment | Pass |
| 5 | `sales-customer-payment-failed` | Customer payment | Pass |
| 6 | `sales-customer-refund-completed` | Customer refund | Pass |
| 7 | `storefront-order-confirmation` | Storefront order | Pass |
| 8 | `special-order-approval-request` | Special Order | Pass |
| 9 | `special-order-status-notification` | Special Order | Pass |
| 10 | `sales-rep-online-payment-received` | Internal sales payment | Pass |
| 11 | `sales-daily-payment-report` | Accounting report | Pass |
| 12 | `sales-reminder-schedule-admin-notification` | Sales automation | Pass |
| 13 | `dealer-program-status` | Dealer/operational status | Pass |
| 14 | `composed-email` | Generic composed mail | Pass |
| 15 | `storefront-custom-inquiry-received` | Storefront inquiry | Pass |
| 16 | `storefront-password-reset-request` | Storefront auth | Pass |
| 17 | `login-link-email` | Authentication | Pass |
| 18 | `auth-new-device-login` | Account security | Pass |
| 19 | `auth-master-password-login-alert` | Privileged-access security | Pass |
| 20 | `dispatch-driver` | Fulfillment operations | Pass |

## Live Gallery Regression

All 20 routes were loaded in the in-app React Email gallery at 640px desktop
and 375px mobile preview widths after the final shared-component change.

- 20/20 desktop states contained route-specific, non-empty content.
- 20/20 mobile states contained route-specific, non-empty content.
- 0 horizontal-overflow offenders were found across all 40 states.
- `documentElement.scrollWidth` equaled `clientWidth` in every state.
- The gallery was returned to
  `https://email.localhost/preview/sales-email?width=640&height=1100` for review.

## Automated Verification

- `bun test packages/email`: 19 passed, 0 failed, 62 assertions.
- Focused notification/email-service tests: 14 passed, 0 failed, 30 assertions.
- `bun --cwd packages/email typecheck`: pass.
- Scoped Biome check across the shared system, 20 templates, handlers, and
  daily-report job: pass (29 files).
- `bun --cwd packages/jobs typecheck`: blocked by two pre-existing unrelated
  errors in `packages/inventory/src/application/inbound/inbound-demand.ts:2167`
  and `packages/sales/src/sales-control/actions.ts:113`. No email-report
  diagnostic was emitted.

## Remaining Inventory

This pass intentionally stops at the approved top 20. Lower-priority dealer,
contractor, storefront lifecycle, and app-download templates remain available
in the gallery on their existing designs. The two contractor-accounting raw
HTML emitters also remain outside React Email. Their migration requires a
separate approved batch and state review.
