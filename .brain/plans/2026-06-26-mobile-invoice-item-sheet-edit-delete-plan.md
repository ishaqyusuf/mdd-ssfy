# Mobile Invoice Item Sheet Edit/Delete Plan

## Objective

Remove the inline `Item 1` title/description input from the top of the mobile invoice form item workflow, and move item title edit/delete actions into the invoice items bottom-sheet flow. The items list sheet should show each item row with edit and delete icon actions, delete should open a confirmation bottom sheet, and edit should open a title-edit bottom sheet that returns to the list after cancel or proceed.

## Assumptions

- Item title editing should update the invoice item's display title through the existing invoice form store, not add API or database contracts.
- The active item header should remain the primary visible item title once the top inline input is removed.
- Cancel from edit/delete should return to the item list sheet, matching the requested nested-sheet flow.
- Delete should remove the selected invoice item section and keep active-index navigation stable.
- The existing `FloatingBottomSheet` remains the standard sheet primitive for this workflow.

## Detailed Execution Plan

1. Preserve item ownership in `ItemsStep`
   - Keep item sheet open/edit/delete state inside `apps/expo-app/src/features/sales/invoice-form/components/items-step.tsx`, because it already owns `activeIndex`, `itemSections`, sheet presentation, and item navigation.
   - Avoid moving item sheet state into `InvoiceFormScreen`; the screen should keep only the existing presenter callback and active title callback.
   - Continue deriving item sections through `buildInvoiceItemSections(...)` so workflow grouping and active-item ordering stay unchanged.

2. Remove the inline top item input
   - Delete the `TextInput` block above `WorkflowStepSelector` in `ItemsStep`.
   - Remove now-unused imports and derived values that only supported that input, especially `TextInput`, `invoiceDescriptionLine`, and `invoiceDescriptionValue` if no longer needed.
   - Keep `activeItemTitle` and `onActiveItemTitleChange` so the header remains the title affordance and still opens the item sheet.

3. Introduce explicit item sheet mode state
   - Add local state such as:
     - `itemsSheetMode: "list" | "edit" | "delete"`
     - `pendingItemIndex: number | null`
     - `draftItemTitle: string`
   - Prefer one logical state machine over three independent booleans to avoid multiple bottom sheets presenting at once.
   - On `presentItemsSheet`, set mode to `list`.
   - On row edit/delete icon press, set `pendingItemIndex`, hydrate any draft title from `getInvoiceItemDisplayTitle(section, index)` or the underlying line title/description, then set mode to `edit` or `delete`.

4. Extract item sheet row primitives
   - Add focused local components in `items-step.tsx` or a new kebab-case helper file if line count gets high:
     - `InvoiceItemSheetRow`
     - `InvoiceItemSheetActionButton`
   - Row layout should be `flex-row gap-2 items-center`:
     - Main pressable row content selects the item.
     - Right actions are icon-only edit/delete buttons.
     - Remove the trailing right chevron from item rows.
   - Use the shared `Icon` wrapper with `Pencil` and `Trash` icons and `className` sizing.
   - Ensure each action button has at least a 44x44 hit target.
   - Keep selected item state visible with check/primary styling, but do not use a chevron as the default affordance.

5. Build the edit-title sheet
   - Render a `FloatingBottomSheet` when `itemsSheetMode === "edit"` and a pending item exists.
   - Sheet content:
     - Title: `Edit Item x Title`
     - Input seeded from the item title.
     - Bottom row: `[Cancel] [Proceed]`
   - Cancel returns to the list sheet without changing data.
   - Proceed applies the title through the store, then returns to the list sheet.
   - Prefer `actions.setLineTitle(uid, title)` for the primary workflow line in the selected section. If the current display title is description-driven for a workflow item, confirm during implementation whether `setLineTitle` is enough for header/list display; if not, use a small helper that patches the section's canonical display line through `setLineDescription` only for the section types whose title derives from description.

6. Build the delete confirmation sheet
   - Render a `FloatingBottomSheet` when `itemsSheetMode === "delete"` and a pending item exists.
   - Show concise confirmation copy with the item title and a warning that the item lines will be removed.
   - Actions:
     - Cancel returns to the list sheet.
     - Delete removes all lines in the selected `InvoiceItemSection` using `actions.removeLineItem(line.uid)` for each line.
   - After delete, return to list mode if items remain; otherwise dismiss the sheet and let the empty item state render.
   - Clamp `activeIndex` after deletion using the existing itemSections-length effect, and explicitly choose the previous valid index when removing the active item to avoid transient out-of-range UI.

7. Keep add/select behavior intact
   - `New item` should keep using `createDefaultLineItems()[0]`, `actions.addOrUpdateLineItem`, and set the new item active.
   - Selecting a row should still set `activeIndex` and dismiss the sheet.
   - Cancel in list mode should still close the sheet.

8. Validation
   - Add or update focused tests around pure helpers in `items-step-sheet.ts` if helper functions are introduced for:
     - sheet mode transitions
     - delete target resolution
     - edit title target resolution
     - active index after deletion
   - Run focused validation:
     - `bun test apps/expo-app/src/features/sales/invoice-form/components/items-step-sheet.test.ts apps/expo-app/src/features/sales/invoice-form/components/items-step-sections.test.ts`
     - `bunx biome check` on touched item-sheet helper files and any newly extracted components.
     - `git diff --check` on touched files.
   - If `items-step.tsx` still reports existing file-wide formatting debt, document that separately and keep the actual change scoped.

## Skills List Used

- `plan`: Used to structure the execution plan with assumptions, phases, validation, and risks.
- `monorepo-expo`: Used to align the plan with Expo mobile component, icon, safe-area, tap-target, and sheet UX standards.

## Risks and Mitigations

- Risk: Editing `title` may not change the visible item label for workflow items whose display title derives from `description`.
  - Mitigation: Implement a small resolver that identifies the section's canonical display line and updates the field that `buildInvoiceItemSections` actually uses.

- Risk: Multiple `FloatingBottomSheet` instances may overlap or dismiss each other.
  - Mitigation: Use a single `itemsSheetMode` state machine and render only one mode at a time.

- Risk: Deleting a section containing multiple grouped lines could leave orphaned rows or stale active indexes.
  - Mitigation: Delete every line in the section and clamp the active index immediately after removal.

- Risk: Icon actions inside a selectable row may trigger both edit/delete and row selection.
  - Mitigation: Make row content and action buttons sibling pressables inside the same flex row rather than nesting pressables.

- Risk: Removing the top input removes a fast rename path.
  - Mitigation: Keep the header title and sheet edit action prominent, with 44x44 icon targets and a direct edit bottom sheet.
