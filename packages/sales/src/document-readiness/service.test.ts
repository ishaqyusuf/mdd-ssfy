import { describe, expect, it, mock } from "bun:test";
import { buildSalesDocumentReadinessSignature } from "./meta";
import {
	applySalesDocumentReadinessRepair,
	prepareSalesDocumentReadiness,
} from "./service";
import {
	SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
	type SalesDocumentReadinessEvaluation,
} from "./types";

describe("prepareSalesDocumentReadiness", () => {
	it("uses a current readiness attestation without loading relational rows", async () => {
		const updatedAt = new Date("2026-09-01T12:00:00.000Z");
		const evaluation: SalesDocumentReadinessEvaluation = {
			status: "ready",
			salesOrderId: 77,
			orderNo: "00077AA",
			salesType: "order",
			validatorVersion: SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
			financial: {
				saved: {
					subTotalCents: 10_000,
					taxableSubTotalCents: 10_000,
					taxCents: 700,
					grandTotalCents: 10_700,
					amountDueCents: 10_700,
				},
				candidate: {
					subTotalCents: 10_000,
					taxableSubTotalCents: 10_000,
					taxCents: 700,
					grandTotalCents: 10_700,
					amountDueCents: 10_700,
				},
				subTotalDeltaCents: 0,
				taxableSubTotalDeltaCents: 0,
				taxDeltaCents: 0,
				grandTotalDeltaCents: 0,
				amountDueDeltaCents: 0,
				totalChanged: false,
			},
			findings: [],
			operations: [],
		};
		const findUnique = mock(async () => ({
			id: 77,
			updatedAt,
			meta: {
				salesDocumentReadiness: {
					validatorVersion: SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
					status: "ready",
					signature: buildSalesDocumentReadinessSignature(evaluation),
					validatedSourceUpdatedAt: updatedAt.toISOString(),
					validatedAt: updatedAt.toISOString(),
					evaluation,
					proposal: null,
				},
			},
		}));
		const update = mock(async () => null);
		const database = {
			salesOrders: { findUnique, update },
		} as never;

		const result = await prepareSalesDocumentReadiness(database, {
			salesOrderId: 77,
		});

		expect(result.status).toBe("ready");
		expect(result.source).toBe("attestation");
		expect(findUnique).toHaveBeenCalledTimes(1);
		expect(update).not.toHaveBeenCalled();
	});

	it("automatically applies a zero-financial-delta repair with audit evidence", async () => {
		const sale = {
			id: 77,
			orderId: "00077AA",
			type: "order",
			updatedAt: new Date("2026-09-01T12:00:00.000Z"),
			meta: {},
			subTotal: 5022.11,
			tax: 351.55,
			grandTotal: 5373.66,
			amountDue: 5373.66,
			taxPercentage: 7,
			paymentMethod: null,
			extraCosts: [],
			taxes: [{ taxxable: 5022.11 }],
			items: [
				{
					id: 501,
					qty: null as number | null,
					total: null as number | null,
					meta: {},
					formSteps: [],
					housePackageTool: {
						id: 601,
						totalDoors: 0,
						totalPrice: 0,
						doors: [
							{
								id: 701,
								totalQty: 19,
								lhQty: 9,
								rhQty: 10,
								unitPrice: 264.321578,
								lineTotal: 5022.11,
							},
						],
					},
				},
			],
		};
		const mutableItem = sale.items[0];
		if (!mutableItem) throw new Error("Expected repair fixture item.");
		let stagedProposal: Record<string, unknown> | null = null;
		let stagedProposalId: string | null = null;
		let resolutionStatus = "open";
		const resolutionActionCreate = mock(async () => null);
		const salesHistoryCreate = mock(async () => null);
		const printDataUpdateMany = mock(async () => ({ count: 1 }));
		const transaction = {
			salesOrders: {
				findUnique: mock(async () => sale),
				updateMany: mock(
					async ({ data }: { data: Record<string, unknown> }) => {
						if (data.meta) sale.meta = data.meta as never;
						if (data.updatedAt) sale.updatedAt = data.updatedAt as Date;
						return { count: 1 };
					},
				),
				update: mock(async ({ data }: { data: Record<string, unknown> }) => {
					if (data.meta) sale.meta = data.meta as never;
					if (data.updatedAt) sale.updatedAt = data.updatedAt as Date;
					return sale;
				}),
			},
			resolutionCase: {
				updateMany: mock(async () => ({ count: 0 })),
				upsert: mock(async ({ create }: { create: { meta: unknown } }) => {
					stagedProposal = create.meta as Record<string, unknown>;
					const proposalId = stagedProposal.proposalId;
					stagedProposalId =
						typeof proposalId === "string" ? proposalId : null;
					resolutionStatus = "open";
					return create;
				}),
				findUnique: mock(async () => ({ status: resolutionStatus })),
				update: mock(async () => {
					resolutionStatus = "resolved";
					return null;
				}),
			},
			salesOrderItems: {
				updateMany: mock(
					async ({ data }: { data: { qty: number; total: number } }) => {
						mutableItem.qty = data.qty;
						mutableItem.total = data.total;
						return { count: 1 };
					},
				),
			},
			housePackageTools: {
				updateMany: mock(
					async ({
						data,
					}: { data: { totalDoors: number; totalPrice: number } }) => {
						mutableItem.housePackageTool.totalDoors = data.totalDoors;
						mutableItem.housePackageTool.totalPrice = data.totalPrice;
						return { count: 1 };
					},
				),
			},
			salesPrintData: { updateMany: printDataUpdateMany },
			resolutionAction: { create: resolutionActionCreate },
			salesHistory: { create: salesHistoryCreate },
		};
		const database = {
			$transaction: async (callback: (tx: typeof transaction) => unknown) =>
				callback(transaction),
		} as never;

		const result = await prepareSalesDocumentReadiness(database, {
			salesOrderId: sale.id,
			forceEvaluate: true,
			stageProposal: true,
			autoRepair: {
				source: "dashboard_document_access",
				actorId: 9,
				actorName: "Test Operator",
			},
		});

		expect(result.status).toBe("ready");
		expect(stagedProposal).not.toBeNull();
		expect(sale.items[0]?.qty).toBe(19);
		expect(sale.items[0]?.total).toBe(5022.11);
		expect(printDataUpdateMany).toHaveBeenCalledTimes(1);
		expect(resolutionActionCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				meta: expect.objectContaining({
					applicationMode: "automatic",
					source: "dashboard_document_access",
				}),
			}),
		});
		expect(salesHistoryCreate).toHaveBeenCalledTimes(1);

		if (!stagedProposalId) {
			throw new Error("Expected a staged proposal id.");
		}
		const repeated = await applySalesDocumentReadinessRepair(database, {
			salesOrderId: sale.id,
			proposalId: stagedProposalId,
			actorId: 9,
			actorName: "Test Operator",
		});
		expect(repeated.status).toBe("ready");
		expect(resolutionActionCreate).toHaveBeenCalledTimes(1);
	});
});
