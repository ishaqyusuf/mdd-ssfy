# Sales P.O. Save Update-Depth Loop

## Summary

Saving a P.O. number in the new sales form could trigger React's maximum update
depth error. P.O. values could also appear missing or stale between the new
form, legacy form, Sales Overview, and quote/order list projections.

## Impact

- New order and quote editors could crash immediately after a save.
- The legacy form and Sales Overview could read a different P.O. metadata
  shape from the new form.
- Sales Overview gave no reliable in-progress or saved feedback.

## Root Cause

The autosave hook's cleanup effect depended on the `flush` callback. Inline
save callbacks changed `flush` identity on every saving-state render, so React
ran cleanup during ordinary rerenders. Cleanup called `flush("unmount")`,
which started another save and another state update. Debug capture showed
dozens of payloads for one edit before React stopped the loop.

Legacy saves also replaced the full metadata object, and overview P.O. patches
updated only the root field, allowing nested new-form metadata to become stale.

The 2026-08-19 relational-authority refactor removed the compatibility form
snapshot from `newSalesForm`, while the projection still converted an omitted
P.O. field to `null`. With the Global Invoice Details control hidden, an
incomplete/no-op payload could therefore erase an existing root P.O. without an
operator being able to review it.

## Fix

- Unmount cleanup now only marks the hook unmounted and cancels its timer.
- Debounced autosave uses the latest payload through a ref and a stable
  semantic payload key.
- Queued saves retain whether they are automatic or manual.
- Root and nested P.O. metadata are synchronized while preserving unknown
  metadata.
- Legacy and overview readers share root-first, nested-fallback P.O. behavior.
- Sales Overview shows Saving/Saved/Failed and invalidates the correct order or
  quote projections.
- Global Invoice Details again exposes the accessible P.O. editor for orders
  and quotes.
- Omitted P.O. fields preserve the current root-first/nested-fallback value;
  explicit blanks clear root and nested values together.
- New-form saves retain `newSalesForm.form.po` as a compatibility projection
  without restoring deprecated commercial line, cost, or summary snapshots.

## Prevention

- Never perform network writes from a React cleanup whose dependency identity
  can change during the write's own state transitions.
- Preserve unknown JSON metadata during legacy compatibility writes.
- Browser-test persistence from every supported editor and assert a bounded
  number of captured save requests.
- Keep relational sales rows authoritative while retaining focused metadata
  compatibility tests for root-only, nested-only, no-op, edit, and clear cases.
