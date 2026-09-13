import {
	completeMailboxConnection,
	mailboxProviderSchema,
} from "@gnd/sales-request-mailbox";
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
	return result.kind === "connected"
		? "connected"
		: result.kind === "cancelled"
			? "cancelled"
			: "error";
}
