import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { runDbTransaction } from "@gnd/db/transactions";
import { AppError } from "@gnd/errors";

import {
	evaluateSalesPipelineCommand,
	type SalesPipelineCommand,
	type SalesPipelineCommandDecision,
} from "./sales-pipeline-commands";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";

export class SalesPipelineCommandRejectedError extends AppError {
	constructor(
		message: string,
		public readonly decision: SalesPipelineCommandDecision | null,
	) {
		super({
			code: "CONFLICT",
			internalMessage: message,
			publicMessage: message,
			reportable: false,
		});
		this.name = "SalesPipelineCommandRejectedError";
	}
}

type ExecutorDependencies = {
	lockSalesOrder: (
		tx: TransactionClient,
		salesOrderId: number,
	) => Promise<void>;
	getSnapshots: typeof getSalesPipelineSnapshots;
};

async function lockSalesOrder(tx: TransactionClient, salesOrderId: number) {
	const rows = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
		SELECT id
		FROM SalesOrders
		WHERE id = ${salesOrderId}
		FOR UPDATE
	`);
	if (!rows.length) {
		throw new SalesPipelineCommandRejectedError(
			"The sales order is no longer available.",
			null,
		);
	}
}

const defaultDependencies: ExecutorDependencies = {
	lockSalesOrder,
	getSnapshots: getSalesPipelineSnapshots,
};

function createNestedTransactionDb(tx: TransactionClient) {
	let nested: Db;
	const target = tx as unknown as object;
	nested = new Proxy(target, {
		get(current, property, receiver) {
			if (property === "$transaction") {
				return async (
					callback: (inner: TransactionClient) => Promise<unknown>,
				) => callback(nested as unknown as TransactionClient);
			}
			const value = Reflect.get(current, property, receiver) as unknown;
			return typeof value === "function"
				? (...args: unknown[]) =>
						(value as (...input: unknown[]) => unknown).apply(current, args)
				: value;
		},
	}) as Db;
	return nested;
}

export async function runSalesPipelineCommandTransaction<T>(
	db: Db,
	input: {
		salesOrderId: number;
		action: SalesPipelineCommand;
		authorized: boolean;
		expectedRevision?: string | null;
		enforce: boolean;
		executeOnReplay?: boolean;
		operation: string;
	},
	execute: (
		transactionDb: Db,
		decision: SalesPipelineCommandDecision,
	) => Promise<T>,
	dependencyOverrides: Partial<ExecutorDependencies> = {},
) {
	const dependencies = { ...defaultDependencies, ...dependencyOverrides };
	return runDbTransaction(
		{
			client: db,
			operation: input.operation,
			profile: "workflow",
			retryOnWriteConflict: true,
		},
		async (tx) => {
			await dependencies.lockSalesOrder(tx, input.salesOrderId);
			const snapshot = (
				await dependencies.getSnapshots(tx as unknown as Db, [
					input.salesOrderId,
				])
			).get(input.salesOrderId);
			if (!snapshot) {
				throw new SalesPipelineCommandRejectedError(
					"The sales order is no longer available.",
					null,
				);
			}
			if (input.enforce && !input.expectedRevision) {
				throw new SalesPipelineCommandRejectedError(
					"This action needs the current Sales Pipeline revision. Refresh and try again.",
					{
						action: input.action,
						status: "rejected",
						revision: snapshot.revision,
						reasons: ["REVISION_REQUIRED"],
						affectedScopes: [],
					},
				);
			}
			const decision = evaluateSalesPipelineCommand(snapshot, {
				action: input.action,
				authorized: input.authorized,
				expectedRevision: input.expectedRevision,
			});
			if (
				input.enforce &&
				(decision.status === "rejected" ||
					decision.status === "review_required")
			) {
				throw new SalesPipelineCommandRejectedError(
					`Sales pipeline command ${decision.status}: ${decision.reasons.join(", ")}`,
					decision,
				);
			}
			if (
				input.enforce &&
				decision.status === "replay" &&
				!input.executeOnReplay
			) {
				return { executed: false as const, decision, value: null };
			}
			const value = await execute(createNestedTransactionDb(tx), decision);
			return { executed: true as const, decision, value };
		},
	);
}
