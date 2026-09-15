import { db } from "@gnd/db";
import {
	completeMailboxConnection,
	mailboxProviderSchema,
} from "@gnd/sales-request-mailbox";
import { tasks } from "@trigger.dev/sdk/v3";
import { getConfiguredSalesRequestMailbox } from "./sales-request-mailbox-composition";

export async function completeConfiguredSalesRequestMailboxCallback(input: {
	actorUserId: number;
	provider: string;
	state: string;
	code?: string;
	cancelled: boolean;
	signal: AbortSignal;
}) {
	const provider = mailboxProviderSchema.parse(input.provider);
	const result = await completeMailboxConnection(
		{
			actorUserId: input.actorUserId,
			provider,
			redirectKey: "sales-request-inbox",
			state: input.state,
			result: input.cancelled
				? { kind: "cancelled" }
				: { kind: "code", code: input.code ?? "" },
			signal: input.signal,
		},
		getConfiguredSalesRequestMailbox().completeConnection,
	);
	if (result.kind === "connected") {
		try {
			const streams = await db.salesRequestMailboxSyncStream.findMany({
				where: { connectionId: result.connectionId, status: "queued" },
				select: { id: true },
				take: 20,
			});
			await Promise.allSettled(
				streams.map(({ id }) =>
					tasks.trigger("sales-request-mailbox-sync", { workId: id }),
				),
			);
		} catch {
			// Durable queued streams remain recoverable by the scheduled sweep.
		}
	}
	return result.kind === "connected"
		? "connected"
		: result.kind === "cancelled"
			? "cancelled"
			: "error";
}
