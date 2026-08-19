# Define Canonical Square Payment Identity

Type: grilling
Status: open
Blocked by: 01, 02
Parent: [`../map.md`](../map.md)

## Question

How should GND persist and resolve the actual refundable Square tender payment
id across payment-link, Terminal, and card flows; distinguish it from local
Square rows, Square order ids, payment-link placeholders, and Terminal checkout
ids; safely recover eligible existing payments; and prevent a refund from ever
targeting an identifier unrelated to the selected Sales payment?
