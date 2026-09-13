import { describe, expect, test } from "bun:test";
import { runSalesPdfArtifactCleanup } from "./sales-pdf-artifact-cleanup";

describe("Sales PDF artifact cleanup", () => {
	test("recovers stale claims and deletes claimed recovery records", async () => {
		const updates: Array<Record<string, unknown>> = [];
		let updateCount = 0;
		const result = await runSalesPdfArtifactCleanup({
			repository: {
				findMany: async () => [
					{ id: "document-1", pathname: "sales/1/invoice.pdf" },
				],
				updateMany: async (input) => {
					updates.push(input);
					updateCount += 1;
					return { count: 1 };
				},
			},
			deleteBlob: async () => undefined,
			now: new Date("2026-09-13T12:00:00.000Z"),
		});
		expect(result).toEqual({
			scanned: 1,
			claimed: 1,
			deleted: 1,
			expired: 0,
			recovered: 1,
		});
		expect(updateCount).toBe(3);
		expect(updates.at(-1)).toMatchObject({
			data: {
				status: "deleted",
				deletedAt: new Date("2026-09-13T12:00:00.000Z"),
			},
		});
	});

	test("returns failed deletion claims to the recovery queue", async () => {
		const updates: Array<Record<string, unknown>> = [];
		const errors: Array<Record<string, unknown>> = [];
		const result = await runSalesPdfArtifactCleanup({
			repository: {
				findMany: async () => [
					{ id: "document-1", pathname: "sales/1/invoice.pdf" },
				],
				updateMany: async (input) => {
					updates.push(input);
					return { count: updates.length === 1 ? 0 : 1 };
				},
			},
			deleteBlob: async () => {
				throw new Error("storage unavailable");
			},
			logError: (_message, attributes) => errors.push(attributes),
		});
		expect(result).toEqual({
			scanned: 1,
			claimed: 1,
			deleted: 0,
			expired: 0,
			recovered: 0,
		});
		expect(updates.at(-1)).toMatchObject({
			data: { status: "cleanup_required" },
		});
		expect(errors).toEqual([
			{ documentId: "document-1", error: "storage unavailable" },
		]);
	});

	test("invalidates expired ready snapshots and deletes their artifacts", async () => {
		const documentUpdates: Array<Record<string, unknown>> = [];
		const invalidations: Array<{
			snapshot: { id: string; storedDocumentId: string | null };
			now: Date;
		}> = [];
		let listedCleanup = false;
		const result = await runSalesPdfArtifactCleanup({
			repository: {
				findMany: async () => {
					listedCleanup = true;
					return [{ id: "document-expired", pathname: "sales/1/expired.pdf" }];
				},
				updateMany: async (input) => {
					documentUpdates.push(input);
					return { count: documentUpdates.length === 1 ? 0 : 1 };
				},
			},
			snapshotRepository: {
				findMany: async (input) => {
					expect(input).toMatchObject({
						where: {
							generationStatus: "ready",
							isCurrent: true,
						},
					});
					return [
						{ id: "snapshot-expired", storedDocumentId: "document-expired" },
					];
				},
			},
			invalidateExpiredSnapshot: async (snapshot, now) => {
				invalidations.push({ snapshot, now });
				return { count: 1 };
			},
			deleteBlob: async () => undefined,
			now: new Date("2026-09-13T12:00:00.000Z"),
		});
		expect(listedCleanup).toBe(true);
		expect(result).toEqual({
			scanned: 1,
			claimed: 1,
			deleted: 1,
			expired: 1,
			recovered: 0,
		});
		expect(invalidations).toEqual([
			{
				snapshot: {
					id: "snapshot-expired",
					storedDocumentId: "document-expired",
				},
				now: new Date("2026-09-13T12:00:00.000Z"),
			},
		]);
	});
});
