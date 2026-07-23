import { describe, expect, test } from "bun:test";
import { resolveSalesOverviewDocumentReadiness } from "./sales-overview-document-readiness";

describe("sales overview document readiness", () => {
	test("reports current ready snapshots", () => {
		expect(
			resolveSalesOverviewDocumentReadiness({
				saleUpdatedAt: new Date("2026-07-23T10:00:00Z"),
				snapshot: {
					id: "snapshot-1",
					generationStatus: "ready",
					storedDocumentId: "document-1",
					sourceUpdatedAt: new Date("2026-07-23T10:00:00Z"),
					generatedAt: new Date("2026-07-23T10:01:00Z"),
					errorMessage: null,
				},
			}),
		).toMatchObject({
			status: "ready",
			snapshotId: "snapshot-1",
		});
	});

	test("marks ready artifacts stale after the sale changes", () => {
		expect(
			resolveSalesOverviewDocumentReadiness({
				saleUpdatedAt: new Date("2026-07-23T10:02:00Z"),
				snapshot: {
					id: "snapshot-1",
					generationStatus: "ready",
					storedDocumentId: "document-1",
					sourceUpdatedAt: new Date("2026-07-23T10:00:00Z"),
					generatedAt: new Date("2026-07-23T10:01:00Z"),
					errorMessage: null,
				},
			}),
		).toMatchObject({
			status: "stale",
		});
	});

	test("keeps missing snapshot artifacts available on demand", () => {
		expect(
			resolveSalesOverviewDocumentReadiness({
				saleUpdatedAt: new Date("2026-07-23T10:00:00Z"),
				snapshot: null,
			}),
		).toEqual({
			status: "on_demand",
			snapshotId: null,
			generatedAt: null,
			errorMessage: null,
		});
	});

	test("preserves generating and failed states", () => {
		expect(
			resolveSalesOverviewDocumentReadiness({
				saleUpdatedAt: new Date(),
				snapshot: {
					id: "snapshot-1",
					generationStatus: "pending",
					storedDocumentId: null,
					sourceUpdatedAt: null,
					generatedAt: null,
					errorMessage: null,
				},
			}).status,
		).toBe("generating");
		expect(
			resolveSalesOverviewDocumentReadiness({
				saleUpdatedAt: new Date(),
				snapshot: {
					id: "snapshot-2",
					generationStatus: "failed",
					storedDocumentId: null,
					sourceUpdatedAt: null,
					generatedAt: null,
					errorMessage: "Renderer failed",
				},
			}),
		).toMatchObject({
			status: "failed",
			errorMessage: "Renderer failed",
		});
	});
});
