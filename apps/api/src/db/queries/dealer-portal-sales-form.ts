import type { DealerPortalSaveQuoteSchema } from "@api/schemas/dealer";
import type { TRPCContext } from "@api/trpc/init";
import {
	type DealerPortalSaveQuoteInput,
	DealerQuoteEditLockedError,
	saveDealerPortalQuote as saveDealerPortalQuoteQuery,
} from "@gnd/db/queries";
import { TRPCError } from "@trpc/server";

/**
 * API boundary for dealer quote persistence.
 *
 * The database package owns the pricing, tax snapshot, visibility, and DPP
 * identity rules so every caller executes the same audited transaction.
 */
export async function saveDealerPortalQuote(
	ctx: TRPCContext,
	dealerId: number,
	input: DealerPortalSaveQuoteSchema,
) {
	try {
		return await saveDealerPortalQuoteQuery(
			ctx.db,
			dealerId,
			input as DealerPortalSaveQuoteInput,
		);
	} catch (error) {
		if (error instanceof DealerQuoteEditLockedError) {
			throw new TRPCError({
				code: "CONFLICT",
				message: error.message,
				cause: error,
			});
		}
		throw error;
	}
}
