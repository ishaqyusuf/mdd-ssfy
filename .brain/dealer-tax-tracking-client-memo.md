# Recommended Tax and Profit Tracking Model for Dealer Sales

Prepared for: GND Client Review  
Prepared by: GND  
Date: May 23, 2026

## Executive Summary

The dealership system should keep the two pricing layers separate:

- **GND/internal pricing**: the cost or selling amount used between GND and the dealer.
- **Dealer/customer-facing pricing**: the amount the dealer presents to their own customer after applying their markup.

Dealer markup should be tracked clearly as dealer profit or margin. It should not be hidden inside tax, and it should not be treated as a separate tax line. In most dealer resale workflows, if the dealer is the legal seller to the customer, sales tax should generally be calculated from the customer-facing taxable sale amount, including the dealer markup.

This memo is a system and accounting design recommendation. It is not legal or tax advice. Seller-of-record status, resale certificate handling, and state-specific sales tax rules should be confirmed with the client's CPA or tax advisor.

## Why This Matters

The dealership flow has two cost calculation layers:

1. GND calculates the internal amount for the order.
2. The dealer applies a percentage adjustment, such as `+20%`, before charging their own customer.

That second amount creates the dealer's gross profit before other dealer costs. The system should make that profit visible in reporting, but tax should be calculated according to the legal sales structure.

The key question is: **who is the seller of record for the end-customer sale?**

## Recommended Operating Model

### When the Dealer Is Seller of Record

If the dealer invoices the end customer, collects payment from the end customer, and is legally responsible for the customer sale, then the system should treat the dealer/customer-facing total as the tax basis for that customer transaction.

In this model:

- GND/internal pricing is used to track the dealer's cost.
- Dealer/customer-facing pricing is used for the customer's quote, invoice, and tax calculation.
- Dealer markup is tracked as dealer gross profit or margin.
- Sales tax is generally calculated on the taxable customer-facing amount, including markup.

This is the recommended system model when dealers are charging their own customers directly.

### When GND Is Seller of Record

If GND invoices the end customer, collects payment from the end customer, and is legally responsible for the sale, then GND's customer-facing sale controls the tax treatment.

In this model, the dealer's added amount may need to be treated differently, such as a commission, referral fee, or partner revenue. That structure should be confirmed contractually and reviewed by a tax advisor before the system treats the dealer markup as part of a customer-facing taxable sale.

## Treatment of Dealer Profit

Dealer profit should be tracked explicitly:

```text
Dealer gross profit = dealer pre-tax subtotal - GND/internal pre-tax subtotal
```

For example, if GND's internal taxable subtotal is `$1,000` and the dealer applies a `20%` markup, the dealer/customer taxable subtotal becomes `$1,200`. The dealer's gross profit before other costs is `$200`.

This `$200` should be visible in dealer reporting. It should not be shown as a separate tax line. If the dealer is the seller of record, it is part of the customer-facing sale price and is included in the taxable basis where the item or service is taxable.

## Example Calculation

| Item | Amount |
| --- | ---: |
| GND/internal taxable subtotal | `$1,000` |
| Dealer markup | `20%` |
| Dealer/customer taxable subtotal | `$1,200` |
| Tax rate | `8%` |
| Customer-facing tax if dealer is seller of record | `$96` |
| Dealer gross profit before other costs | `$200` |

In this example, if the dealer is seller of record, the customer-facing tax is calculated from `$1,200`, not `$1,000`.

```text
$1,200 x 8% = $96
```

The dealer's gross profit is calculated separately:

```text
$1,200 - $1,000 = $200
```

## Invoice Print Views

The system should support two invoice print views for dealer-owned documents: **Dealer Mode** and **Customer Mode**. Both views come from the same order data, but they present different pricing surfaces depending on the audience.

### Dealer Mode

Dealer Mode is for internal review between GND and the dealer. It should show the GND/internal pricing layer.

Dealer Mode should calculate and display:

- GND/internal line prices.
- GND/internal subtotal.
- GND/internal taxable subtotal.
- GND/internal tax, if tax applies to the GND-to-dealer transaction.
- GND/internal grand total.
- Dealer markup and gross profit as reporting values, when useful.

Calculation flow:

```text
Base item price
x GND/internal pricing coefficient
= GND/internal unit price

GND/internal unit price
x quantity
= GND/internal line total

Sum of GND/internal taxable lines and taxable charges
x applicable tax rate
= GND/internal tax
```

Dealer Mode should help the dealer understand their cost basis and profit. It should not be the document sent to the dealer's end customer when the dealer is seller of record.

### Customer Mode

Customer Mode is for the dealer's customer. It should show the dealer/customer-facing pricing layer and hide GND's internal pricing.

Customer Mode should calculate and display:

- Dealer/customer-facing line prices.
- Dealer/customer-facing subtotal.
- Dealer/customer taxable subtotal.
- Customer-facing tax.
- Customer-facing grand total.

Calculation flow:

```text
GND/internal unit price
x (1 + dealer markup percentage)
= dealer/customer unit price

Dealer/customer unit price
x quantity
= dealer/customer line total

Sum of dealer/customer taxable lines and taxable charges
x applicable customer tax rate
= customer-facing tax
```

Customer Mode should be used for the end-customer invoice when the dealer is seller of record. In that case, tax is generally calculated from the dealer/customer-facing taxable amount, not the GND/internal amount.

### Practical Result

Using the example above:

- Dealer Mode shows the GND/internal taxable subtotal of `$1,000`.
- Customer Mode shows the dealer/customer taxable subtotal of `$1,200`.
- If the customer tax rate is `8%`, Customer Mode shows `$96` tax.
- The `$200` difference is tracked as dealer gross profit, not as a separate tax line.

This keeps the invoice view honest for each audience: GND and the dealer can see cost and profit, while the end customer sees only the actual customer sale amount.

## Dealer Tax Model Selection

Dealers should have access to the tax system and be able to select the applicable tax model for each quote or invoice. This is important because the correct tax treatment can depend on the customer location, product or service type, delivery rules, labor treatment, resale status, and the dealer's own tax obligations.

The selected tax model should control:

- The tax rate or rate schedule used for the customer-facing invoice.
- Which line items, services, delivery fees, labor, discounts, and custom charges are taxable.
- Whether the selected tax model applies to Dealer Mode, Customer Mode, or both.
- Whether resale certificate handling applies to the GND-to-dealer side of the transaction.

For auditability, the system should save a tax snapshot on the quote or order when the dealer selects a tax model. The snapshot should include the selected tax model, rate, taxable basis, taxable line decisions, and calculated tax amount. If tax rules or rates change later, the historical invoice should still show the tax model that was used at the time of the transaction.

Recommended behavior:

- Dealer selects the applicable tax model while preparing the quote or invoice.
- Customer Mode calculates tax from the dealer/customer taxable subtotal using the selected tax model.
- Dealer Mode calculates internal tax only if the selected model or GND-to-dealer transaction requires it.
- The system stores the selected tax model and tax calculation snapshot with the order.

## Recommended System Fields

To keep the records clean and audit-friendly, the system should store both pricing layers and the tax basis used for the transaction.

Recommended fields:

- `sellerOfRecord`
- `selectedTaxModelId`
- `selectedTaxModelName`
- `selectedTaxModelSnapshot`
- `internalSubtotal`
- `internalTaxableSubtotal`
- `internalTax`
- `dealerSubtotal`
- `dealerTaxableSubtotal`
- `dealerCustomerTax`
- `dealerMarkupAmount`
- `dealerMarkupPercent`
- `resaleCertificateOnFile`

These fields allow the business to answer four separate questions:

- What did GND charge or cost the dealer?
- What did the dealer charge the customer?
- What amount was used to calculate customer-facing tax?
- What gross profit did the dealer earn before other costs?

## Resale Certificate Consideration

If GND sells to the dealer and the dealer resells to the end customer, the GND-to-dealer transaction may be eligible for resale treatment if the dealer provides a valid resale certificate and the transaction qualifies under the applicable state rules.

The system should not assume resale exemption automatically. It should track whether a resale certificate is on file and whether it applies to the transaction.

## Final Recommendation

Use the dealer/customer-facing amount for customer quotes, invoices, and customer-facing tax when the dealer is the seller of record. Keep the GND/internal amount as the dealer's cost basis. Track the difference as dealer gross profit.

This gives the client a clean separation between:

- Internal cost
- Dealer customer price
- Sales tax
- Dealer profit

That separation makes the system easier to audit, easier to explain to dealers, and safer for future reporting.

## Tax Advisor Review

Before this model is finalized operationally, the client should confirm the following with a CPA or tax advisor:

- Whether GND or the dealer is the seller of record.
- Whether dealer purchases from GND qualify as resale transactions.
- Which products, services, delivery fees, labor, discounts, and custom charges are taxable in each state.
- Whether the dealer or GND is responsible for collecting and remitting tax in each transaction type.

Official recordkeeping guidance from the IRS emphasizes keeping records that clearly show business income and expenses. State sales tax agencies also generally require proper documentation for resale treatment. Because these rules vary by state and transaction type, the system should preserve clear records rather than rely on assumptions.
