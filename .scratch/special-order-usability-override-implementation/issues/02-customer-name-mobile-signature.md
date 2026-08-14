# 02 — Make Public Approval Identity And Mobile Signing Customer-Safe

**What to build:** Present the immutable approval-request customer name as a
disabled field and give small-screen customers a full-screen,
landscape-optimized signing workspace while retaining the established desktop
flow and server-owned evidence boundary.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The active public review displays Customer name from the immutable request customer snapshot and does not offer an editable alternate signer name.
- [ ] Approval evidence stores the server-resolved snapshot customer name; forged or obsolete public name input cannot replace it.
- [ ] The existing identity-assurance disclosure remains visible and does not claim that the name or capability link independently verifies legal identity.
- [ ] Desktop approval retains an accessible inline signature pad with existing encoding and size validation.
- [ ] On small screens, activating Digital Signature opens a full-screen, landscape-optimized modal with clear rotate guidance while remaining usable in portrait.
- [ ] The modal maintains separate working and confirmed signature values: Clear resets the working canvas, Cancel preserves the confirmed value, and OK commits a non-empty signature.
- [ ] Reopening the modal cannot silently lose a previously confirmed signature, and an empty canvas cannot satisfy approval submission.
- [ ] The responsive host reuses one signature encoding/validation contract rather than creating a second signature format.
- [ ] Public contract and UI tests cover immutable naming, forged-name resistance, desktop signing, mobile Clear/Cancel/OK, portrait fallback, resize behavior, reload, submission, and terminal-link behavior.
- [ ] True mobile-viewport browser proof demonstrates horizontal signing guidance and successful approval without requiring browser orientation locking.
