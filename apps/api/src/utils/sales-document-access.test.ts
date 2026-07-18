import { afterEach, describe, expect, it } from "bun:test";
import {
	type ResolveSalesDocumentAccessInput,
	resolveSalesDocumentAccess,
} from "./sales-document-access";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
	process.env.NODE_ENV = originalNodeEnv;
});

function createSnapshot(overrides: Record<string, unknown> = {}) {
	return {
		id: "snapshot-21438",
		salesOrderId: 21438,
		storedDocumentId: "stored-21438",
		documentType: "invoice_pdf",
		version: 13,
		generationStatus: "ready",
		isCurrent: true,
		sourceUpdatedAt: new Date("2026-05-12T10:00:00.000Z"),
		generatedAt: new Date("2026-05-12T10:00:00.000Z"),
		meta: {
			accessToken: "access-token",
			expiresAt: "2099-01-01T00:00:00.000Z",
			templateId: "template-2",
		},
		createdAt: new Date("2026-05-12T10:00:00.000Z"),
		updatedAt: new Date("2026-05-12T10:00:00.000Z"),
		deletedAt: null,
		...overrides,
	};
}

function createMockDb(input: {
	snapshot: ReturnType<typeof createSnapshot>;
	saleUpdatedAt: Date;
}) {
	const calls = {
		snapshotCreate: 0,
	};
	const db = {
		salesDocumentSnapshot: {
			findFirst: async () => input.snapshot,
			create: async () => {
				calls.snapshotCreate += 1;
				throw new Error("Snapshot create should not be called on cache hit.");
			},
			update: async () => input.snapshot,
			updateMany: async () => ({ count: 0 }),
		},
		storedDocument: {
			findFirst: async () => ({ id: "stored-21438" }),
		},
		salesOrders: {
			findUnique: async () => ({ updatedAt: input.saleUpdatedAt }),
		},
		publicLinkToken: {
			findFirst: async () => ({
				token: "public-token",
				expiresAt: new Date("2099-01-01T00:00:00.000Z"),
			}),
			create: async () => {
				throw new Error("Public token create should not be called.");
			},
		},
	} as unknown as ResolveSalesDocumentAccessInput["db"];

	return { db, calls };
}

describe("resolveSalesDocumentAccess", () => {
	it("reuses a ready snapshot when source and sale updates are in the same persisted second", async () => {
		const { db, calls } = createMockDb({
			snapshot: createSnapshot(),
			saleUpdatedAt: new Date("2026-05-12T10:00:00.789Z"),
		});

		const result = await resolveSalesDocumentAccess({
			db,
			salesIds: [21438],
			mode: "invoice",
			baseUrl: "https://example.com",
		});

		expect(result.kind).toBe("snapshot");
		expect(result.generated).toBe(false);
		expect(result.snapshotId).toBe("snapshot-21438");
		expect(calls.snapshotCreate).toBe(0);
	});

	it("regenerates when the requested print configuration differs from the snapshot", async () => {
		const { db, calls } = createMockDb({
			snapshot: createSnapshot(),
			saleUpdatedAt: new Date("2026-05-12T10:00:00.789Z"),
		});

		await expect(
			resolveSalesDocumentAccess({
				db,
				salesIds: [21438],
				mode: "invoice",
				printConfig: {
					pageBreakMode: "section",
				},
				baseUrl: "https://example.com",
			}),
		).rejects.toThrow("Snapshot create should not be called on cache hit.");
		expect(calls.snapshotCreate).toBe(1);
	});

	it("returns on-demand legacy access in production without creating snapshots", async () => {
		process.env.NODE_ENV = "production";
		const { db, calls } = createMockDb({
			snapshot: createSnapshot(),
			saleUpdatedAt: new Date("2026-05-12T10:00:00.789Z"),
		});

		const result = await resolveSalesDocumentAccess({
			db,
			salesIds: [21438],
			mode: "invoice",
			baseUrl: "https://example.com",
		});

		expect(result.kind).toBe("legacy");
		expect(result.generated).toBe(false);
		expect(result.salesOrderId).toBe(21438);
		expect(result.snapshotId).toBeUndefined();
		expect(result.previewUrl).toContain("/p/sales-document-v2?token=");
		expect(result.downloadUrl).toContain("/api/download/sales-v2?token=");
		expect(calls.snapshotCreate).toBe(0);
	});
});
