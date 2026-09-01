# Define the status-only sales completion contract

Type: grilling
Status: resolved
Blocked by:

## Question

What product and domain contract must Status-only Production Completion and Fulfillment follow so the feature can be handed off safely for implementation?

## Answer

Resolved with the product owner through the complete Q1–Q15 decision sequence. The preserved result is [Status-only sales completion — acceptance criteria](../spec.md). GND-specific implementation compatibility remains gated by the separate open reconciliation ticket.

The contract distinguishes milestone type from completion method, treats Fulfillment as implying Production Completion, restricts Status-only mutation through the established role-permission standard, prevents workflow business effects, centralizes effective-state resolution, preserves cancelled history, and limits the first release to single-order actions.
