import type { Db, TransactionClient } from "@gnd/db";

export interface CreateLegacySalesResolutionInput {
	salesId: number;
	action: string;
	reason: string;
	resolvedBy: string;
}

export async function createLegacySalesResolution(
	db: Db | TransactionClient,
	input: CreateLegacySalesResolutionInput,
) {
	return db.salesResolution.create({
		data: {
			salesId: input.salesId,
			action: input.action,
			resolvedBy: input.resolvedBy,
			reason: input.reason,
		},
	});
}
