import { beforeEach, describe, expect, it, mock } from "bun:test";

const submitNonProductionsActionMock = mock(async () => ({}));
const submitAssignmentsActionMock = mock(async () => ({}));
const packDispatchItemsActionMock = mock(async () => ({
	created: 1,
	skipped: 0,
}));
const resetSalesActionMock = mock(async () => ({}));
const createSalesAssignmentActionMock = mock(async () => ({}));
const autoReviewSalesPaymentsForOrderActionMock = mock(async () => ({}));
const recognizeSalesTaxForFulfilledOrderMock = mock(async () => ({
	status: "recognized" as const,
}));
const prepareProductionSubmissionMaterialReviewMock = mock(async () => ({
	state: "finalized",
	reason: null,
	reviewId: null,
	materialRevision: "ready-revision",
}));
const getSalesSettingMock = mock(async () => ({ data: {} }));
const saveNoteMock = mock(async () => ({}));
const getSaleInformationMock = mock(async () => ({
	order: { id: 9001 },
	items: [],
}));
const actualActions = await import("./actions");

function withNoPendingPackingReport<T extends Record<string, unknown>>(
	target: T,
	pending = 0,
) {
	return Object.assign(target, {
		$queryRaw: async () => [{ id: 1 }],
		salesPackingReport: { count: async () => pending },
	});
}

function packingSafeDb<T extends Record<string, unknown>>(tx: T) {
	const guardedOrderDelivery =
		((tx as any).orderDelivery as Record<string, unknown> | undefined) || {};
	guardedOrderDelivery.findFirst ||= mock(async () => ({ id: 1 }));
	(tx as any).orderDelivery = guardedOrderDelivery;
	const guardedTx = withNoPendingPackingReport(tx);
	return {
		...guardedTx,
		$transaction: async (
			callback: (client: typeof guardedTx) => Promise<unknown>,
		) => callback(guardedTx),
	};
}

mock.module("./actions", () => ({
	...actualActions,
	submitNonProductionsAction: submitNonProductionsActionMock,
	submitAssignmentsAction: submitAssignmentsActionMock,
	packDispatchItemsAction: packDispatchItemsActionMock,
	resetSalesAction: resetSalesActionMock,
	createSalesAssignmentAction: createSalesAssignmentActionMock,
}));

mock.module("./get-sale-information", () => ({
	getSaleInformation: getSaleInformationMock,
}));

mock.module("../payment-system/application/payment-review", () => ({
	autoReviewSalesPaymentsForOrderAction:
		autoReviewSalesPaymentsForOrderActionMock,
}));

mock.module("../tax-system", () => ({
	recognizeSalesTaxForFulfilledOrder: recognizeSalesTaxForFulfilledOrderMock,
}));

mock.module("./settings", () => ({
	getSalesSetting: getSalesSettingMock,
}));

const tasksModule = await import("./tasks");

describe("sales-control task transactions", () => {
	beforeEach(() => {
		submitNonProductionsActionMock.mockClear();
		submitAssignmentsActionMock.mockClear();
		packDispatchItemsActionMock.mockClear();
		resetSalesActionMock.mockClear();
		createSalesAssignmentActionMock.mockClear();
		autoReviewSalesPaymentsForOrderActionMock.mockClear();
		recognizeSalesTaxForFulfilledOrderMock.mockClear();
		prepareProductionSubmissionMaterialReviewMock.mockClear();
		getSalesSettingMock.mockClear();
		saveNoteMock.mockClear();
		getSaleInformationMock.mockClear();
	});

	it("blocks batch fulfillment before packing when a report is pending", async () => {
		const db = withNoPendingPackingReport(
			{
				orderDelivery: { findFirst: async () => ({ id: 77 }) },
			},
			1,
		) as Parameters<typeof tasksModule.markAsCompletedTask>[0];
		const input = {
			meta: { salesId: 9001, authorId: 12 },
			markAsCompleted: { dispatchId: 77 },
		} as Parameters<typeof tasksModule.markAsCompletedTask>[1];
		await expect(tasksModule.markAsCompletedTask(db, input)).rejects.toThrow(
			"awaiting packing report review",
		);
		expect(packDispatchItemsActionMock).not.toHaveBeenCalled();
	});

	it("consumes dispatch-bound inventory in the completion transaction", async () => {
		const calls: string[] = [];
		const completeInventoryDispatch = mock(async () => {
			calls.push("inventory.complete");
			return {
				executionMode: "inventory" as const,
				allocationIds: [7],
				consumedQty: 1,
			};
		});
		const tx = {
			orderDelivery: {
				findFirst: mock(async () => ({
					status: "in progress",
					deliveredAt: null,
					salesOrderId: 500,
					meta: {
						dispatchCompletion: {
							requestId: "request-1",
							status: "uploading",
						},
					},
				})),
				update: mock(async (payload: any) => {
					calls.push("dispatch.update");
					return payload;
				}),
			},
		};
		const db = packingSafeDb(tx);

		await tasksModule.submitDispatchTask(
			db as any,
			{
				meta: { salesId: 500, authorId: 12, authorName: "Driver" },
				submitDispatch: {
					dispatchId: 77,
					completionRequestId: "request-1",
				},
			} as any,
			{
				saveNoteAction: saveNoteMock,
				completeInventoryDispatch,
			} as any,
		);

		expect(calls.slice(0, 2)).toEqual([
			"inventory.complete",
			"dispatch.update",
		]);
		expect(tx.orderDelivery.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					meta: expect.objectContaining({
						inventoryDispatch: expect.objectContaining({
							status: "consumed",
							consumedQty: 1,
						}),
					}),
				}),
			}),
		);
	});

	it("submits pending-material work atomically and defers completion side effects", async () => {
		getSaleInformationMock.mockResolvedValueOnce({
			order: { id: 9001 },
			items: [
				{
					controlUid: "door-1",
					itemId: 10,
					analytics: {
						assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
						pendingSubmissions: [
							{
								assignmentId: 77,
								qty: { qty: 1, lh: 0, rh: 1 },
							},
						],
					},
				},
			],
		});
		prepareProductionSubmissionMaterialReviewMock.mockResolvedValueOnce({
			state: "pending_material_review",
			reason: "AWAITING_INBOUND",
			reviewId: 55,
			materialRevision: "pending-revision",
		});
		const refreshAssignmentScope = mock(async () => undefined);
		submitAssignmentsActionMock.mockResolvedValueOnce(1);
		const tx = {
			orderProductionSubmissions: {
				count: mock(async () => 0),
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};

		const result = await tasksModule.submitAllTask(
			db as any,
			{
				meta: { salesId: 9001, authorId: 12 },
				submitAll: {
					assignedToId: 12,
					idempotencyKey: "submit-9001-77",
					selections: [{ assignmentId: 77 }],
				},
			} as any,
			{
				prepareMaterialReview: prepareProductionSubmissionMaterialReviewMock,
				refreshAssignmentScope,
			},
		);

		expect(prepareProductionSubmissionMaterialReviewMock).toHaveBeenCalledWith(
			tx,
			{
				salesOrderId: 9001,
				submittedById: 12,
				idempotencyKey: "submit-9001-77",
				itemScope: [
					{
						assignmentId: 77,
						controlUid: "door-1",
						salesItemId: 10,
					},
				],
			},
		);
		expect(submitAssignmentsActionMock).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({ materialReviewId: 55 }),
		);
		expect(refreshAssignmentScope).toHaveBeenCalledWith(tx, 55);
		expect(autoReviewSalesPaymentsForOrderActionMock).not.toHaveBeenCalled();
		expect(result).toEqual({
			state: "pending_material_review",
			reason: "AWAITING_INBOUND",
			reviewId: 55,
			materialRevision: "pending-revision",
			submittedCount: 1,
			idempotentReplay: false,
		});
	});

	it("finalizes ready-material work and creates payroll in the same transaction", async () => {
		getSaleInformationMock.mockResolvedValueOnce({
			order: { id: 9001 },
			items: [
				{
					controlUid: "door-1",
					itemId: 10,
					analytics: {
						assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
						pendingSubmissions: [
							{
								assignmentId: 77,
								qty: { qty: 1, lh: 0, rh: 1 },
							},
						],
					},
				},
			],
		});
		prepareProductionSubmissionMaterialReviewMock.mockResolvedValueOnce({
			state: "finalized",
			reason: null,
			reviewId: 56,
			materialRevision: "ready-revision",
		});
		submitAssignmentsActionMock.mockResolvedValueOnce(1);
		const payrollUpsert = mock(async () => ({}));
		const tx = {
			orderProductionSubmissions: {
				count: mock(async () => 0),
				findMany: mock(async () => [
					{
						id: 501,
						qty: 1,
						assignment: {
							assignedToId: 12,
							laborCost: 25,
							salesItemControlUid: "door-1",
						},
					},
				]),
			},
			payroll: {
				upsert: payrollUpsert,
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};

		const result = await tasksModule.submitAllTask(
			db as any,
			{
				meta: { salesId: 9001, authorId: 12 },
				submitAll: {
					assignedToId: 12,
					idempotencyKey: "submit-ready-9001-77",
					selections: [{ assignmentId: 77 }],
				},
			} as any,
			{
				prepareMaterialReview: prepareProductionSubmissionMaterialReviewMock,
			},
		);

		expect(submitAssignmentsActionMock).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({ materialReviewId: 56 }),
		);
		expect(payrollUpsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { productionSubmissionId: 501 },
				create: expect.objectContaining({
					amount: 25,
					productionSubmissionId: 501,
					userId: 12,
				}),
			}),
		);
		expect(autoReviewSalesPaymentsForOrderActionMock).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			state: "finalized",
			reason: null,
			reviewId: 56,
			materialRevision: "ready-revision",
			submittedCount: 1,
			idempotentReplay: false,
		});
	});

	it("returns an existing pending batch without duplicating submissions", async () => {
		getSaleInformationMock.mockResolvedValueOnce({
			order: { id: 9001 },
			items: [
				{
					controlUid: "door-1",
					itemId: 10,
					analytics: {
						assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
						pendingSubmissions: [
							{
								assignmentId: 77,
								qty: { qty: 1, lh: 0, rh: 1 },
							},
						],
					},
				},
			],
		});
		prepareProductionSubmissionMaterialReviewMock.mockResolvedValueOnce({
			state: "pending_material_review",
			reason: "AWAITING_INBOUND",
			reviewId: 55,
			materialRevision: "pending-revision",
		});
		const tx = {
			orderProductionSubmissions: {
				count: mock(async () => 1),
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};

		const result = await tasksModule.submitAllTask(
			db as any,
			{
				meta: { salesId: 9001, authorId: 12 },
				submitAll: {
					assignedToId: 12,
					idempotencyKey: "submit-9001-77",
					selections: [{ assignmentId: 77 }],
				},
			} as any,
			{
				prepareMaterialReview: prepareProductionSubmissionMaterialReviewMock,
			},
		);

		expect(submitAssignmentsActionMock).not.toHaveBeenCalled();
		expect(resetSalesActionMock).not.toHaveBeenCalled();
		expect(result).toEqual({
			state: "pending_material_review",
			reason: "AWAITING_INBOUND",
			reviewId: 55,
			materialRevision: "pending-revision",
			submittedCount: 1,
			idempotentReplay: true,
		});
	});

	it("creates assignment and override-use audit in the same transaction", async () => {
		getSaleInformationMock.mockResolvedValueOnce({
			order: { id: 9001 },
			items: [
				{
					controlUid: "door-1",
					analytics: {
						assignment: {
							pending: { qty: 2, lh: 0, rh: 2 },
						},
					},
				},
			],
		});
		const tx = {
			salesHistory: {
				create: mock(async () => ({})),
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};
		const repairReceivedInboundNeeds = mock(async () => ({
			inboundIds: [70],
			changedCount: 1,
			updatedDemandCount: 1,
			recomputedComponentCount: 1,
			affectedSalesOrderIds: [9001],
		}));

		await tasksModule.createAssignmentsTask(
			db as any,
			{
				meta: {
					salesId: 9001,
					authorId: 12,
					authorName: "Operator",
				},
				createAssignments: {
					assignedToId: 13,
					selections: [
						{
							uid: "door-1",
							qty: { qty: 2, lh: 0, rh: 2 },
						},
					],
				},
			} as any,
			{
				productionReadinessOverride: {
					revision: "revision-1",
					lineItemUids: ["door-1"],
				},
				repairReceivedInboundNeeds,
			},
		);

		expect(repairReceivedInboundNeeds).toHaveBeenCalledWith(tx, {
			salesOrderId: 9001,
			actorUserId: 12,
		});
		expect(createSalesAssignmentActionMock).toHaveBeenCalledTimes(1);
		expect(createSalesAssignmentActionMock.mock.calls[0]?.[0]).toBe(tx);
		expect(tx.salesHistory.create).toHaveBeenCalledTimes(1);
		expect(tx.salesHistory.create).toHaveBeenCalledWith({
			data: {
				salesId: 9001,
				name: "Production inventory readiness override used",
				authorName: "Operator",
				data: {
					event: "production_readiness_override_used",
					revision: "revision-1",
					triggeredByUserId: 12,
					lineItemUids: ["door-1"],
				},
			},
		});
	});

	it("clearPackingTask updates and resets within the same transaction", async () => {
		const tx = {
			orderDelivery: {
				findMany: mock(async () => [{ id: 44 }]),
				count: mock(async () => 1),
			},
			orderItemDelivery: {
				updateMany: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		await tasksModule.clearPackingTask(
			db as any,
			{
				meta: { salesId: 321, authorName: "Tester" },
				clearPackings: { dispatchId: 44 },
			} as any,
		);

		expect(tx.orderItemDelivery.updateMany).toHaveBeenCalledTimes(1);
		expect(resetSalesActionMock).toHaveBeenCalledTimes(1);
		expect(resetSalesActionMock).toHaveBeenCalledWith(tx, 321);
	});

	it("locks and rejects a clear before any packed row changes", async () => {
		const calls: string[] = [];
		const updateMany = mock(async () => {
			calls.push("unpack");
			return { count: 1 };
		});
		const tx = withNoPendingPackingReport(
			{
				orderDelivery: {
					findMany: async () => [{ id: 41 }],
					count: async () => 1,
				},
				orderItemDelivery: { updateMany },
			},
			1,
		);
		tx.$queryRaw = async () => {
			calls.push("dispatch-lock");
			return [{ id: 41 }];
		};
		tx.salesPackingReport.count = async () => {
			calls.push("pending-report-hold");
			return 1;
		};
		const options: unknown[] = [];
		const db = {
			$transaction: async (
				callback: (client: typeof tx) => Promise<unknown>,
				transactionOptions: unknown,
			) => {
				options.push(transactionOptions);
				return callback(tx);
			},
		};

		await expect(
			tasksModule.clearPackingTask(
				db as any,
				{
					meta: { salesId: 91, authorId: 7, authorName: "Packer" },
					clearPackings: { dispatchId: 41 },
				} as any,
			),
		).rejects.toThrow("awaiting packing report review");
		expect(calls).toEqual(["dispatch-lock", "pending-report-hold"]);
		expect(updateMany).not.toHaveBeenCalled();
		expect(options).toEqual([{ isolationLevel: "Serializable" }]);
	});

	it("rolls a clear back when derived-state reset fails", async () => {
		let packingStatus = "packed";
		resetSalesActionMock.mockRejectedValueOnce(new Error("RESET_FAILED"));
		const tx = withNoPendingPackingReport({
			orderDelivery: {
				findMany: async () => [{ id: 41 }],
				count: async () => 1,
			},
			orderItemDelivery: {
				updateMany: async () => {
					packingStatus = "unpacked";
					return { count: 1 };
				},
			},
		});
		const db = {
			$transaction: async (
				callback: (client: typeof tx) => Promise<unknown>,
			) => {
				const before = packingStatus;
				try {
					return await callback(tx);
				} catch (error) {
					packingStatus = before;
					throw error;
				}
			},
		};

		await expect(
			tasksModule.clearPackingTask(
				db as any,
				{
					meta: { salesId: 91, authorId: 7, authorName: "Packer" },
					clearPackings: { dispatchId: 41 },
				} as any,
			),
		).rejects.toThrow("RESET_FAILED");
		expect(packingStatus).toBe("packed");
	});

	it("keeps legacy unscoped rows in clear-all alongside locked active dispatches", async () => {
		let unpackWhere: unknown;
		const tx = withNoPendingPackingReport({
			orderDelivery: {
				findMany: async () => [{ id: 41 }, { id: 42 }],
				count: async () => 2,
			},
			orderItemDelivery: {
				updateMany: async ({ where }: { where: unknown }) => {
					unpackWhere = where;
					return { count: 3 };
				},
			},
		});
		const db = packingSafeDb(tx);

		await tasksModule.clearPackingTask(
			db as any,
			{
				meta: { salesId: 91, authorId: 7, authorName: "Packer" },
				clearPackings: {},
			} as any,
		);
		expect(unpackWhere).toEqual({
			orderId: 91,
			deletedAt: null,
			OR: [{ orderDeliveryId: null }, { orderDeliveryId: { in: [41, 42] } }],
			packingStatus: { not: "unpacked" },
		});
	});

	it("locks single-item unpack and rolls it back with derived state", async () => {
		let packingStatus = "packed";
		let readCount = 0;
		resetSalesActionMock.mockRejectedValueOnce(new Error("RESET_FAILED"));
		const tx = withNoPendingPackingReport({
			orderItemDelivery: {
				findFirst: async () => {
					readCount += 1;
					return readCount === 1
						? { id: 701, orderDeliveryId: 41 }
						: { id: 701 };
				},
				updateMany: async () => {
					packingStatus = "unpacked";
					return { count: 1 };
				},
			},
		});
		const db = {
			$transaction: async (
				callback: (client: typeof tx) => Promise<unknown>,
			) => {
				const before = packingStatus;
				try {
					return await callback(tx);
				} catch (error) {
					packingStatus = before;
					throw error;
				}
			},
		};

		await expect(
			tasksModule.deletePackingItem(
				db as any,
				{
					salesId: 91,
					packingId: 701,
				},
				"Authenticated Packer",
			),
		).rejects.toThrow("RESET_FAILED");
		expect(packingStatus).toBe("packed");
	});

	it("attributes a single-item unpack to the server-derived actor", async () => {
		let readCount = 0;
		const updateMany = mock(async () => ({ count: 1 }));
		const tx = withNoPendingPackingReport({
			orderItemDelivery: {
				findFirst: async () => {
					readCount += 1;
					return readCount === 1
						? { id: 701, orderDeliveryId: 41 }
						: { id: 701 };
				},
				updateMany,
			},
		});
		const db = {
			$transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
				callback(tx),
		};

		await tasksModule.deletePackingItem(
			db as any,
			{ salesId: 91, packingId: 701 },
			"Authenticated Packer",
		);

		expect(updateMany).toHaveBeenCalledWith({
			where: {
				id: 701,
				orderId: 91,
				orderDeliveryId: 41,
				deletedAt: null,
			},
			data: {
				packingStatus: "unpacked",
				unpackedBy: "Authenticated Packer",
			},
		});
	});

	it("rejects single-item unpack after the dispatch lock when a report is pending", async () => {
		const calls: string[] = [];
		const updateMany = mock(async () => ({ count: 1 }));
		const tx = withNoPendingPackingReport(
			{
				orderItemDelivery: {
					findFirst: async () => ({ id: 701, orderDeliveryId: 41 }),
					updateMany,
				},
			},
			1,
		);
		tx.$queryRaw = async () => {
			calls.push("dispatch-lock");
			return [{ id: 41 }];
		};
		tx.salesPackingReport.count = async () => {
			calls.push("pending-report-hold");
			return 1;
		};
		const db = {
			$transaction: async (callback: (client: typeof tx) => Promise<unknown>) =>
				callback(tx),
		};

		await expect(
			tasksModule.deletePackingItem(
				db as any,
				{
					salesId: 91,
					packingId: 701,
				},
				"Authenticated Packer",
			),
		).rejects.toThrow("awaiting packing report review");
		expect(calls).toEqual(["dispatch-lock", "pending-report-hold"]);
		expect(updateMany).not.toHaveBeenCalled();
	});

	it("cancelDispatchTask transitions every dispatch and resets within same transaction", async () => {
		const tx = {
			orderDelivery: {
				updateMany: mock(async () => ({ count: 2 })),
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};

		await tasksModule.cancelDispatchTask(
			db as any,
			{
				meta: { salesId: 777 },
				cancelDispatch: { dispatchIds: [55, 56] },
			} as any,
		);

		expect(tx.orderDelivery.updateMany).toHaveBeenCalledTimes(1);
		expect(tx.orderDelivery.updateMany).toHaveBeenCalledWith({
			where: {
				id: { in: [55, 56] },
				salesOrderId: 777,
				deletedAt: null,
			},
			data: { status: "cancelled", deliveredAt: null },
		});
		expect(resetSalesActionMock).toHaveBeenCalledTimes(1);
		expect(resetSalesActionMock).toHaveBeenCalledWith(tx, 777);
	});

	it("checks inventory readiness before starting a dispatch in the same transaction", async () => {
		const calls: string[] = [];
		const assertInventoryReady = mock(async () => {
			calls.push("inventory.ready");
		});
		const tx = {
			orderDelivery: {
				updateMany: mock(async () => {
					calls.push("dispatch.start");
					return { count: 1 };
				}),
			},
		};
		const db = packingSafeDb(tx);

		await tasksModule.startDispatchTask(
			db as any,
			{
				meta: { salesId: 777 },
				startDispatch: { dispatchId: 55 },
			} as any,
			{
				assertInventoryReady,
			},
		);

		expect(calls).toEqual(["inventory.ready", "dispatch.start"]);
		expect(assertInventoryReady).toHaveBeenCalledWith(tx, {
			orderDeliveryId: 55,
			salesOrderId: 777,
		});
	});

	it("rejects dispatch ids outside the parent sales order", async () => {
		const tx = {
			orderDelivery: {
				updateMany: mock(async () => ({ count: 1 })),
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};

		await expect(
			tasksModule.cancelDispatchTask(
				db as any,
				{
					meta: { salesId: 777 },
					cancelDispatch: { dispatchIds: [55, 56] },
				} as any,
			),
		).rejects.toThrow(
			"One or more fulfillment dispatches do not belong to this sales order.",
		);
		expect(resetSalesActionMock).toHaveBeenCalledTimes(0);
	});

	it("packDispatchItemTask packs and resets within same transaction client", async () => {
		const tx = {
			orderDelivery: {
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		const response = await tasksModule.packDispatchItemTask(
			db as any,
			{
				meta: { salesId: 909, authorId: 12, authorName: "Operator" },
				packItems: {
					dispatchId: 90,
					dispatchStatus: "queue",
					packMode: "selection",
					packingLines: [{ salesItemId: 1, submissionId: 2, qty: { qty: 1 } }],
				},
			} as any,
		);

		expect(getSaleInformationMock).toHaveBeenCalledTimes(1);
		expect(packDispatchItemsActionMock).toHaveBeenCalledTimes(1);
		expect(packDispatchItemsActionMock.mock.calls[0]?.[0]).toBe(tx);
		expect(tx.orderDelivery.update).toHaveBeenCalledTimes(1);
		expect(resetSalesActionMock).toHaveBeenCalledTimes(1);
		expect(resetSalesActionMock).toHaveBeenCalledWith(tx, 909);
		expect(response).toEqual({ created: 1, skipped: 0 });
	});

	it("marks a dispatch complete without submitting the same production scope twice", async () => {
		const productionInfo = {
			order: { id: 9001 },
			items: [
				{
					controlUid: "door-1",
					itemId: 10,
					analytics: {
						assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
						pendingSubmissions: [
							{
								assignmentId: 77,
								qty: { qty: 1, lh: 0, rh: 0 },
							},
						],
					},
				},
			],
		};
		getSaleInformationMock
			.mockResolvedValueOnce(productionInfo)
			.mockResolvedValueOnce(productionInfo)
			.mockResolvedValueOnce({
				order: { id: 9001 },
				items: [
					{
						controlUid: "door-1",
						itemId: 10,
						analytics: {
							assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
							pendingSubmissions: [],
						},
						deliverables: [
							{ submissionId: 501, qty: { qty: 1, lh: 0, rh: 0 } },
						],
					},
				],
			});
		submitAssignmentsActionMock.mockResolvedValue(1);
		const tx = {
			orderProductionSubmissions: {
				count: mock(async () => 0),
			},
			orderItemDelivery: {
				updateMany: mock(async () => ({ count: 0 })),
			},
			orderDelivery: {
				findFirst: mock(async () => ({
					status: "packed",
					deliveredAt: null,
					salesOrderId: 9001,
					meta: {},
				})),
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		await tasksModule.markAsCompletedTask(
			db as any,
			{
				meta: { salesId: 9001, authorId: 12, authorName: "Operator" },
				markAsCompleted: {
					dispatchId: 90,
					receivedBy: "Customer",
					note: "Delivered",
				},
			} as any,
			{
				prepareMaterialReview: prepareProductionSubmissionMaterialReviewMock,
				saveNoteAction: saveNoteMock,
			},
		);

		expect(submitAssignmentsActionMock).toHaveBeenCalledTimes(1);
		expect(submitAssignmentsActionMock).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				submissionSource: "sales_mark_as_completed",
			}),
		);
		expect(packDispatchItemsActionMock).toHaveBeenCalledTimes(1);
		expect(saveNoteMock).toHaveBeenCalledTimes(1);
	});

	it("marks an already-produced dispatch complete without requiring another submission", async () => {
		const producedInfo = {
			order: { id: 9001 },
			items: [
				{
					controlUid: "door-1",
					itemId: 10,
					analytics: {
						assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
						pendingSubmissions: [],
					},
					deliverables: [{ submissionId: 501, qty: { qty: 1, lh: 0, rh: 0 } }],
				},
			],
		};
		getSaleInformationMock
			.mockResolvedValueOnce(producedInfo)
			.mockResolvedValueOnce(producedInfo)
			.mockResolvedValueOnce(producedInfo);
		const tx = {
			orderItemDelivery: {
				updateMany: mock(async () => ({ count: 0 })),
			},
			orderDelivery: {
				findFirst: mock(async () => ({
					status: "packed",
					deliveredAt: null,
					salesOrderId: 9001,
					meta: {},
				})),
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		await tasksModule.markAsCompletedTask(
			db as any,
			{
				meta: { salesId: 9001, authorId: 12, authorName: "Operator" },
				markAsCompleted: {
					dispatchId: 90,
					receivedBy: "Customer",
					note: "Delivered",
				},
			} as any,
			{ saveNoteAction: saveNoteMock },
		);

		expect(submitAssignmentsActionMock).not.toHaveBeenCalled();
		expect(packDispatchItemsActionMock).toHaveBeenCalledTimes(1);
		expect(packDispatchItemsActionMock.mock.calls[0]?.[1]).toEqual(
			expect.objectContaining({
				packItems: expect.objectContaining({
					packingLines: [
						{
							salesItemId: 10,
							submissionId: 501,
							qty: { qty: 1, lh: 0, rh: 0 },
						},
					],
				}),
			}),
		);
		expect(
			"replaceExisting" in
				packDispatchItemsActionMock.mock.calls[0]?.[1].packItems,
		).toBe(false);
		expect(saveNoteMock).toHaveBeenCalledTimes(1);
	});

	it("releases automatic non-production work from material review before fulfillment", async () => {
		const nonProductionInfo = {
			order: { id: 9001 },
			items: [
				{
					controlUid: "moulding-1",
					itemId: 10,
					itemConfig: { shipping: true },
					analytics: {
						assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
						pendingSubmissions: [],
					},
					deliverables: [],
				},
			],
		};
		getSaleInformationMock
			.mockResolvedValueOnce(nonProductionInfo)
			.mockResolvedValueOnce(nonProductionInfo)
			.mockResolvedValueOnce({
				...nonProductionInfo,
				items: [
					{
						...nonProductionInfo.items[0],
						deliverables: [
							{ submissionId: 501, qty: { qty: 1, lh: 0, rh: 0 } },
						],
					},
				],
			});
		const tx = {
			orderProductionSubmissions: {
				findMany: mock(async () => [
					{
						id: 501,
						materialReviewId: 81,
						meta: { source: "sales_mark_as_completed" },
					},
				]),
				updateMany: mock(async () => ({ count: 1 })),
			},
			salesProductionSubmissionMaterialReview: {
				updateMany: mock(async () => ({ count: 1 })),
			},
			salesHistory: {
				create: mock(async () => ({})),
			},
			orderDelivery: {
				findFirst: mock(async () => ({
					status: "packed",
					deliveredAt: null,
					salesOrderId: 9001,
					meta: {},
				})),
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		await tasksModule.markAsCompletedTask(
			db as any,
			{
				meta: { salesId: 9001, authorId: 12, authorName: "Operator" },
				markAsCompleted: {
					dispatchId: 90,
					receivedBy: "Customer",
				},
			} as any,
			{ saveNoteAction: saveNoteMock },
		);

		expect(tx.orderProductionSubmissions.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ data: { materialReviewId: null } }),
		);
		expect(
			tx.salesProductionSubmissionMaterialReview.updateMany,
		).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: { in: [81] } }),
				data: expect.objectContaining({ status: "CANCELLED" }),
			}),
		);
		expect(tx.salesHistory.create).toHaveBeenCalledTimes(1);
		expect(packDispatchItemsActionMock).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				packItems: expect.objectContaining({
					packingLines: [
						{
							salesItemId: 10,
							submissionId: 501,
							qty: { qty: 1, lh: 0, rh: 0 },
						},
					],
				}),
			}),
		);
		expect(saveNoteMock).toHaveBeenCalledTimes(1);
	});

	it("does not complete an empty dispatch while material review is pending", async () => {
		const producedInfo = {
			order: { id: 9001 },
			items: [
				{
					controlUid: "door-1",
					itemId: 10,
					analytics: {
						assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
						pendingSubmissions: [],
					},
					deliverables: [],
				},
			],
		};
		getSaleInformationMock
			.mockResolvedValueOnce(producedInfo)
			.mockResolvedValueOnce(producedInfo)
			.mockResolvedValueOnce(producedInfo);
		packDispatchItemsActionMock.mockResolvedValueOnce({
			created: 0,
			skipped: 0,
		});
		const tx = {
			orderItemDelivery: {
				count: mock(async () => 0),
			},
			orderProductionSubmissions: {
				count: mock(async () => 1),
			},
			orderDelivery: {
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		await expect(
			tasksModule.markAsCompletedTask(
				db as any,
				{
					meta: { salesId: 9001, authorId: 12, authorName: "Operator" },
					markAsCompleted: {
						dispatchId: 90,
						receivedBy: "Customer",
					},
				} as any,
				{ saveNoteAction: saveNoteMock },
			),
		).rejects.toThrow(
			"Unable to fulfill while production submissions are awaiting material review.",
		);

		expect(tx.orderDelivery.update).not.toHaveBeenCalled();
		expect(saveNoteMock).not.toHaveBeenCalled();
	});

	it("rejects a direct production submission when there is nothing to submit", async () => {
		getSaleInformationMock.mockResolvedValueOnce({
			order: { id: 9001 },
			items: [
				{
					controlUid: "door-1",
					itemId: 10,
					analytics: {
						assignment: { pending: { qty: 0, lh: 0, rh: 0 } },
						pendingSubmissions: [],
					},
				},
			],
		});

		await expect(
			tasksModule.submitAllTask(
				{} as any,
				{
					meta: { salesId: 9001, authorId: 12 },
					submitAll: {},
				} as any,
			),
		).rejects.toThrow("Unable to complete, nothing to submit!");

		expect(submitAssignmentsActionMock).not.toHaveBeenCalled();
	});

	it("packDispatchItemTask can replace existing dispatch packings atomically", async () => {
		const tx = {
			orderItemDelivery: {
				updateMany: mock(async () => ({})),
			},
			orderDelivery: {
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		await tasksModule.packDispatchItemTask(
			db as any,
			{
				meta: { salesId: 901, authorId: 17, authorName: "Operator" },
				packItems: {
					dispatchId: 91,
					dispatchStatus: "queue",
					packMode: "selection",
					replaceExisting: true,
					packingLines: [{ salesItemId: 1, submissionId: 2, qty: { qty: 1 } }],
				},
			} as any,
		);

		expect(tx.orderItemDelivery.updateMany).toHaveBeenCalledTimes(1);
		expect(tx.orderItemDelivery.updateMany).toHaveBeenCalledWith({
			where: {
				orderId: 901,
				orderDeliveryId: 91,
				packingStatus: {
					not: "unpacked",
				},
			},
			data: {
				packingStatus: "unpacked",
				unpackedBy: "Operator",
			},
		});
		expect(packDispatchItemsActionMock).toHaveBeenCalledTimes(1);
		expect(tx.orderDelivery.update).toHaveBeenCalledTimes(1);
	});

	it("rejects a cross-sale packing dispatch after the lock with zero packing writes", async () => {
		const calls: string[] = [];
		let dispatchRead = 0;
		const updateMany = mock(async () => ({ count: 1 }));
		const tx = {
			orderItemDelivery: { updateMany },
			orderDelivery: {
				findFirst: mock(async () => {
					dispatchRead += 1;
					calls.push("dispatch-scope");
					return dispatchRead === 1 ? { id: 91 } : null;
				}),
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);
		(tx as any).$queryRaw = async () => {
			calls.push("dispatch-lock");
			return [{ id: 91 }];
		};
		(tx as any).salesPackingReport.count = async () => {
			calls.push("pending-hold");
			return 0;
		};

		await expect(
			tasksModule.packDispatchItemTask(
				db as any,
				{
					meta: { salesId: 901, authorId: 17, authorName: "Operator" },
					packItems: {
						dispatchId: 91,
						dispatchStatus: "queue",
						packMode: "selection",
						replaceExisting: true,
						packingLines: [
							{ salesItemId: 1, submissionId: 2, qty: { qty: 1 } },
						],
					},
				} as any,
			),
		).rejects.toThrow("Packing dispatch scope changed before it was updated.");

		expect(calls).toEqual([
			"dispatch-scope",
			"pending-hold",
			"dispatch-lock",
			"pending-hold",
			"dispatch-scope",
		]);
		expect(updateMany).not.toHaveBeenCalled();
		expect(packDispatchItemsActionMock).not.toHaveBeenCalled();
		expect(resetSalesActionMock).not.toHaveBeenCalled();
	});

	it("does not reset when transactional mutation fails", async () => {
		const tx = {
			orderDelivery: {
				findMany: mock(async () => [{ id: 88 }]),
				count: mock(async () => 1),
			},
			orderItemDelivery: {
				updateMany: mock(async () => {
					throw new Error("update failed");
				}),
			},
		};
		const db = packingSafeDb(tx);

		await expect(
			tasksModule.clearPackingTask(
				db as any,
				{
					meta: { salesId: 99, authorName: "Tester" },
					clearPackings: { dispatchId: 88 },
				} as any,
			),
		).rejects.toThrow("update failed");
		expect(resetSalesActionMock).toHaveBeenCalledTimes(0);
	});

	it("only deletes submissions created by automatic production completion", async () => {
		const tx = {
			orderProductionSubmissions: {
				findMany: mock(async () => [
					{ id: 10, meta: { source: "sales_mark_as_completed" } },
					{ id: 11, meta: {} },
					{ id: 12, meta: null },
				]),
				updateMany: mock(async () => ({})),
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};

		await tasksModule.deleteSubmissionsTask(
			db as any,
			{
				meta: { salesId: 777 },
				deleteSubmissions: { automaticCompletionSalesId: 777 },
			} as any,
		);

		expect(tx.orderProductionSubmissions.updateMany).toHaveBeenCalledTimes(1);
		expect(tx.orderProductionSubmissions.updateMany.mock.calls[0]?.[0]).toEqual(
			{
				where: { id: { in: [10] } },
				data: { deletedAt: expect.any(Date) },
			},
		);
		expect(resetSalesActionMock).toHaveBeenCalledWith(tx, 777);
	});

	it("rejects production cancellation when no automatic completion exists", async () => {
		const tx = {
			orderProductionSubmissions: {
				findMany: mock(async () => [{ id: 11, meta: {} }]),
				updateMany: mock(async () => ({})),
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};

		await expect(
			tasksModule.deleteSubmissionsTask(
				db as any,
				{
					meta: { salesId: 777 },
					deleteSubmissions: { automaticCompletionSalesId: 777 },
				} as any,
			),
		).rejects.toThrow(
			"No automatic production completion is available to cancel.",
		);
		expect(tx.orderProductionSubmissions.updateMany).toHaveBeenCalledTimes(0);
		expect(resetSalesActionMock).toHaveBeenCalledTimes(0);
	});

	it("rejects production cancellation for a different sales order", async () => {
		const tx = {
			orderProductionSubmissions: {
				findMany: mock(async () => []),
			},
		};
		const db = {
			$transaction: async (fn: any) => fn(tx),
		};

		await expect(
			tasksModule.deleteSubmissionsTask(
				db as any,
				{
					meta: { salesId: 777 },
					deleteSubmissions: { automaticCompletionSalesId: 778 },
				} as any,
			),
		).rejects.toThrow(
			"Production cancellation does not match this sales order.",
		);
		expect(tx.orderProductionSubmissions.findMany).toHaveBeenCalledTimes(0);
		expect(resetSalesActionMock).toHaveBeenCalledTimes(0);
	});

	it("retries selection packing after non-production submit when initial allocation is insufficient", async () => {
		const tx = {
			orderItemDelivery: {
				updateMany: mock(async () => ({})),
			},
			orderDelivery: {
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		getSaleInformationMock
			.mockResolvedValueOnce({
				order: { id: 9001 },
				items: [
					{
						itemId: 1,
						controlUid: "uid-1",
						title: "Alpha",
						deliverables: [{ submissionId: 1001, qty: { qty: 1 } }],
					},
				],
			})
			.mockResolvedValueOnce({
				order: { id: 9001 },
				items: [],
			})
			.mockResolvedValueOnce({
				order: { id: 9001 },
				items: [
					{
						itemId: 1,
						controlUid: "uid-1",
						title: "Alpha",
						deliverables: [
							{ submissionId: 1001, qty: { qty: 1 } },
							{ submissionId: 1002, qty: { qty: 1 } },
						],
					},
				],
			});

		await tasksModule.packDispatchItemTask(
			db as any,
			{
				meta: { salesId: 9001, authorId: 12, authorName: "Operator" },
				packItems: {
					dispatchId: 90,
					dispatchStatus: "queue",
					packMode: "selection",
					replaceExisting: true,
					requestedItems: [
						{
							salesItemId: 1,
							itemUid: "uid-1",
							title: "Alpha",
							qty: { qty: 2 },
						},
					],
				},
			} as any,
		);

		expect(submitNonProductionsActionMock).toHaveBeenCalledTimes(1);
		expect(packDispatchItemsActionMock).toHaveBeenCalledTimes(1);
		const payload = packDispatchItemsActionMock.mock.calls[0]?.[1];
		expect(payload.packItems.packingLines).toHaveLength(2);
		expect(payload.packItems.packingLines[0].submissionId).toBe(1001);
		expect(payload.packItems.packingLines[1].submissionId).toBe(1002);
	});

	it("reuses this dispatch's packed quantity when replacing its packing list", async () => {
		const tx = {
			orderItemDelivery: {
				updateMany: mock(async () => ({})),
			},
			orderDelivery: {
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		getSaleInformationMock.mockResolvedValueOnce({
			order: { id: 9001 },
			items: [
				{
					itemId: 1,
					controlUid: "uid-1",
					title: "Alpha",
					deliverables: [],
				},
			],
			deliveries: [
				{
					id: 90,
					items: [
						{
							qty: 1,
							lhQty: 0,
							rhQty: 0,
							orderProductionSubmissionId: 1001,
							submission: {
								assignment: { salesItemControlUid: "uid-1" },
							},
						},
					],
				},
			],
		});

		await tasksModule.packDispatchItemTask(
			db as any,
			{
				meta: { salesId: 9001, authorId: 12, authorName: "Operator" },
				packItems: {
					dispatchId: 90,
					dispatchStatus: "packed",
					packMode: "selection",
					replaceExisting: true,
					requestedItems: [
						{
							salesItemId: 1,
							itemUid: "uid-1",
							title: "Alpha",
							qty: { qty: 1 },
						},
					],
				},
			} as any,
		);

		expect(submitNonProductionsActionMock).not.toHaveBeenCalled();
		const payload = packDispatchItemsActionMock.mock.calls[0]?.[1];
		expect(payload.packItems.packingLines).toEqual([
			expect.objectContaining({
				salesItemId: 1,
				submissionId: 1001,
				qty: expect.objectContaining({ qty: 1 }),
			}),
		]);
	});

	it("throws insufficient error when still insufficient after non-production retry", async () => {
		const tx = {
			orderDelivery: {
				update: mock(async () => ({})),
			},
		};
		const db = packingSafeDb(tx);

		getSaleInformationMock
			.mockResolvedValueOnce({
				order: { id: 9002 },
				items: [
					{
						itemId: 1,
						controlUid: "uid-1",
						title: "Alpha",
						deliverables: [{ submissionId: 1001, qty: { qty: 1 } }],
					},
				],
			})
			.mockResolvedValueOnce({
				order: { id: 9002 },
				items: [],
			})
			.mockResolvedValueOnce({
				order: { id: 9002 },
				items: [
					{
						itemId: 1,
						controlUid: "uid-1",
						title: "Alpha",
						deliverables: [{ submissionId: 1001, qty: { qty: 1 } }],
					},
				],
			});

		await expect(
			tasksModule.packDispatchItemTask(
				db as any,
				{
					meta: { salesId: 9002, authorId: 12, authorName: "Operator" },
					packItems: {
						dispatchId: 90,
						dispatchStatus: "queue",
						packMode: "selection",
						requestedItems: [
							{
								salesItemId: 1,
								itemUid: "uid-1",
								title: "Alpha",
								qty: { qty: 2 },
							},
						],
					},
				} as any,
			),
		).rejects.toThrow("Insufficient deliverables for: Alpha");

		expect(submitNonProductionsActionMock).toHaveBeenCalledTimes(1);
		expect(packDispatchItemsActionMock).toHaveBeenCalledTimes(0);
	});
});
