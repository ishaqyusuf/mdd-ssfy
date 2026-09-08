import {
	tableRowActivity,
	isRowActivityBusy,
	type RowActivityOutcome,
	type RowActivityToken,
} from "@/store/table-row-activity";

type RowActivityInvocation = {
	entityIds: readonly number[];
	label: string;
	resolve: (
		data: unknown,
	) => readonly (RowActivityOutcome & { entityId: number })[];
};
export type RowActivityDescriptor = {
	ownerId: string;
	tableId: string;
	describe: (variables: unknown) => RowActivityInvocation;
};

const operations = new WeakMap<
	object,
	{ tokens: RowActivityToken[]; invocation: RowActivityInvocation }
>();

export function beginMutationRowActivity(
	mutation: object,
	descriptor?: RowActivityDescriptor,
	variables?: unknown,
) {
	if (!descriptor?.ownerId) return;
	const invocation = descriptor.describe(variables);
	if (
		isRowActivityBusy(
			descriptor.ownerId,
			descriptor.tableId,
			invocation.entityIds,
		)
	)
		throw new Error("An action is already running for this row.");
	const tokens = [...new Set(invocation.entityIds)].map((entityId) =>
		tableRowActivity.begin({
			ownerId: descriptor.ownerId,
			tableId: descriptor.tableId,
			entityId,
			label: invocation.label,
		}),
	);
	operations.set(mutation, { tokens, invocation });
}
export function settleMutationRowActivity(
	mutation: object,
	data: unknown,
	failed = false,
) {
	const operation = operations.get(mutation);
	if (!operation) return;
	operations.delete(mutation);
	let outcomes: ReturnType<RowActivityInvocation["resolve"]> = [];
	// Presentation parsing must never interfere with a committed mutation/event.
	if (!failed) {
		try {
			outcomes = operation.invocation.resolve(data);
		} catch {
			/* Unknown feedback below. */
		}
	}
	for (const token of operation.tokens) {
		const matches = outcomes.filter(
			(outcome) => outcome.entityId === token.entityId,
		);
		tableRowActivity.settle(
			token,
			failed
				? { phase: "error", label: "Action failed" }
				: matches.length === 1
					? matches[0]!
					: { phase: "unknown", label: "Check action result" },
		);
	}
}
