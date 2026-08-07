# 01 — Compact Finance ledger columns and persistent visibility

**What to build:** Make the Sales Finance payments ledger denser by applying the shared Sales Orders small-column sizing to Invoices, Received, Refunded, Sub Total, Invoice Total, Applied, Unapplied, and Review. Give operators an accessible column control that shows or hides eligible Finance columns and preserves those choices across reloads and Finance tab changes, without weakening the ledger's existing sticky, resize, reorder, virtual-scroll, or divider behavior.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Invoices, Received, Refunded, Sub Total, Invoice Total, Applied, Unapplied, and Review use the canonical small-column dimensions: 120px default, 100px minimum, and 180px maximum.
- [x] The column control is available on both All Payments and Review Queue and exposes every eligible Finance ledger column with a clear accessible label.
- [x] Selection, Payment, and Actions remain visible and cannot be hidden.
- [x] Column visibility choices persist through reloads and when moving between All Payments and Review Queue.
- [x] Hiding or restoring columns preserves header/body alignment, sticky positioning, column resizing and reordering, dividers, virtualization, and table-owned horizontal scrolling.
- [x] Focused automated coverage and authenticated browser validation prove compact sizing, visibility toggling, persistence, and responsive layout behavior.
