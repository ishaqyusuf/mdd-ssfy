import {
	salesRequestMailboxBeginConnectSchema,
	salesRequestMailboxDisconnectSchema,
	salesRequestMailboxInboxDetailSchema,
	salesRequestMailboxInboxListSchema,
	salesRequestMailboxPreviewSchema,
} from "@api/schemas/sales-request-mailbox";
import {
	type SalesRequestMailboxApiDependencies,
	createSalesRequestMailboxApi,
} from "@api/services/sales-request-mailbox-api";
import { getConfiguredSalesRequestMailbox } from "@api/services/sales-request-mailbox-composition";
import { createTRPCRouter, protectedProcedure } from "@api/trpc/init";

/**
 * The concrete app composition supplies persistence, adapters, and the shared
 * current-authority resolver. No provider or database work happens at import
 * time, which keeps this boundary testable with fakes.
 *
 * OAuth callback handling is intentionally not exposed here until the existing
 * callback boundary can bind the actor/session and consume lifecycle state
 * atomically; the package callback lifecycle remains the reusable seam.
 */
export function createSalesRequestMailboxRouter(
	dependencies:
		| SalesRequestMailboxApiDependencies
		| (() => SalesRequestMailboxApiDependencies),
) {
	const api = () =>
		createSalesRequestMailboxApi(
			typeof dependencies === "function" ? dependencies() : dependencies,
		);
	return createTRPCRouter({
		connections: protectedProcedure.query(({ ctx }) =>
			api().listConnections({ actorUserId: ctx.userId }),
		),
		beginConnect: protectedProcedure
			.input(salesRequestMailboxBeginConnectSchema)
			.mutation(({ ctx, input }) =>
				api().beginConnect({
					actorUserId: ctx.userId,
					provider: input.provider,
				}),
			),
		listInbox: protectedProcedure
			.input(salesRequestMailboxInboxListSchema)
			.query(({ ctx, input }) =>
				api().listInbox({ actorUserId: ctx.userId, ...input }),
			),
		getInboxDetail: protectedProcedure
			.input(salesRequestMailboxInboxDetailSchema)
			.query(({ ctx, input }) =>
				api().getInboxDetail({ actorUserId: ctx.userId, ...input }),
			),
		generatePreview: protectedProcedure
			.input(salesRequestMailboxPreviewSchema)
			.mutation(({ ctx, input, signal }) =>
				api().generatePreview({
					actorUserId: ctx.userId,
					...input,
					signal: signal ?? new AbortController().signal,
				}),
			),
		disconnect: protectedProcedure
			.input(salesRequestMailboxDisconnectSchema)
			.mutation(({ ctx, input, signal }) =>
				api().disconnect({
					actorUserId: ctx.userId,
					...input,
					signal,
				}),
			),
	});
}

export const salesRequestMailboxRouter = createSalesRequestMailboxRouter(
	() => getConfiguredSalesRequestMailbox().dependencies,
);
