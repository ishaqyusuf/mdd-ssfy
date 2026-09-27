import { describe, expect, test } from "bun:test";
import {
	classifyEmployeeDocumentCleanupCandidate,
	inventoryPendingEmployeeDocumentCleanup,
	parseEmployeeDocumentCleanupInventoryArguments,
} from "./employee-document-cleanup-inventory";

const deletedAt = new Date("2026-09-26T00:00:00.000Z");
const stored = {
	id: "stored-1",
	ownerType: "user",
	ownerId: "7",
	kind: "attachment",
	provider: "vercel-blob",
	visibility: "private",
	status: "deleted",
	deletedAt,
	meta: {
		workflow: "employee_document",
		storageAccess: "private",
		cleanupStatus: "retry_required",
	},
};
const link = {
	userId: 7,
	deletedAt,
	meta: { storedDocumentId: "stored-1" },
};

describe("private employee-document cleanup inventory", () => {
	test("has only bounded read-only arguments", () => {
		expect(parseEmployeeDocumentCleanupInventoryArguments([])).toMatchObject({
			environment: "local",
			limit: 100,
		});
		expect(() =>
			parseEmployeeDocumentCleanupInventoryArguments(["--mode", "apply"]),
		).toThrow("Invalid argument");
		expect(() =>
			parseEmployeeDocumentCleanupInventoryArguments(["--limit", "501"]),
		).toThrow("--limit must be");
		expect(() =>
			parseEmployeeDocumentCleanupInventoryArguments([
				"--environment",
				"preview",
			]),
		).toThrow("Use --environment");
	});

	test("requires exact deleted private workflow and one tombstoned owner link", () => {
		expect(
			classifyEmployeeDocumentCleanupCandidate({ stored, links: [link] }),
		).toBe("candidate");
		expect(
			classifyEmployeeDocumentCleanupCandidate({
				stored: { ...stored, visibility: "public" },
				links: [link],
			}),
		).toBe("invalid_stored_record");
		expect(
			classifyEmployeeDocumentCleanupCandidate({
				stored: {
					...stored,
					meta: { ...stored.meta, cleanupStatus: "completed" },
				},
				links: [link],
			}),
		).toBe("invalid_stored_record");
		expect(
			classifyEmployeeDocumentCleanupCandidate({ stored, links: [] }),
		).toBe("ambiguous_business_link");
		expect(
			classifyEmployeeDocumentCleanupCandidate({ stored, links: [link, link] }),
		).toBe("ambiguous_business_link");
		expect(
			classifyEmployeeDocumentCleanupCandidate({
				stored,
				links: [{ ...link, deletedAt: null }],
			}),
		).toBe("live_or_mismatched_business_link");
		expect(
			classifyEmployeeDocumentCleanupCandidate({
				stored,
				links: [{ ...link, userId: 8 }],
			}),
		).toBe("live_or_mismatched_business_link");
		expect(
			classifyEmployeeDocumentCleanupCandidate({
				stored,
				links: [{ ...link, meta: { storedDocumentId: "other" } }],
			}),
		).toBe("live_or_mismatched_business_link");
	});

	test("queries only deleted private marked rows and emits IDs, not paths", async () => {
		const calls: unknown[] = [];
		const db = {
			storedDocument: {
				findMany: async (input: unknown) => {
					calls.push(input);
					return [stored];
				},
			},
			userDocuments: {
				findMany: async (input: unknown) => {
					calls.push(input);
					return calls.length === 2 ? [link] : [];
				},
			},
		};
		const report = await inventoryPendingEmployeeDocumentCleanup(
			db as never,
			2,
		);
		expect(report).toEqual({
			examined: 1,
			candidates: ["stored-1"],
			held: [],
			truncated: false,
		});
		expect(calls[0]).toMatchObject({
			where: {
				status: "deleted",
				visibility: "private",
				meta: { path: "$.cleanupStatus", equals: "retry_required" },
			},
			select: { id: true, meta: true },
		});
		expect(JSON.stringify(calls)).not.toContain("pathname");
		expect(calls[1]).toMatchObject({
			where: {
				meta: { path: "$.storedDocumentId", equals: "stored-1" },
				deletedAt: { not: null },
			},
			take: 2,
		});
		expect(calls[2]).toMatchObject({
			where: {
				meta: { path: "$.storedDocumentId", equals: "stored-1" },
				deletedAt: null,
			},
			take: 1,
		});
	});

	test("holds a candidate when any active business row still points to it", async () => {
		let businessQueries = 0;
		const db = {
			storedDocument: { findMany: async () => [stored] },
			userDocuments: {
				findMany: async () => {
					businessQueries += 1;
					return businessQueries === 1
						? [link]
						: [{ ...link, deletedAt: null }];
				},
			},
		};
		const report = await inventoryPendingEmployeeDocumentCleanup(
			db as never,
			2,
		);
		expect(report.candidates).toEqual([]);
		expect(report.held).toEqual([
			{ storedDocumentId: "stored-1", reason: "ambiguous_business_link" },
		]);
	});
});
