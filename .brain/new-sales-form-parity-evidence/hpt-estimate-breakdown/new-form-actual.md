# New Form Actual

HPT line totals support a compact, shadcn-composed estimate breakdown:
- the Line cell is interactive and opens a `Card`-based menu;
- the header identifies the door, size, and quantity;
- contributor rows use aligned definition values and a separator before the final unit;
- add-on and custom price use compact input groups;
- the footer keeps the line total visible;
- the Estimate cell remains the separate base-price editor.

Anchor:
- `packages/sales/src/sales-form/ui/workflow/house-package-tool-panel.tsx`
- `packages/sales/src/sales-form/ui/workflow/door-price-cell.tsx`

Current parity status:
- Browser-verified on order `08893LM` on 2026-07-18.
- Clean compact layout and contributor data are present in the new form only.
- The accepted one-cent historical rounding variance is recorded in `repro.md` and is not a blocker for this pass.
