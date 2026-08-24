# Feature: Mobile Dispatch Proof Completion

## Purpose

Make field dispatch completion one authenticated, dispatch-bound, retryable
operation instead of a client-orchestrated sequence of unrelated uploads,
pickup packing, and final completion.

## Behavior

- The driver dashboard now consumes `dispatch.driverManifest`, which forces
  the authenticated user as the driver scope and returns the paginated queue,
  global summary, and server-ranked next stop together.
- Driver views are Today, All stops, and Exceptions. They share due-bucket and
  risk semantics with Dispatch Admin and display sync state without inventing a
  second lifecycle authority.
- Start Trip opens live turn-by-turn directions for the canonical destination.
- Reporting a delivery problem writes a durable `DispatchException`; it does
  not cancel or reclassify the trip on the client. A manager resolves the
  exception with an audit note, while reschedule/cancel remain guarded dispatch
  commands.

- Expo keeps one completion request id while the completion form is open.
- The server binds that id to a SHA-256 fingerprint of the signature and
  attachment bytes. Reusing the id with different proof content conflicts;
  byte-equivalent retries remain resumable.
- The app sends recipient, note, completion type, signature path, and up to five
  bounded image attachments to `dispatch.completeDispatchWithProof`.
- Expo uses the picker MIME when supported and otherwise infers the image type
  from the selected filename (including HEIC/HEIF) in both employee-gallery and
  dispatch-proof upload flows. Unsupported extensions are omitted with user
  feedback; the API still verifies file magic.
- The server rechecks the live assigned driver or dispatch-manager capability;
  clients no longer choose the completion author.
- Signature and attachment uploads use deterministic request-scoped filenames.
  Each successful upload is staged in
  `OrderDelivery.meta.dispatchCompletion`, so retrying the same request reuses
  proof already stored instead of creating duplicate blobs.
- Staged checkpoints claim request ownership in short serializable
  transactions. A different request cannot replace an unfinished attempt
  during its 15-minute lease; retrying the same request resumes its proof
  checkpoint. A new request may take over an expired stage, marking the
  abandoned canonical proof records failed so an app kill does not strand the
  dispatch forever.
- Each signature/photo upload is registered as a non-current
  dispatch-owned `StoredDocument`, and its canonical id is retained in the
  resumable completion metadata beside the compatibility pathname.
- Upload failure compensates the Blob; registration and the resumable
  document-id checkpoint share one serializable transaction callback. Late
  same-request uploads cannot downgrade completed proof metadata.
- Pickup packing runs inside the same server operation before final completion.
- Final dispatch completion records the request id in the same transaction as
  status, delivered time, payment review, and the completion note. Replaying
  that completed request returns success without writing another note or
  reviewing payment again; a different request against an already-completed
  dispatch returns a conflict.
- On failure, Expo keeps the form/signature/photos mounted and tells the worker
  to tap Complete Dispatch again. The sheet closes only after the server
  confirms completion.
- The former generic `dispatch.uploadDispatchDocument` mutation and its unused
  Expo hook were removed.

## Limits

- The dispatch-proof `StoredDocument` caller migration is complete. Existing
  note-tag URL/path values remain readable as compatibility projections.
- Blob upload and MySQL cannot share one physical transaction. Durable staged
  paths plus idempotent finalization provide the retry guarantee across that
  boundary.
- The request contract allows at most five image attachments, each with at
  most 8,000,000 base64 characters and validated image magic, plus one
  validated signature path.

## Validation

- API and `@gnd/sales` typechecks pass.
- Focused dispatch proof, finalization idempotency, mobile orchestration, and
  permission coverage passes 17 tests / 229 assertions.
- Targeted Biome passes for the new proof modules, API route, mobile action/form
  contract, and document-service option changes.
- A full Expo TypeScript scan still contains the documented broad baseline
  failures; filtered output contains no diagnostics in changed runtime source.
- `git diff --check` passes.
- 2026-08-18 driver-manifest and exception UI implementation was completed, but
  its remaining device/browser QA and broad validation were explicitly skipped
  by the operator for the handoff stage.

## Decision

See `.brain/decisions/ADR-026-resumable-dispatch-proof-completion.md`.
The shared workspace/lifecycle and durable-exception boundary is recorded in
`.brain/decisions/ADR-054-canonical-dispatch-workspace-and-durable-exceptions.md`.

## 2026-08-23 Restart-Safe Expo Draft Hardening

- Expo persists a versioned proof draft per authenticated user and dispatch in
  AsyncStorage. It includes the stable request id, expected manifest revision,
  recipient, note, signature, attachment descriptors, attempt state, and
  timestamps.
- Selected images are copied into app-owned storage. AsyncStorage stores paths,
  sizes, MIME types, and optional content fingerprints, never base64 customer
  media. Submission verifies file existence/fingerprint and encodes only after
  an explicit operator tap.
- Drafts allow at most five files, 4 MB per file, and 10 MB combined. The API
  independently enforces five attachments and a 13.5-million-character base64
  aggregate ceiling (approximately 10 MB raw).
- A failed request preserves the same draft and request id. Successful
  completion, explicit discard, or seven-day expiry removes draft metadata and
  app-owned files. Cleanup failure is logged separately and cannot turn a
  committed server completion into a visible failure.
- Completion preflights the stored manifest revision; delivery time and
  dispatch/pickup note type are derived from the live server record and server
  clock. General dispatch/customer query caches remain memory-only.
