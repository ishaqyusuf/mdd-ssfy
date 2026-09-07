import { describe, expect, test } from "bun:test";

import { salesRouter } from "./sales.route";

type SalesCallerContext = Parameters<typeof salesRouter.createCaller>[0];

function context(permissionNames: string[] = []) {
	return {
		userId: 19,
		db: {
			salesOrders: {
				findFirst: async () => null,
			},
			users: {
				findFirstOrThrow: async () => ({
					id: 19,
					email: "viewer@example.test",
					name: "Read Only User",
					phoneNo: null,
					roles: [{ role: { id: 7, name: "Read Only" } }],
				}),
			},
			roles: {
				findFirstOrThrow: async () => ({
					name: "Read Only",
					RoleHasPermissions: permissionNames.map((name) => ({
						permission: { name },
					})),
				}),
			},
			modelHasPermissions: { findMany: async () => [] },
		},
	} as unknown as SalesCallerContext;
}

const markInput = {
	salesOrderId: 91,
	requestId: "00000000-0000-4000-8000-000000000091",
	reason: "Verified outside GND.",
	expectedRevision: "0".repeat(64),
	effectiveAt: null,
};

const bulkMarkInput = {
	salesOrderIds: [91, 92],
	requestId: "00000000-0000-4000-8000-000000000093",
	reason: "Verified outside GND.",
	effectiveAt: null,
};

const fallbackAttemptInput = {
	milestone: "PRODUCTION_COMPLETED" as const,
	fullWorkflowRequestId: "00000000-0000-4000-8000-000000000094",
};

const fallbackMarkInput = {
	...fallbackAttemptInput,
	requestId: "00000000-0000-4000-8000-000000000095",
	reason: "Physical completion was verified outside GND.",
	effectiveAt: null,
	candidates: [
		{
			salesOrderId: 91,
			expectedCompletionRevision: "0".repeat(64),
			expectedPipelineRevision: "1".repeat(64),
			administrativeOverrideRequired: false,
		},
	],
};

const cancelInput = {
	salesOrderId: 91,
	requestId: "00000000-0000-4000-8000-000000000092",
	expectedRevision: "0".repeat(64),
	reason: null,
};

describe("status-only Sales completion route permissions", () => {
	test("rejects forged fallback provenance on direct status-only routes", async () => {
		const caller = salesRouter.createCaller(
			context(["edit status only sales completion"]),
		);
		const forged = {
			...markInput,
			fallback: {
				fallbackDecisionRequestId: "00000000-0000-4000-8000-000000000096",
				fullWorkflowRequestId: "00000000-0000-4000-8000-000000000094",
				fullWorkflowStatus: "failed",
				fullWorkflowReason: "Forged client claim",
				expectedPipelineRevision: "1".repeat(64),
			},
		};

		await expect(
			caller.markProductionCompletionStatusOnly(forged),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			caller.markFulfillmentCompletionStatusOnly(forged),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	test("requires an authenticated session", async () => {
		const caller = salesRouter.createCaller({ db: {} } as SalesCallerContext);

		await expect(
			caller.salesCompletionProjection({ salesOrderId: 91 }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			caller.markFulfillmentCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			caller.markProductionCompletionStatusOnlyBulk(bulkMarkInput),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			caller.markFulfillmentCompletionStatusOnlyBulk(bulkMarkInput),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			caller.salesCompletionStatusOnlyFallbackPreview(fallbackAttemptInput),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		await expect(
			caller.markSalesCompletionStatusOnlyFallback(fallbackMarkInput),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	test("rejects direct mark and cancel requests before domain access", async () => {
		const caller = salesRouter.createCaller(context());

		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.cancelProductionCompletionStatusOnly(cancelInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markFulfillmentCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markProductionCompletionStatusOnlyBulk(bulkMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markFulfillmentCompletionStatusOnlyBulk(bulkMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.cancelFulfillmentCompletionStatusOnly(cancelInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.salesCompletionStatusOnlyFallbackPreview(fallbackAttemptInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markSalesCompletionStatusOnlyFallback(fallbackMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("view capability does not authorize either mutation", async () => {
		const caller = salesRouter.createCaller(
			context(["view status only sales completion"]),
		);

		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.cancelProductionCompletionStatusOnly(cancelInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markFulfillmentCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markProductionCompletionStatusOnlyBulk(bulkMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markFulfillmentCompletionStatusOnlyBulk(bulkMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.cancelFulfillmentCompletionStatusOnly(cancelInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.salesCompletionStatusOnlyFallbackPreview(fallbackAttemptInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markSalesCompletionStatusOnlyFallback(fallbackMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	test("edit capability can load the projection required to submit", async () => {
		const caller = salesRouter.createCaller(
			context(["edit status only sales completion"]),
		);

		await expect(
			caller.salesCompletionProjection({ salesOrderId: 91 }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	test("Sales Order editors can load the canonical projection and use the exception command boundary", async () => {
		const caller = salesRouter.createCaller(context(["edit orders"]));

		await expect(
			caller.salesCompletionProjection({ salesOrderId: 91 }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.not.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markFulfillmentCompletionStatusOnly(markInput),
		).rejects.not.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.salesCompletionStatusOnlyFallbackPreview(fallbackAttemptInput),
		).rejects.not.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markSalesCompletionStatusOnlyFallback(fallbackMarkInput),
		).rejects.not.toMatchObject({ code: "FORBIDDEN" });
	});

	test("a raw snake-case row authorizes neither presentation nor editing", async () => {
		const caller = salesRouter.createCaller(
			context(["status_only_sales_completion"]),
		);

		await expect(
			caller.salesCompletionProjection({ salesOrderId: 91 }),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markProductionCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markFulfillmentCompletionStatusOnly(markInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markProductionCompletionStatusOnlyBulk(bulkMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markFulfillmentCompletionStatusOnlyBulk(bulkMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.salesCompletionStatusOnlyFallbackPreview(fallbackAttemptInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(
			caller.markSalesCompletionStatusOnlyFallback(fallbackMarkInput),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});
