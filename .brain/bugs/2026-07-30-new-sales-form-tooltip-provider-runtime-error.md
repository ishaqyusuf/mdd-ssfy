# New Sales Form Tooltip Provider Runtime Error

- Date: 2026-07-30
- Status: Fixed
- Surface: `/sales-form/create-order`

## Symptom

The create-order page rendered the application error boundary with:

```text
`Tooltip` must be used within `TooltipProvider`
```

The browser stack identified `renderCalculatedComponentPrice` in
`item-workflow-panel.tsx`.

## Root Cause

`ItemWorkflowPanel` rendered calculated-price and workflow-detail tooltips, but
its final panel tree was not wrapped in the matching `@gnd/ui/tooltip`
`TooltipProvider`. Other sales-form subtrees supplied their own local provider,
which did not cover the root-component picker path.

## Fix

Wrap the complete `ItemWorkflowPanel` render tree in one
`TooltipProvider delayDuration={120}`. This covers current root-picker,
component, and workflow tooltips without adding providers around individual
cards.

## Regression Signal

`workflow-capabilities.test.ts` now asserts that the final item-workflow panel
return is enclosed by `TooltipProvider`. The test failed before the fix and
passes afterward.

Authenticated browser verification confirmed that the create-order form loads
through the customer picker and component grid without the error boundary or
new console errors.

