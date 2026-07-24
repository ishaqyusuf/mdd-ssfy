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

## Prevention

- Never perform network writes from a React cleanup whose dependency identity
  can change during the write's own state transitions.
- Preserve unknown JSON metadata during legacy compatibility writes.
- Browser-test persistence from every supported editor and assert a bounded
  number of captured save requests.
