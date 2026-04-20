# Feature: Sales Payment V2 Checkout

## Goal

- Evolve checkout v2 from a guest-only payment surface into a flexible customer payment experience.
- Let customers choose a preferred payment option during checkout instead of forcing a single path.
- Extend checkout token lifetime so valid payment attempts are less likely to fail due to expiration.
- Add an optional quick account-creation step so customers can set a password during checkout.
- Expose wallet visibility and a post-login customer dashboard for returning customers.

## User Flow

1. Customer opens a checkout v2 link from a payment token.
2. Legacy `/square-payment/[emailToken]/[orderIds]?uid=...` links mint a fresh valid checkout token from the authorized legacy order set, then server-redirect into `/checkout/[token]/v2`.
3. Checkout resolves the order, customer context, token validity, and available payment options.
4. Customer can continue as a guest or quickly create a password to enable login.
5. Customer selects a preferred payment option.
6. If logged in, checkout also shows wallet information relevant to the order/payment journey.
7. Customer completes payment or uses wallet-assisted flows when available.
8. After authentication/payment, customer can continue into a customer dashboard experience.

## Data Model

- Existing checkout token/payment records are involved.
- Existing customer/account records are involved for quick password creation and logged-in checkout.
- Existing wallet/customer balance records are involved for wallet visibility.
- TODO: Confirm the exact table/model names for checkout token expiry ownership.
- TODO: Confirm whether preferred payment selection persists on the checkout record, order, customer profile, or all three.

## API Endpoints

- Existing checkout routes back checkout v2 token resolution, payment-link creation, and payment verification.
- Additional auth/account endpoints are required for quick password creation and customer login.
- Additional customer/wallet/dashboard query surfaces are required for logged-in checkout and dashboard loading.
- TODO: Document the exact route names once implementation contracts are finalized.

## UI Screens

- Public checkout v2 page for token-based payment.
- Legacy payment route shim that converts old link params into a fresh checkout token for v2 while preserving the fallback legacy page when token minting is not possible.
- Public quote-acceptance page that converts an approved quote into a payable order experience.
- Logged-in checkout variant that shows wallet information.
- Quick create-password/login affordance within checkout.
- Customer dashboard entry screen after login/checkout.

## Quote Acceptance Flow

1. Customer opens the public quote-acceptance link from the sales email.
2. Accepting the quote reuses the existing `sendToInvoice` copy behavior instead of mutating the quote in place.
3. The original quote remains in the system, and a new order copy is created for payment.
4. The accept page stores the new order number in URL query state so refreshes and repeat visits stay anchored to the created order.
5. Payment token generation uses the accepted order record.
6. Acceptance also triggers the shared sales document email flow for the newly created order.

## Edge Cases

- Expired or invalid checkout token.
- Token expires during an active payment attempt or while the customer is creating a password.
- Customer already has an account when using quick password setup.
- Preferred payment option is unavailable for the order/customer/store context.
- Wallet balance exists but is insufficient for full payment.
- Guest checkout and logged-in checkout must remain consistent for order/payment status.

## Permissions

- Public users can access tokenized checkout while the token is valid.
- Authenticated customers can access logged-in checkout enhancements and customer dashboard surfaces.
- TODO: Confirm whether wallet visibility requires full login or can be partially exposed via tokenized checkout.

## Future Improvements

- Persist preferred payment defaults to the customer profile for future checkouts.
- Add wallet-first and split-payment flows.
- Add dashboard payment history, saved methods, and reminder/resume flows.
- Add analytics around guest-to-account conversion and checkout completion rates.
