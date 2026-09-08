import { expect, it } from "bun:test";
import { tableRowActivity } from "@/store/table-row-activity";
import {
	beginMutationRowActivity,
	settleMutationRowActivity,
} from "./mutation";

it("settles mixed batch results before caller invalidation and ignores repeated callbacks", () => {
	const mutation = {};
	const ownerId = "mutation-test";
	beginMutationRowActivity(mutation, {
		ownerId,
		tableId: "orders",
		describe: () => ({
			entityIds: [1, 2],
			label: "Reviewing",
			resolve: () => [{ entityId: 1, phase: "success", label: "Reviewed" }],
		}),
	});
	const tokens = [...tableRowActivity.getSnapshot().values()].filter(
		(a) => a.ownerId === ownerId,
	);
	settleMutationRowActivity(mutation, {});
	expect(tokens.map((token) => tableRowActivity.get(token)?.phase)).toEqual([
		"success",
		"unknown",
	]);
	settleMutationRowActivity(mutation, undefined, true);
	expect(tableRowActivity.get(tokens[0]!)?.phase).toBe("success");
	tableRowActivity.clearOwner(ownerId);
});

it("freezes identities for overlapping invocations of the same descriptor", () => {
	const first = {},
		second = {};
	const ownerId = "invocations";
	const descriptor = {
		ownerId,
		tableId: "orders",
		describe: (variables: unknown) => {
			const entityId = Number(variables);
			return {
				entityIds: [entityId],
				label: "Working",
				resolve: () => [{ entityId, phase: "success" as const, label: "Done" }],
			};
		},
	};
	beginMutationRowActivity(first, descriptor, 1);
	beginMutationRowActivity(second, descriptor, 2);
	settleMutationRowActivity(second, {});
	const states = [...tableRowActivity.getSnapshot().values()].filter(
		(item) => item.ownerId === ownerId,
	);
	expect(states.map((item) => [item.entityId, item.phase])).toEqual([
		[1, "processing"],
		[2, "success"],
	]);
	settleMutationRowActivity(first, {});
	tableRowActivity.clearOwner(ownerId);
});
