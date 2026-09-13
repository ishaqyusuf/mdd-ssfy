import { describe, expect, test } from "bun:test";
import {
	ASSISTANT_RETENTION_CLAIM_TTL_MS,
	ASSISTANT_STAGED_DOCUMENT_TTL_MS,
	assistantRetentionClaimCutoff,
	assistantStagedDocumentCutoff,
	runAssistantStagedDocumentRetention,
} from "./staged-document-retention";

describe("assistant staged document retention", () => {
	test("computes upload and stale-claim cutoffs", () => {
		const now = new Date("2026-09-13T12:00:00.000Z");
		expect(assistantStagedDocumentCutoff(now).getTime()).toBe(
			now.getTime() - ASSISTANT_STAGED_DOCUMENT_TTL_MS,
		);
		expect(assistantRetentionClaimCutoff(now).getTime()).toBe(
			now.getTime() - ASSISTANT_RETENTION_CLAIM_TTL_MS,
		);
	});

	test("recovers stale claims, deletes expired uploads, and restores failures", async () => {
		const updates: Array<Record<string, unknown>> = [];
		let expiredRead = 0;
		const repository = {
			findMany: async (input: Record<string, unknown>) => {
				const where = input.where as { ownerType?: string; status?: string };
				if (where.status === "uploading") {
					return [
						{
							id: "abandoned",
							ownerId: "42",
							pathname: "reserved.pdf",
							uploadedBy: 42,
						},
					];
				}
				if (where.ownerType === "assistant_retention_claim") {
					return [
						{
							id: "stale",
							ownerId: "old-claim",
							pathname: "stale.pdf",
							uploadedBy: 42,
						},
					];
				}
				expiredRead += 1;
				return expiredRead === 1
					? [
							{
								id: "delete-me",
								ownerId: "42",
								pathname: "delete.pdf",
							},
							{
								id: "retry-me",
								ownerId: "42",
								pathname: "retry.pdf",
							},
						]
					: [];
			},
			updateMany: async (input: Record<string, unknown>) => {
				updates.push(input);
				return { count: 1 };
			},
		};
		const deletedPaths: string[] = [];
		const errors: Array<Record<string, unknown>> = [];
		const result = await runAssistantStagedDocumentRetention({
			repository,
			now: new Date("2026-09-13T12:00:00.000Z"),
			createClaimId: () => `claim-${updates.length}`,
			deleteBlob: async (pathname) => {
				if (pathname === "retry.pdf") throw new Error("temporary failure");
				deletedPaths.push(pathname);
			},
			logError: (_message, attributes) => errors.push(attributes),
		});

		expect(result).toEqual({
			scanned: 2,
			deleted: 1,
			recovered: 1,
			abandonedReservations: 1,
		});
		expect(deletedPaths).toEqual(["reserved.pdf", "delete.pdf"]);
		expect(errors).toEqual([
			{ documentId: "retry-me", error: "temporary failure" },
		]);
		expect(updates).toContainEqual(
			expect.objectContaining({
				data: { ownerType: "user", ownerId: "42", status: "ready" },
			}),
		);
		expect(expiredRead).toBe(1);
	});
});
