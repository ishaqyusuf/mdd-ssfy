import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const workspaceRoot = join(import.meta.dir, "../../../../..");

function source(path: string) {
	return readFileSync(join(workspaceRoot, path), "utf8");
}

describe("shared document caller migration", () => {
	test("gallery-picked employee uploads register and retain StoredDocument ids", () => {
		const route = source("apps/api/src/trpc/routers/user.route.ts");
		const query = source("apps/api/src/db/queries/user.ts");
		const mobile = source("apps/expo-app/src/screens/documents-screen.tsx");

		expect(route).toContain("registerStoredDocumentUpload");
		expect(route).toContain("storedDocumentId:");
		expect(query).toContain("storedDocumentId?: string");
		expect(query).toContain("docMeta.storedDocumentId");
		expect(query).toContain("url: canonicalDocumentUrl");
		expect(query).toContain("userId: targetUserId");
		expect(query).toContain("deletedAt: null");
		expect(route).toContain("await saveUserDocument(props.ctx");
		expect(route).toContain("finalizeUploadedDocument");
		expect(mobile).not.toContain("saveDocumentMutation");
	});

	test("dispatch proof and packing signatures register canonical documents", () => {
		const route = source("apps/api/src/trpc/routers/dispatch.route.ts");
		const proofRoute = route.slice(
			route.indexOf("completeDispatchWithProof:"),
			route.indexOf("signPackingSlip:"),
		);
		const dispatchQuery = source("apps/api/src/db/queries/dispatch.ts");
		const salesTask = source("packages/sales/src/sales-control/tasks.ts");
		const packing = source("apps/www/src/hooks/use-signature.ts");

		expect(route).toContain('kind: "signature"');
		expect(route).toContain('kind: "dispatch_image"');
		expect(route).toContain("registerStoredDocumentUpload");
		expect(route).toContain("decodePngSignatureDataUrl");
		expect(route).toContain("isCurrent: false");
		expect(route).not.toContain('signature.startsWith("data:")');
		expect(route).toContain(
			"Another dispatch completion upload is already in progress.",
		);
		expect(route).toContain("finalizeUploadedDocument");
		expect(proofRoute).toContain("finalizeUploadedDocument");
		expect(proofRoute).toContain("onRegistered:");
		expect(proofRoute).toContain("checkpointRegisteredProof");
		expect(proofRoute).toContain("getDispatchCompletionPayloadFingerprint");
		expect(route).toContain("canResignPackingSlip");
		expect(route).toContain('status: "uploaded"');
		expect(route).toContain('status: "completed"');
		expect(route).toContain("reconciled: true");
		expect(route).toContain('signoff.status === "uploaded"');
		expect(route).toContain('status: "failed"');
		expect(dispatchQuery).toContain("requestId: input.packingRequestId");
		expect(dispatchQuery).toContain("documentId: input.signatureDocumentId");
		expect(dispatchQuery).toContain("allowCompletedResign: true");
		expect(salesTask).toContain('status: "domain_completed"');
		expect(salesTask).toContain("internal?.packingSignoff");
		expect(packing).not.toContain("NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN");
		expect(packing).not.toContain("@vercel/blob");
	});

	test("protected storage compensates uploads and deletes only owned canonical rows", () => {
		const route = source("apps/api/src/trpc/routers/storage.route.ts");
		const genericNote = source("packages/utils/src/note.ts");
		const inboundNote = source("apps/api/src/db/queries/note.ts");
		const notesRoute = source("apps/api/src/trpc/routers/notes.route.ts");

		expect(route).toContain("finalizeUploadedDocument");
		expect(route).toContain("registerStoredDocumentUpload");
		expect(route).toContain('ownerType: "user"');
		expect(route).toContain("ownerId: String(ctx.userId)");
		expect(route).toContain("uploadedBy: ctx.userId");
		expect(route).toContain('sourceType: "authenticated_browser_upload"');
		expect(route).toContain('ownerKey: { startsWith: "staged:" }');
		expect(route).toContain('ownerType: "user_delete_claim"');
		expect(route).toContain("deleteClaimId");
		expect(route).toContain('status: "deleting"');
		expect(route).not.toContain("legacyPath");
		expect(genericNote).toContain('sourceType: "note_attachment"');
		expect(genericNote).toContain('ownerType: "note"');
		expect(inboundNote).toContain('sourceType: "note_attachment"');
		expect(inboundNote).toContain('ownerType: "note"');
		expect(notesRoute).toContain('"notification_attachment_pending"');
		expect(notesRoute).toContain('"notification_attachment"');
		expect(notesRoute).toContain('ownerType: "notification_activity"');
		expect(notesRoute).toContain("NOTIFICATION_ATTACHMENT_CLAIM_LEASE_MS");
		expect(notesRoute).toContain("sourceId: attachmentClaimId");
		expect(notesRoute).toContain("ctx.db.$transaction");
		expect(notesRoute).toContain("result.activityIds?.[0]");
		expect(notesRoute).toContain("adoptStoredDocumentAttachments");
	});

	test("sales PDF snapshots continue to link generated shared documents", () => {
		const access = source("apps/api/src/utils/sales-document-access.ts");
		const worker = source(
			"packages/jobs/src/tasks/sales/warm-sales-document-snapshot.ts",
		);

		expect(access).toContain("buildStoredDocumentKind(input.documentType)");
		expect(access).toContain("storedDocumentId: storedDocument.id");
		expect(worker).toContain("buildStoredDocumentKind(documentType)");
		expect(worker).toContain("storedDocumentId: storedDocument.id");
	});

	test("browser source never receives write-capable Blob credentials", () => {
		const clientFiles = [
			...readdirSync(join(workspaceRoot, "apps/www/src"), {
				recursive: true,
				withFileTypes: true,
			}),
			...readdirSync(join(workspaceRoot, "apps/storefront/src"), {
				recursive: true,
				withFileTypes: true,
			}),
		].filter(
			(entry) =>
				entry.isFile() &&
				(/\.(?:jsx|tsx)$/.test(entry.name) || entry.name === "env.mjs"),
		);
		const clientSource = clientFiles
			.map((entry) => readFileSync(join(entry.parentPath, entry.name), "utf8"))
			.join("\n");

		expect(clientSource).not.toContain("NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN");
		expect(clientSource).not.toMatch(/from\s+["']@vercel\/blob["']/);
	});
});
