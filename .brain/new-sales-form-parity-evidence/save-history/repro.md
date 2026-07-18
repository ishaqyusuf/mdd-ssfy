# Repro

See phase matrix for manual flow steps and acceptance criteria:
- `brain/new-sales-form-phase0-repro-matrix.md`

## 2026-07-18 Runtime Evidence

- Order `08893LM` has no `order-hx` snapshots.
- The new-form History tab rendered the correct empty state: `This sale has no saved history` and `A version will appear here after the next successful update.`
- Existing local data contains other `order-hx` fixtures suitable for preview/restore testing.
- Full preview-banner, read-only preview, restore confirmation, and restored-banner browser acceptance was deferred at the user's request (`work on history later`).
