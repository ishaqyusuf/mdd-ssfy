import type { Db, TransactionClient } from "@gnd/db";
import { mirrorLegacySalesResolution } from "../../payment-system";

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
	const resolution = await db.salesResolution.create({
		data: {
			salesId: input.salesId,
			action: input.action,
			resolvedBy: input.resolvedBy,
			reason: input.reason,
		},
	});
	await mirrorLegacySalesResolution(db, {
		action: input.action,
		reason: input.reason,
		resolvedBy: input.resolvedBy,
		salesId: input.salesId,
	});
	return resolution;
}
