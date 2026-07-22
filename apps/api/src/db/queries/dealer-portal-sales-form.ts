import type { DealerPortalSaveQuoteSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import {
	type DealerPortalSaveQuoteInput,
	saveDealerPortalQuote as saveDealerPortalQuoteQuery,
} from "@gnd/db/queries";

/**
 * API boundary for dealer quote persistence.
 *
 * The database package owns the pricing, tax snapshot, visibility, and DPP
 * identity rules so every caller executes the same audited transaction.
 */
export function saveDealerPortalQuote(
	ctx: TRPCContext,
	dealerId: number,
	input: DealerPortalSaveQuoteSchema,
) {
	return saveDealerPortalQuoteQuery(
		ctx.db,
		dealerId,
		input as DealerPortalSaveQuoteInput,
	);
}
