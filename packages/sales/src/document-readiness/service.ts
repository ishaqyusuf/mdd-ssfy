import { randomUUID } from "node:crypto";
import type { Db, Prisma, TransactionClient } from "@gnd/db";
import { evaluateSalesDocumentReadiness } from "./evaluator";
import {
	buildSalesDocumentReadinessSignature,
	mergeSalesDocumentReadinessMeta,
	readSalesDocumentReadinessMeta,
} from "./meta";
import {
	SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
	type SalesDocumentReadinessEvaluation,
	type SalesDocumentReadinessMeta,
	type SalesDocumentReadinessPreflight,
	type SalesDocumentReadinessProposal,
} from "./types";

type Database = Db | TransactionClient;

const readinessInclude = {
	items: {
		where: { deletedAt: null },
		select: {
			id: true,
			qty: true,
			total: true,
			formSteps: {
				where: { deletedAt: null },
				select: {
					id: true,
					stepId: true,
					componentId: true,
					prodUid: true,
					value: true,
				},
			},
			housePackageTool: {
				where: { deletedAt: null },
				select: {
					id: true,
					totalDoors: true,
					totalPrice: true,
					doors: {
						where: { deletedAt: null },
						orderBy: { id: "asc" as const },
						select: {
							id: true,
							totalQty: true,
							lhQty: true,
							rhQty: true,
							unitPrice: true,
							lineTotal: true,
						},
					},
				},
			},
		},
	},
} as const satisfies Prisma.SalesOrdersInclude;

function sourceUpdatedAt(value: Date | string | null | undefined) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function preflightFromMeta(
	meta: SalesDocumentReadinessMeta,
	source: SalesDocumentReadinessPreflight["source"],
): SalesDocumentReadinessPreflight {
	if (meta.proposal && meta.status !== "ready") {
		return {
			...meta.proposal,
			source,
			signature: meta.signature,
		};
	}
	return {
		...meta.evaluation,
		source,
		signature: meta.signature,
		validatedSourceUpdatedAt: meta.validatedSourceUpdatedAt,
	};
}

function buildReadinessMeta(input: {
	evaluation: SalesDocumentReadinessEvaluation;
	stampAt: Date;
	proposal?: SalesDocumentReadinessProposal | null;
}): SalesDocumentReadinessMeta {
	const timestamp = input.stampAt.toISOString();
	return {
		validatorVersion: SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
		status: input.evaluation.status,
		signature: buildSalesDocumentReadinessSignature(input.evaluation),
		validatedSourceUpdatedAt: timestamp,
		validatedAt: timestamp,
		evaluation: input.evaluation,
		proposal: input.proposal ?? null,
	};
}

async function loadSalesDocumentReadinessInput(
	db: Database,
	salesOrderId: number,
) {
	return db.salesOrders.findUnique({
		where: { id: salesOrderId },
		select: {
			id: true,
			orderId: true,
			type: true,
			updatedAt: true,
			meta: true,
			subTotal: true,
			tax: true,
			grandTotal: true,
			amountDue: true,
			...readinessInclude,
		},
	});
}

async function persistResolutionCase(
	db: Database,
	proposal: SalesDocumentReadinessProposal,
) {
	await db.resolutionCase.upsert({
		where: { id: proposal.proposalId },
		create: {
			id: proposal.proposalId,
			scopeType: "sales_document_readiness",
			scopeId: String(proposal.salesOrderId),
			status: "open",
			summary:
				proposal.status === "repair_required"
					? "Sales document requires a zero-total-delta structural repair."
					: "Sales document requires financial or manual review.",
			meta: proposal as unknown as Prisma.InputJsonValue,
		},
		update: {
			status: "open",
			summary:
				proposal.status === "repair_required"
					? "Sales document requires a zero-total-delta structural repair."
					: "Sales document requires financial or manual review.",
			meta: proposal as unknown as Prisma.InputJsonValue,
			deletedAt: null,
		},
	});
}

export async function prepareSalesDocumentReadiness(
	db: Database,
	input: {
		salesOrderId: number;
		forceEvaluate?: boolean;
		stageProposal?: boolean;
	},
): Promise<SalesDocumentReadinessPreflight> {
	const gate = await db.salesOrders.findUnique({
		where: { id: input.salesOrderId },
		select: {
			id: true,
			updatedAt: true,
			meta: true,
		},
	});
	if (!gate) throw new Error("Sales order not found.");

	const currentMeta = readSalesDocumentReadinessMeta(gate.meta);
	if (
		!input.forceEvaluate &&
		currentMeta &&
		currentMeta.validatedSourceUpdatedAt === sourceUpdatedAt(gate.updatedAt)
	) {
		return preflightFromMeta(currentMeta, "attestation");
	}

	const sale = await loadSalesDocumentReadinessInput(db, input.salesOrderId);
	if (!sale) throw new Error("Sales order not found.");
	const evaluation = evaluateSalesDocumentReadiness(sale);
	const signature = buildSalesDocumentReadinessSignature(evaluation);
	const stampAt = new Date();
	const timestamp = stampAt.toISOString();
	const proposal =
		evaluation.status === "ready"
			? null
			: ({
					...evaluation,
					proposalId: `sales-doc-${sale.id}-${signature.slice(0, 24)}`,
					validatedSourceUpdatedAt: timestamp,
					createdAt: timestamp,
				}) satisfies SalesDocumentReadinessProposal;
	const readiness = buildReadinessMeta({ evaluation, stampAt, proposal });

	if (proposal && input.stageProposal !== false) {
		await persistResolutionCase(db, proposal);
	}
	await db.salesOrders.update({
		where: { id: sale.id },
		data: {
			meta: mergeSalesDocumentReadinessMeta(sale.meta, readiness),
			updatedAt: stampAt,
		},
	});

	return preflightFromMeta(readiness, "evaluated");
}

function exactValue(value: number | null) {
	return value === null ? null : value;
}

export async function applySalesDocumentReadinessRepair(
	db: Db,
	input: {
		salesOrderId: number;
		proposalId: string;
		actorId: number;
		actorName: string;
	},
): Promise<SalesDocumentReadinessPreflight> {
	return db.$transaction(
		async (tx) => {
			const order = await tx.salesOrders.findUnique({
				where: { id: input.salesOrderId },
				select: {
					id: true,
					orderId: true,
					updatedAt: true,
					meta: true,
				},
			});
			if (!order) throw new Error("Sales order not found.");
			const readiness = readSalesDocumentReadinessMeta(order.meta);
			if (readiness?.status === "ready") {
				const resolved = await tx.resolutionCase.findUnique({
					where: { id: input.proposalId },
					select: { status: true },
				});
				if (resolved?.status === "resolved") {
					return preflightFromMeta(readiness, "attestation");
				}
			}
			const proposal = readiness?.proposal;
			if (
				!proposal ||
				proposal.proposalId !== input.proposalId ||
				proposal.status !== "repair_required" ||
				proposal.financial.totalChanged
			) {
				throw new Error(
					"This repair proposal is no longer available. Run the document check again.",
				);
			}
			if (
				readiness.validatedSourceUpdatedAt !== sourceUpdatedAt(order.updatedAt)
			) {
				throw new Error(
					"This order changed after the repair was prepared. Run the document check again.",
				);
			}

			const liveSale = await loadSalesDocumentReadinessInput(tx, order.id);
			if (!liveSale) throw new Error("Sales order not found.");
			const liveEvaluation = evaluateSalesDocumentReadiness(liveSale);
			if (
				liveEvaluation.status !== "repair_required" ||
				buildSalesDocumentReadinessSignature(liveEvaluation) !==
					readiness.signature
			) {
				throw new Error(
					"The current order no longer matches this repair proposal. Run the document check again.",
				);
			}

			for (const operation of proposal.operations) {
				const itemUpdate = await tx.salesOrderItems.updateMany({
					where: {
						id: operation.salesOrderItemId,
						salesOrderId: order.id,
						deletedAt: null,
						qty: exactValue(operation.before.itemQty),
						total:
							operation.before.itemTotalCents === null
								? null
								: operation.before.itemTotalCents / 100,
					},
					data: {
						qty: operation.after.itemQty,
						total: operation.after.itemTotalCents / 100,
					},
				});
				const hptUpdate = await tx.housePackageTools.updateMany({
					where: {
						id: operation.housePackageToolId,
						orderItemId: operation.salesOrderItemId,
						salesOrderId: order.id,
						deletedAt: null,
						totalDoors: exactValue(operation.before.hptTotalDoors),
						totalPrice:
							operation.before.hptTotalPriceCents === null
								? null
								: operation.before.hptTotalPriceCents / 100,
					},
					data: {
						totalDoors: operation.after.hptTotalDoors,
						totalPrice: operation.after.hptTotalPriceCents / 100,
					},
				});
				if (itemUpdate.count !== 1 || hptUpdate.count !== 1) {
					throw new Error(
						"The order changed while the repair was being applied. No repair was saved.",
					);
				}
			}

			const repairedSale = await loadSalesDocumentReadinessInput(tx, order.id);
			if (!repairedSale) throw new Error("Sales order not found.");
			const repairedEvaluation = evaluateSalesDocumentReadiness(repairedSale);
			if (repairedEvaluation.status !== "ready") {
				throw new Error(
					"The repaired order did not pass the final document check. No repair was saved.",
				);
			}

			const stampAt = new Date();
			const nextReadiness = buildReadinessMeta({
				evaluation: repairedEvaluation,
				stampAt,
			});
			await tx.salesOrders.update({
				where: { id: order.id },
				data: {
					meta: mergeSalesDocumentReadinessMeta(
						repairedSale.meta,
						nextReadiness,
					),
					updatedAt: stampAt,
				},
			});
			await tx.salesPrintData.updateMany({
				where: { salesOrderId: order.id, deletedAt: null },
				data: {
					status: "stale",
					invalidatedAt: stampAt,
					reason: "sales_document_readiness_repair",
				},
			});
			await tx.resolutionCase.update({
				where: { id: proposal.proposalId },
				data: {
					status: "resolved",
					meta: {
						...proposal,
						resolvedAt: stampAt.toISOString(),
						resolvedById: input.actorId,
					} as unknown as Prisma.InputJsonValue,
				},
			});
			await tx.resolutionAction.create({
				data: {
					id: randomUUID(),
					resolutionCaseId: proposal.proposalId,
					actionType: "apply_sales_document_readiness_repair",
					status: "completed",
					actorId: input.actorId,
					beforeState: proposal as unknown as Prisma.InputJsonValue,
					afterState: repairedEvaluation as unknown as Prisma.InputJsonValue,
					meta: {
						validatorVersion: SALES_DOCUMENT_READINESS_VALIDATOR_VERSION,
						financialTotalChanged: false,
					} as Prisma.InputJsonValue,
				},
			});
			await tx.salesHistory.create({
				data: {
					salesId: order.id,
					name: "Sales document data repaired",
					authorName: input.actorName,
					data: {
						proposalId: proposal.proposalId,
						operations: proposal.operations,
						financial: proposal.financial,
					} as unknown as Prisma.InputJsonValue,
				},
			});

			return preflightFromMeta(nextReadiness, "evaluated");
		},
		{
			isolationLevel: "Serializable",
			maxWait: 5_000,
			timeout: 30_000,
		},
	);
}

