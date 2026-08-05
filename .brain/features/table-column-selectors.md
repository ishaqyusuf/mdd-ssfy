# Table Column Selectors

## Purpose

Every dashboard table column-visibility dropdown uses one recognizable column
glyph instead of displaying the icon registry's Search fallback.

## Shared Contract

- All 60 column-visibility components render their trigger through the shared
  `Icons.Tune` compatibility alias.
- `Icons.Tune` and the semantic `Icons.ColumnsIcon` alias both resolve to the
  installed Hugeicons `Columns3` asset.
- The focused icon regression protects both selector aliases from silently
  resolving to Search if an invalid glyph name is introduced.

## Acceptance Evidence

- The focused icon regression renders both selector aliases to identical markup
  and proves that markup differs from Search.
- A repository audit confirms all 60 column-visibility components use the shared
  selector alias.
- Browser rendering confirms the 18px three-column glyph remains legible in the
  36px selector control and retains an accessible control name.
