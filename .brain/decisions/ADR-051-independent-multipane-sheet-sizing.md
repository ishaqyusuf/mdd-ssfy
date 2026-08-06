# ADR: Independent Multi-Pane Sheet Sizing

## Status

Accepted — 2026-08-06.

## Context

The shared custom sheet previously treated `secondarySize` as the maximum width
of one expanded shell, then divided that width between two growing flex
children. A primary `2xl` pane therefore became narrower when a secondary pane
opened, and the size assigned to one pane implicitly controlled the other.

## Decision

1. The contract is published as the opt-in
   `@gnd/ui/custom/sheet-v2` component. The legacy
   `@gnd/ui/custom/sheet` implementation remains unchanged, and Sales Overview
   is the first and only V2 consumer.
2. `primarySize` and `secondarySize` independently resolve to stable pane
   widths. They never represent percentages of a shared maximum.
3. A side-by-side shell is the numeric sum of the primary width, a dedicated
   1px divider, and the secondary width. For example, `2xl + 2xl` is two 42rem
   panes plus the divider, not Tailwind's unrelated `max-w-4xl` token.
4. Side-by-side mode is enabled only when both natural widths, the divider,
   the Midday frame, and a safe gutter fit. Otherwise the active pane replaces
   the other at one-pane width.
5. Pane slots use non-growing, non-shrinking flex bases. Content scrolls or
   wraps inside its pane and cannot redistribute sibling width.
6. V2 keeps the shadcn/Radix sheet chassis and follows the Midday frame and
   scale: a 520px default width token, transparent 16px desktop outer gutter,
   inset bordered surface, 24px desktop padding, 10px desktop radius, 300ms
   reveal, and 200ms hide.
7. Outside dismissal is layered. The first interaction closes an active
   secondary pane; a later interaction closes the primary. The overlay remains
   mounted through pointer-up to prevent clicks leaking to the page beneath.
8. Primary and secondary content use sheet-name-derived portal targets. The
   primary footer owns a fixed bottom slot inside the primary pane.

## Consequences

- Opening a secondary pane no longer compresses the primary pane.
- Existing sheet consumers do not change until they explicitly import V2.
- Different pane sizes can be combined without adding new outer-width tokens.
- Narrow screens show one usable pane instead of two compressed panes.
- Consumers must provide an `onCloseSecondary` handler to receive layered
  dismissal behavior.
- The width resolver is a public shared-UI contract and requires focused tests
  when the size scale changes.
- Future migrations can happen one sheet at a time and can be rolled back by
  restoring that consumer's V1 import.

## Alternatives

- Keep one outer max width and divide it with `flex-1`. Rejected because it
  makes pane widths dependent on each other.
- Interpret `2xl + 2xl` as `4xl`. Rejected because Tailwind size labels are
  predefined widths, not additive units.
- Shrink both panes until they fit. Rejected because form and table usability
  becomes viewport-dependent and violates the configured natural widths.
