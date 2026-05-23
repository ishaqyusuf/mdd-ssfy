# GND www Design System

## Product Context

GND www is the operational web desk for GND Millwork Corp. The interface supports sales, quotes, orders, production, inventory, dispatch, contractors, payments, reports, HRM, and community project workflows. The design system should feel precise, industrial, calm, accountable, and fast to scan.

The product is not a marketing site. It is a dense professional workspace for repeated daily use by office staff, production teams, dispatchers, sales reps, contractors, dealers, and administrators.

## Design Principles

- Fast scanning first: prioritize compact hierarchy, clear grouping, stable table layouts, and obvious next actions.
- Operational calm: use restrained color, low-contrast surfaces, and measured motion so urgent work stands out.
- Industrial precision: align edges, use durable spacing, and avoid decorative softness that makes the product feel casual.
- Accountable states: every order, task, payment, and production item should communicate status, owner, and risk clearly.
- Accessible by default: meet WCAG AA contrast, provide visible focus, avoid color-only meaning, and support keyboard workflows.

## Brand Direction

Use the existing GND Millwork logo as the identity anchor:

- Primary blue: `#405BA9`
- Action red: `#F21F2B`
- Graphite: `#303236`
- Neutral gray: `#8A8D8F`
- Work-surface neutrals: white, slate-tinted backgrounds, low-contrast borders

The blue is the main brand and trust color. The red is reserved for destructive actions, urgent exceptions, overdue states, failed payments, and critical production blockers. Graphite and gray carry text, frames, and quiet structure.

Avoid one-note blue screens. Pair brand blue with graphite, cool slate neutrals, white work surfaces, green success states, amber warnings, and red exceptions.

## Typography

Primary font: `Geist Sans`, falling back to system UI sans-serif.

Monospace font: `Geist Mono`, falling back to `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, and `Consolas`.

Use `Geist Mono` for:

- Order numbers
- Quote numbers
- Invoice numbers
- Job IDs
- Payment references
- SKUs
- Technical values
- Compact timestamps inside tables or status rows

Recommended scale:

| Token | Size | Line height | Use |
| --- | ---: | ---: | --- |
| `--text-xs` | 12px | 16px | Badges, metadata, helper text, table secondary values |
| `--text-sm` | 14px | 20px | Default controls, dense tables, labels, sheet content |
| `--text-base` | 16px | 24px | Forms, public payment pages, readable body copy |
| `--text-lg` | 18px | 28px | Section titles, modal titles, compact card headings |
| `--text-xl` | 20px | 28px | Page titles in app shells |
| `--text-2xl` | 24px | 32px | Dashboard overview headings |
| `--text-3xl` | 30px | 36px | Public auth/payment page headings only |

Operational screens should default to `14px` text with clear weight contrast instead of oversized headings.

## Color Tokens

Map these tokens to the existing shadcn-style CSS variable surface used by `@gnd/ui`.

### Light Mode

```css
:root {
  --background: oklch(0.992 0.003 250);
  --foreground: oklch(0.19 0.014 260);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.19 0.014 260);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.19 0.014 260);

  --primary: #405BA9;
  --primary-foreground: #ffffff;
  --secondary: oklch(0.958 0.006 255);
  --secondary-foreground: #303236;
  --muted: oklch(0.962 0.006 255);
  --muted-foreground: oklch(0.47 0.018 255);
  --accent: oklch(0.948 0.018 254);
  --accent-foreground: #233362;

  --destructive: #F21F2B;
  --destructive-foreground: #ffffff;
  --success: #15803d;
  --success-foreground: #f0fdf4;
  --warning: #b45309;
  --warning-foreground: #fffbeb;
  --info: #2563eb;
  --info-foreground: #eff6ff;

  --border: oklch(0.895 0.012 255);
  --input: oklch(0.895 0.012 255);
  --ring: #405BA9;

  --sidebar: oklch(0.974 0.008 255);
  --sidebar-foreground: #303236;
  --sidebar-primary: #405BA9;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: oklch(0.938 0.018 254);
  --sidebar-accent-foreground: #233362;
  --sidebar-border: oklch(0.885 0.014 255);
  --sidebar-ring: #405BA9;
}
```

### Dark Mode

```css
.dark {
  --background: oklch(0.16 0.012 260);
  --foreground: oklch(0.965 0.004 255);
  --card: oklch(0.205 0.014 260);
  --card-foreground: oklch(0.965 0.004 255);
  --popover: oklch(0.205 0.014 260);
  --popover-foreground: oklch(0.965 0.004 255);

  --primary: #6f86d8;
  --primary-foreground: #0e1630;
  --secondary: oklch(0.265 0.014 260);
  --secondary-foreground: oklch(0.955 0.004 255);
  --muted: oklch(0.265 0.014 260);
  --muted-foreground: oklch(0.72 0.018 255);
  --accent: oklch(0.295 0.026 255);
  --accent-foreground: oklch(0.955 0.014 254);

  --destructive: #ff4d57;
  --destructive-foreground: #ffffff;
  --success: #22c55e;
  --success-foreground: #052e16;
  --warning: #f59e0b;
  --warning-foreground: #451a03;
  --info: #60a5fa;
  --info-foreground: #082f49;

  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 16%);
  --ring: #6f86d8;

  --sidebar: oklch(0.13 0.016 260);
  --sidebar-foreground: oklch(0.955 0.004 255);
  --sidebar-primary: #6f86d8;
  --sidebar-primary-foreground: #0e1630;
  --sidebar-accent: oklch(0.235 0.022 260);
  --sidebar-accent-foreground: oklch(0.955 0.004 255);
  --sidebar-border: oklch(1 0 0 / 12%);
  --sidebar-ring: #6f86d8;
}
```

### Chart Tokens

Use charts for comparison and trend reading, not decoration.

```css
:root {
  --chart-1: #405BA9;
  --chart-2: #15803d;
  --chart-3: #b45309;
  --chart-4: #7c3aed;
  --chart-5: #475569;
}
```

## Layout And Spacing

- Base radius: `8px` for app surfaces and controls.
- Compact radius: `6px` for dense table controls, tags, badges, and filter pills.
- Larger radius: `12px` only for primary dashboard panels, public auth/payment shells, and major modals.
- Avoid `rounded-3xl` for operational cards unless the screen is intentionally public or presentation-focused.
- Use an 8px spacing grid.
- Dense tables and forms can use 4px increments internally.
- Shell content should use constrained gutters, not floating page cards.
- Sidebar navigation should feel anchored, slim, and high signal.

Recommended spacing tokens:

| Token | Value | Use |
| --- | ---: | --- |
| `--space-1` | 4px | Icon gaps, compact table padding |
| `--space-2` | 8px | Control gaps, badge padding |
| `--space-3` | 12px | Dense cards, inputs |
| `--space-4` | 16px | Default panel padding |
| `--space-5` | 20px | Page section rhythm |
| `--space-6` | 24px | Dashboard section spacing |
| `--space-8` | 32px | Public page blocks |

## Component System

### Buttons

Use icon buttons for toolbar actions when a recognizable Lucide icon exists. Use text buttons only for clear commands such as "Create order", "Save", "Send invoice", or "Export".

Variants:

- Primary: brand blue, main constructive action.
- Secondary: neutral filled action for common non-primary tasks.
- Outline: table row actions, filters, dialogs, secondary workflows.
- Ghost: icon actions, navigation controls, low-risk contextual controls.
- Destructive: red, only for delete, cancel, void, reject, or irreversible actions.
- Link: inline navigation and low-emphasis references.

States:

- Focus ring must be visible and use `--ring`.
- Loading state should preserve button width and show a spinner or progress affordance.
- Disabled state must reduce opacity but keep label readable.

### Badges And Status

Statuses need both color and language or icon shape. Do not rely on color alone.

Recommended status families:

- Success: completed, paid, approved, delivered, active.
- Warning: pending, queued, partial, awaiting review, low stock.
- Destructive: overdue, failed, blocked, rejected, canceled, missing required document.
- Info: scheduled, assigned, in progress, synced.
- Neutral: draft, archived, unknown, not started.

Badges should be compact, semibold, and readable inside tables. Use uppercase only for short operational codes.

### Tables

Tables are the core surface of the app.

- Prefer sticky headers on scrollable operational tables.
- Keep row height stable.
- Put primary identifiers in the first or second column.
- Use `Geist Mono` for IDs, SKUs, order numbers, and invoice references.
- Use row density controls only where table volume is high.
- Keep bulk actions pinned near selection state.
- Avoid hover effects that move layout.
- Use subtle row background changes for hover and selection.
- Empty table states should include the missing object type and a clear recovery action.

### Cards And Panels

Cards should frame repeated items, metrics, or focused tools. Avoid cards inside cards.

- Dashboard metric cards: compact, bordered, white or card background, one primary number, one label, optional trend.
- Operational panels: use `border`, `bg-card`, and light shadow only when elevation clarifies layering.
- Error panels: use red border/background sparingly and include an action path.
- Cards should not use large decorative gradients.

### Forms

Forms should be quick to complete and easy to audit.

- Labels stay visible above fields for business-critical data.
- Required fields must be textually indicated.
- Validation errors appear near the field and in summary where forms are long.
- Money, quantity, dates, order numbers, and IDs should use consistent formatting.
- Multi-step sales and production forms should show progress, current step, saved state, and blockers.

### Search Filters

Search/filter surfaces should support repeated operational use.

- Search input should be first in the row.
- Filters use compact controls with clear active states.
- Active filters should be removable individually.
- Provide a clear reset action when filters are active.
- Date filters should show explicit ranges.

### Tabs

Tabs are for peer views of the same workflow.

- Keep tab labels short.
- Use count badges where volume matters.
- Use active state with both color and shape/border contrast.
- Do not use tabs for unrelated destinations better suited to sidebar nav.

### Sheets And Dialogs

Use sheets for detail review, row drill-in, side-by-side operational work, and long forms. Use dialogs for focused confirmation or short forms.

- Sheets should support keyboard close and focus return.
- Destructive dialogs must name the affected record.
- Long sheets need sticky headers and footers.
- Dialog text should be direct and operational.

### Empty, Loading, And Error States

- Loading states should use skeletons that match final layout dimensions.
- Empty states should be small and useful, not illustrative.
- Error states should identify what failed, whether data is safe, and what the user can do next.
- Toasts should be concise and should not replace inline validation for forms.

### Navigation And Sidebar

The sidebar should make workflow modules easy to distinguish:

- Sales
- Production
- Inventory
- Dispatch
- Community
- Contractors
- HRM
- Settings

Use icons as orientation markers, not decoration. Active navigation must be obvious in light and dark mode.

### Public Payment And Auth Screens

Payment and auth flows can be more spacious than internal dashboards, but should still feel like GND operations.

- Use the GND logo prominently.
- Keep forms centered and readable.
- Use blue for primary submit/payment actions.
- Use red only for failed payment, expired token, or destructive states.
- Avoid marketing hero composition on these utility pages.

### Print-Safe Views

Print routes must prefer black text, white backgrounds, clear table borders, and predictable page breaks.

- Do not depend on brand color for meaning in printed reports.
- Avoid shadows, gradients, sticky UI, and interactive-only affordances.
- Use mono identifiers where it improves reconciliation.

## Motion

Motion should be functional and short.

- Use 120ms to 180ms for hover/focus/control transitions.
- Use 180ms to 240ms for dialogs, sheets, and dropdowns.
- Avoid bouncing, parallax, decorative looping animation, and layout-moving hover transforms.
- Respect reduced motion preferences.

## Accessibility

- Meet WCAG AA contrast for text, icons, focus indicators, and status badges.
- All interactive controls need a visible focus state.
- Icon-only buttons need accessible labels and tooltips for unfamiliar actions.
- Do not communicate status by color alone.
- Keep touch targets at least 36px in dense app surfaces and 44px in public/mobile flows.
- Dialogs, sheets, popovers, and menus must trap or manage focus correctly.
- Tables must preserve readable header relationships and keyboard access.
- Avoid tiny text below 12px except nonessential print metadata.

## Implementation Notes

This system should be implemented in `@gnd/ui` first, then consumed by `@gnd/www`.

Preferred mapping:

- Put design tokens in `packages/ui/src/styles/globals.css`.
- Keep component primitives in `packages/ui/src/components`.
- Keep variants in `class-variance-authority` where existing components already use it.
- Preserve the existing shadcn/Radix architecture.
- Use `lucide-react` icons for common UI actions unless a domain-specific icon already exists.
- Keep Tailwind class names aligned with existing CSS variables: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `bg-destructive`, and `ring-ring`.

## Acceptance Criteria

- The Stitch design system communicates the GND operational desk identity clearly.
- The system includes light and dark mode token guidance.
- The system gives concrete component direction for the actual www workflows.
- The document can be used as a future implementation source for `@gnd/ui`.
- The system does not apply changes to existing screens until a separate implementation pass selects target routes.
