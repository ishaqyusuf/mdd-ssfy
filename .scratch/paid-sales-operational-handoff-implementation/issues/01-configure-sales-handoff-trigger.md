# 01 — Configure the Sales Handoff Trigger

**What to build:** Give Super Admins one protected Sales Settings control that defines when payment makes an order eligible for operational handoff monitoring. The chosen policy must be saved, immediately readable, and evaluated through canonical payment truth so later Material and Production actions share one qualification result.

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] Sales Settings contains an Operations section with Fully paid, Any payment received, and Payment percentage reached modes.
- [x] Fully paid is the default when no explicit policy exists.
- [x] Percentage mode accepts only whole numbers from 1 through 100 and communicates validation failures without discarding the last valid policy.
- [x] Only an active Super Admin can read administrative policy detail or change the policy; forged client role or account scope does not expand access.
- [x] Saving the policy preserves unrelated Sales Settings metadata and creates a new policy revision only for an effective policy change.
- [x] Fully paid requires a positive order total and canonical net amount due at or below zero.
- [x] Any payment requires successful net order receipts above zero, and percentage mode compares integer cents without floating-point behavior.
- [x] Completed refunds reduce qualifying receipts; pending, failed, deleted, and reversed payment activity is excluded.
- [x] Applied Wallet Credit counts only through completed order receipt evidence; zero-total, COD, quote, cancelled, and terminal non-operational orders do not qualify.
- [x] A policy change exposes a stable qualification timestamp equal to the policy-change time for orders newly qualifying under that revision.
- [x] Focused policy, protected settings boundary, payment projection, validation, and unrelated-metadata preservation tests pass.
- [x] The completed slice is manually verifiable by changing every mode in Sales Settings and observing the protected saved value after reload.
