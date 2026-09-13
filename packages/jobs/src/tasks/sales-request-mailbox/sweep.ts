import { z } from "zod";

export const SALES_REQUEST_MAILBOX_SWEEP_LIMIT = 100;

const identifierSchema = z
	.string()
	.min(1)
	.max(255)
	.refine((value) => value.trim() === value)
	.refine((value) =>
		Array.from(value).every((character) => {
			const codePoint = character.codePointAt(0) ?? 0;
			return codePoint >= 32 && codePoint !== 127;
		}),
	);

const dueWorkSchema = z
	.object({
		syncWorkIds: z
			.array(identifierSchema)
			.max(SALES_REQUEST_MAILBOX_SWEEP_LIMIT),
		detailWorkIds: z
			.array(identifierSchema)
			.max(SALES_REQUEST_MAILBOX_SWEEP_LIMIT),
		tokenHealthWorkIds: z
			.array(identifierSchema)
			.max(SALES_REQUEST_MAILBOX_SWEEP_LIMIT),
		disconnectWorkIds: z
			.array(identifierSchema)
			.max(SALES_REQUEST_MAILBOX_SWEEP_LIMIT),
	})
	.strict();

type WorkKind = "sync" | "detail" | "token-health" | "disconnect";

export function createSalesRequestMailboxSweep(dependencies: {
	findDueWork(input: {
		now: Date;
		limit: typeof SALES_REQUEST_MAILBOX_SWEEP_LIMIT;
	}): Promise<unknown>;
	dispatch(input: {
		kind: WorkKind;
		payload: { workId: string };
		idempotencyKey: string;
	}): Promise<unknown>;
	clock?: () => Date;
}) {
	return async () => {
		const due = dueWorkSchema.parse(
			await dependencies.findDueWork({
				now: dependencies.clock?.() ?? new Date(),
				limit: SALES_REQUEST_MAILBOX_SWEEP_LIMIT,
			}),
		);
		const groups: Array<[WorkKind, readonly string[]]> = [
			["sync", due.syncWorkIds],
			["detail", due.detailWorkIds],
			["token-health", due.tokenHealthWorkIds],
			["disconnect", due.disconnectWorkIds],
		];
		for (const [kind, workIds] of groups) {
			for (const workId of workIds) {
				await dependencies.dispatch({
					kind,
					payload: { workId },
					idempotencyKey: `sales-request-mailbox:${kind}:${workId}`,
				});
			}
		}
		return {
			sync: due.syncWorkIds.length,
			detail: due.detailWorkIds.length,
			tokenHealth: due.tokenHealthWorkIds.length,
			disconnect: due.disconnectWorkIds.length,
		};
	};
}
