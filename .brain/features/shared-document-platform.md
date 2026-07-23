# Feature: Shared Document Platform

## Status

Implemented for the active employee-gallery, dispatch-proof, packing-signature,
authenticated browser attachment, and generated Sales PDF callers.

## Canonical model

- `StoredDocument` is the canonical provider/path, ownership, status, current
  version, uploader, and file-metadata record.
- `SalesDocumentSnapshot.storedDocumentId` remains the generated Sales PDF
  companion lifecycle link.
- Feature-local URL/path fields remain compatibility projections during the
  incremental cutover; new writes derive them from the canonical document.
- Provider/path registration runs in a serializable transaction and retries
  Prisma serialization/deadlock conflicts. Matching retries reuse the winning
  record; ownership collisions fail closed.

## Active caller behavior

### Employee gallery uploads

- Expo sends validated image bytes to protected
  `user.uploadDocumentAsset`.
- The API uploads, registers a non-current `StoredDocument` under
  `ownerType = user`, and saves `UserDocuments.meta.storedDocumentId` in one
  server operation.
- `UserDocuments.url` is derived from the registered URL/path. Updates are
  scoped by document id, target user id, and active state.
- If feature persistence fails, the staged blob is deleted and the canonical
  record is marked failed/deleted.
- Review-notification failure is non-fatal after the feature row commits; the
  upload remains valid and the response reports `notificationQueued = false`.

### Dispatch proof and packing signatures

- `dispatch.completeDispatchWithProof` registers the generated signature and
  each validated photo under `ownerType = dispatch`; resumable completion
  metadata retains canonical document ids alongside compatibility paths.
- One request id is bound to a SHA-256 fingerprint of the signature and
  attachment content, so same-id retries are byte-equivalent. Blob upload,
  registration, and the proof document-id checkpoint use compensation plus the
  registration transaction callback; late same-request work cannot overwrite a
  completed checkpoint.
- Attachment client ids must be unique. An unfinished legacy checkpoint without
  a fingerprint cannot be safely resumed under the same request id and must
  restart with a new request.
- A different request cannot supersede an active proof upload during its
  15-minute lease. Retrying the same request resumes its checkpoints; after
  the lease, a new request may take over and the abandoned canonical proof
  records are marked failed.
- `dispatch.signPackingSlip` accepts only a validated PNG data URL. The browser
  never uploads the signature directly.
- Packing sign-off uses a serializable per-dispatch lease. Upload or
  registration failure releases the lease and compensates the staged blob.
  The canonical document id is checkpointed with the registered upload, then
  the packing transaction records `domain_completed` with the same request and
  document ids.
- A completed packing slip may be re-signed only within the existing
  server-enforced five-minute window. Promotion failure after committed
  packing is non-fatal: the next sign-off request first reconciles the
  `domain_completed` document to current, avoiding a duplicate business action.
- Expired `uploaded` packing leases retire their exact non-current canonical
  document before a new lease can replace them.

### Authenticated browser attachments

- Shared web upload/drop zones call protected `storage.upload` rather than
  importing Vercel Blob write APIs or credentials.
- `storage.upload` allows only the declared inbound/dispatch attachment
  contexts, validates canonical base64, size, MIME allowlist, and file magic,
  and registers a non-current user-owned staged document.
- Saving a generic or inbound note atomically adopts matching current-user
  browser uploads from staged user ownership to durable note ownership. Inbox
  activity creation first claims attachments into a non-deletable processing
  state, restores staging if activity creation fails, and otherwise finalizes
  notification-activity ownership. Claim ids fence concurrent submit/rollback/
  finalize work; stale reset, claim, and competing-claim detection share one
  transaction, and a 15-minute lease restores abandoned claims for retry.
  Server payload-string discovery also adopts matching staged canonical paths
  when a stale or forged client omits the explicit attachment list.
- Browser batch uploads run sequentially and compensate every canonical upload
  completed earlier in the batch if a later file fails.
- Browser MIME selection uses the declared type when supported and otherwise
  infers PDF/image types from the filename; the API remains authoritative via
  magic-byte validation.
- `storage.delete` deletes only active canonical Vercel Blob records uploaded
  and owned by the authenticated user that are still trusted browser-staging
  records, then tombstones the record. Consumed note attachments and employee
  documents are outside this generic delete boundary.
- Delete first compare-and-set claims the exact trusted staging row under a
  server id before touching Blob storage. Adoption can no longer race the
  physical delete; provider failure restores staging, success tombstones only
  the same claim, and abandoned delete claims recover after one hour.
- Note, inbound, and inbox-activity attachment transactions also validate
  explicit current-user canonical paths after adoption/claim and roll back when
  a row is deleting, deleted, or failed. Unregistered legacy paths and already
  durable ready references remain compatible.
  Unregistered legacy path-only references have no trustworthy uploader
  identity, so the API does not physically delete those blobs; their feature
  reference can still be removed, and physical cleanup requires a separately
  reviewed backfill/migration.
- `BLOB_READ_WRITE_TOKEN` is server-only. No
  `NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN` schema or browser source remains.

### Generated Sales PDFs

- Sales PDF generation continues through the shared document service.
  Generated `sales_pdf` records are linked from
  `SalesDocumentSnapshot.storedDocumentId`.

## Scope clarification

- The active “gallery” caller in this cutover is Expo image-library selection
  for employee documents.
- The old Prisma `Gallery` bootstrap has no runtime caller and is an obsolete
  no-op for this migration.
- Inventory `ImageGallery` remains active inventory image metadata. It was not
  migrated, backfilled, or mutated here and requires a separately approved
  inventory/schema/data project.

## Storage validation

Uploaded browser/mobile documents accept PNG, JPEG, WebP, AVIF, HEIC, HEIF,
and PDF where the caller permits them. The API verifies decoded bounds,
canonical base64, and format magic before upload. Dispatch proof accepts the
image subset; both Expo employee-gallery and dispatch-proof pickers infer a
missing image MIME from the filename. Packing signatures use the stricter PNG
data-URL decoder.

## Related decisions and plans

- `.brain/decisions/ADR-002-shared-document-platform.md`
- `.brain/plans/2026-07-23-feature-shared-document-caller-migration.md`
