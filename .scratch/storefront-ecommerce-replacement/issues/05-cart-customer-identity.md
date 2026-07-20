# Define lossless cart, wishlist, and customer identity continuity

**Type:** research

**Status:** implemented

**Blocked by:** Define the storefront security and API boundary; Define the
shared sales-form storefront surface and exposure contract

## Question

How should guest and authenticated carts/wishlists persist the normalized
sales-form configuration—including Dyke steps, door/HPT, moulding, shelf rows,
inventory identities, and prices—while supporting ownership, validation,
merge, expiry, recovery, repricing, signup, login, profile, and addresses?

## Comments

Use one server-owned Commerce Cart for guest and authenticated customers. Each
cart line must preserve enough canonical information to reproduce the
configured sales line:

- Storefront Offer and Dyke root identity;
- selected steps/components and dependency values;
- door/HPT rows, moulding rows, and shelf rows;
- inventory, variant, and component identities;
- quantity, customer-safe summary, configuration version, and pricing
  snapshot.

The server must validate and reprice configurations when adding, reopening,
editing, and beginning checkout. The UI should report changed price,
unavailable choices, or replaced defaults instead of silently altering a line.

Support add, edit configuration, update quantity, remove, clear, move to
wishlist, restore, and merge-at-login. Guest ownership should use a signed
server identity. Login merge should be atomic and define duplicate-line
behavior.

Wishlist entries should use the same configuration format without reserving
inventory or freezing price. Staff access to carts and wishlists should require
explicit permissions and be audited.
