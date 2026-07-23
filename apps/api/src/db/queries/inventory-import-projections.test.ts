import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { tasks } from "@trigger.dev/sdk/v3";
import {
	getInventoryImportProjectionHistory,
	recordInventoryImportProjectionAttempt,
	retryInventoryImportProjection,
} from "./inventory-import-projections";

function createContext() {
	const diagnosticUpsert = mock(async (args) => ({
		id: "diagnostic-queued",
		...args.create,
	}));
	const diagnosticCreate = mock(async (args) => ({
		id: "diagnostic-failed",
		...args.data,
	}));
	const diagnosticUpdateMany = mock(async () => ({ count: 1 }));
	const projectionMetadata = {
		type: "inventory-import-projection",
		entityId: "11",
		entityLabel: "Inventory item 11",
		inventoryId: 11,
		dispositionAuditEventId: 91,
		retryOfDiagnosticId: null,
	};
	const historyRows: Array<Record<string, unknown>> = [];
	const db = {
		users: {
			findFirst: async () => ({
				id: 42,
				name: "Pat Admin",
				email: "pat@example.com",
				roles: [{ role: { name: "Super Admin" } }],
			}),
		},
		taskRunDiagnostic: {
			upsert: diagnosticUpsert,
			create: diagnosticCreate,
			findMany: async () => historyRows,
			findFirst: async () => ({
				id: "projection-failure",
				status: "START_FAILED",
				metadata: projectionMetadata,
				reviewedAt: null,
			}),
			updateMany: diagnosticUpdateMany,
		},
		inventory: {
			findFirst: async () => ({ id: 11 }),
		},
	};
	const ctx = {
		db,
		userId: 42,
	} as unknown as TRPCContext;

	return {
		ctx,
		diagnosticCreate,
		diagnosticUpdateMany,
		diagnosticUpsert,
		historyRows,
		projectionMetadata,
	};
}

describe("inventory import projection diagnostics", () => {
	beforeEach(() => {
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => ({ id: "projection-retry-run" })),
		);
	});

	it("records the queued post-disposition projection with actor and run identity", async () => {
		const { ctx, diagnosticUpsert } = createContext();

		const result = await recordInventoryImportProjectionAttempt(ctx, {
			status: "applied",
			inventoryId: 11,
			previousCategoryId: 10,
			targetCategoryId: 20,
			disposition: "retain_as_inventory",
			auditEventId: 91,
			syncQueued: true,
			syncRunId: "projection-run",
		});

		expect(diagnosticUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { runId: "projection-run" },
				create: expect.objectContaining({
					actorId: 42,
					status: "RUNNING",
					taskName: "sync-inventory-to-dyke",
					metadata: expect.objectContaining({
						type: "inventory-import-projection",
						inventoryId: 11,
						dispositionAuditEventId: 91,
					}),
				}),
			}),
		);
		expect(result).toMatchObject({
			status: "applied",
			projectionDiagnosticId: "diagnostic-queued",
			projectionDiagnosticRecorded: true,
		});
	});

	it("persists a retryable start failure when automatic projection cannot queue", async () => {
		const { ctx, diagnosticCreate } = createContext();

		const result = await recordInventoryImportProjectionAttempt(ctx, {
			status: "applied",
			inventoryId: 11,
			previousCategoryId: 10,
			targetCategoryId: 20,
			disposition: "retain_as_inventory",
			auditEventId: 91,
			syncQueued: false,
			syncRunId: null,
		});

		expect(diagnosticCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: "START_FAILED",
					taskName: "sync-inventory-to-dyke",
					actorId: 42,
					internalError: "Unable to queue inventory-to-Dyke projection.",
				}),
			}),
		);
		expect(result).toMatchObject({
			projectionDiagnosticId: "diagnostic-failed",
			projectionDiagnosticRecorded: true,
		});
	});

	it("returns only bounded import projection attempts with explicit retry state", async () => {
		const { ctx, historyRows, projectionMetadata } = createContext();
		historyRows.push(
			{
				id: "failed",
				runId: null,
				status: "START_FAILED",
				title: "Project inventory",
				actorName: "Pat Admin",
				userMessage: "Unable to start this background task.",
				metadata: projectionMetadata,
				startedAt: new Date("2026-07-23T10:00:00Z"),
				finishedAt: new Date("2026-07-23T10:00:00Z"),
				reviewedAt: null,
				createdAt: new Date("2026-07-23T10:00:00Z"),
			},
			{
				id: "unrelated",
				status: "START_FAILED",
				metadata: { type: "other-task", inventoryId: 11 },
			},
		);

		const result = await getInventoryImportProjectionHistory(ctx, { limit: 8 });

		expect(result.runs).toHaveLength(1);
		expect(result.runs[0]).toMatchObject({
			id: "failed",
			inventoryId: 11,
			dispositionAuditEventId: 91,
			canRetry: true,
		});
		expect(result.meta).toEqual({
			returned: 1,
			queued: 0,
			succeeded: 0,
			failed: 1,
			retryable: 1,
		});
	});

	it("claims one failed diagnostic before queueing an actor-attributed retry", async () => {
		const { ctx, diagnosticUpdateMany, diagnosticUpsert } = createContext();

		const result = await retryInventoryImportProjection(ctx, {
			diagnosticId: "projection-failure",
		});

		expect(diagnosticUpdateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: "projection-failure",
					status: "START_FAILED",
					reviewedAt: null,
				}),
				data: expect.objectContaining({
					reviewedById: 42,
				}),
			}),
		);
		expect(tasks.trigger).toHaveBeenCalledWith(
			"sync-inventory-to-dyke",
			expect.objectContaining({
				inventoryId: 11,
				mode: "sync",
				source: "repair",
			}),
		);
		expect(diagnosticUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				create: expect.objectContaining({
					metadata: expect.objectContaining({
						retryOfDiagnosticId: "projection-failure",
					}),
				}),
			}),
		);
		expect(result).toMatchObject({
			status: "queued",
			inventoryId: 11,
			runId: "projection-retry-run",
			projectionDiagnosticRecorded: true,
		});
	});

	it("does not dispatch when another operator already claimed the failed attempt", async () => {
		const { ctx, diagnosticUpdateMany } = createContext();
		diagnosticUpdateMany.mockResolvedValueOnce({ count: 0 });

		const result = await retryInventoryImportProjection(ctx, {
			diagnosticId: "projection-failure",
		});

		expect(result).toEqual({
			status: "skipped",
			reason: "already_retried",
		});
		expect(tasks.trigger).not.toHaveBeenCalled();
	});

	it("records a new retryable failure when retry dispatch also fails", async () => {
		const { ctx, diagnosticCreate } = createContext();
		const consoleError = spyOn(console, "error").mockImplementation(() => {});
		Reflect.set(
			tasks,
			"trigger",
			mock(async () => {
				throw new Error("Trigger unavailable");
			}),
		);

		try {
			const result = await retryInventoryImportProjection(ctx, {
				diagnosticId: "projection-failure",
			});

			expect(diagnosticCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: "START_FAILED",
						metadata: expect.objectContaining({
							retryOfDiagnosticId: "projection-failure",
						}),
					}),
				}),
			);
			expect(result).toMatchObject({
				status: "queue_failed",
				inventoryId: 11,
				runId: null,
				projectionDiagnosticRecorded: true,
			});
		} finally {
			consoleError.mockRestore();
		}
	});
});
