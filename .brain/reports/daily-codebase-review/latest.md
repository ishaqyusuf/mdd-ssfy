# Latest Daily GND Codebase Review

Latest report: [2026-08-06](./2026-08-06.md)

## Executive Summary

This read-only review used `.brain/` as the active Brain path because this workspace does not have a top-level `brain/` directory. The requested `apps/www` and `apps/expo-app` surfaces map to the current `apps/dashboard` and `apps/mobile` workspaces. I reviewed those, plus `apps/dealership`, `apps/api`, and the requested shared packages.

The highest current risk is still operational boundary drift, but today's strongest version is more specific than prior reports: the mobile dispatch proof-completion path is now protected and assignment-bound, while mobile dispatch start/cancel still goes through the generic public `taskTrigger` route. That means the safer protected dispatch route boundary is not consistently the operational path for drivers.

The second major risk is a contract mismatch in the newly documented customer-approved quantity-change workflow. Brain says release one creates a manual customer approval link and keeps the sale unchanged until token-scoped customer approval. Source now approves as an authenticated sales-rep action, returns no approval token, and has a regression test asserting no customer link. That is either stale Brain documentation or a product/financial approval bug; it needs a same-day decision because it affects customer trust and wallet-credit accountability.

The third major risk remains public payment/customer context. The customer pay portal is still account-number/phone keyed and returns pending sales, wallet balance, payment method, terminal context, and customer contact fields. Checkout/payment initialization and verification routes are also public. Some public surfaces are intentional for customer entry points, but the current boundary is too broad for revenue and customer data.

The worktree had one pre-existing source change before report writing: `packages/jobs/trigger.config.ts` adds `mode: "legacy"` to the Trigger Prisma extension. It was not changed by this review.
