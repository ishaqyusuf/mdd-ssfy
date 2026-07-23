# Feature: Mobile Dispatch Proof Completion

## Purpose

Make field dispatch completion one authenticated, dispatch-bound, retryable
operation instead of a client-orchestrated sequence of unrelated uploads,
pickup packing, and final completion.

## Behavior

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

## Decision

See `.brain/decisions/ADR-026-resumable-dispatch-proof-completion.md`.
